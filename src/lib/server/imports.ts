// Saving a read statement into an account.
import { Prisma } from '@prisma/client';
import { db } from './db';
import { categorize } from './categorize';
import { matchFile, type Read } from './importer';

/** Credit cards take card layouts; every other account takes account layouts. */
export const kindOf = (type: string) => (type === 'Credit card' ? 'card' : 'account');

/** Accounts the person can import into. */
export async function destinations(userId: string, businessId: string) {
  const accts = await db.account.findMany({ where: { businessId, deletedAt: null, closedAt: null, holders: { some: { userId } } }, include: { bank: true }, orderBy: { createdAt: 'asc' } });
  return accts.map((a) => ({ id: a.id, name: a.name, bank: a.bank.name, kind: kindOf(a.type), label: a.type === 'Credit card' ? 'Credit card' : 'Account' }));
}

export async function guessDest(userId: string, businessId: string, bankName: string | null, kind: string | null, read: Read | null) {
  const all = await destinations(userId, businessId);
  const c = all.filter((d) => (!bankName || d.bank.toLowerCase() === bankName.toLowerCase()) && (!kind || d.kind === kind));
  if (c.length > 1 && read && read.period) {
    // an account that already has this exact period wins (the duplicate is then reported); otherwise the one whose latest statement ends just before this one starts
    const st0 = +new Date(read.period.start + 'T00:00:00Z'), end0 = +new Date(read.period.end + 'T00:00:00Z');
    const scored = await Promise.all(c.map(async (d) => {
      const w = { accountId: d.id, deletedAt: null };
      if (await db.statement.count({ where: { ...w, periodEnd: new Date(end0) } })) return { d, gap: 3 * 86400000 }; // a near-perfect continuation elsewhere still wins
      const last = await db.statement.findFirst({ where: { ...w, periodEnd: { lte: new Date(st0) } }, orderBy: { periodEnd: 'desc' } });
      return { d, gap: last ? st0 - +last.periodEnd : 1e13 };
    }));
    scored.sort((a, b) => a.gap - b.gap);
    return scored[0].d.id;
  }
  return c[0]?.id || '';
}

export async function saveImport(o: { fileId: string; destId: string; userId: string; businessId: string }) {
  const file = await db.storedFile.findUnique({ where: { id: o.fileId } });
  if (!file || !file.pending || (file.pending as { businessId?: string }).businessId !== o.businessId) throw new Error('That file is not waiting to be imported.');
  const dests = await destinations(o.userId, o.businessId);
  const dest = dests.find((d) => d.id === o.destId);
  if (!dest) throw new Error('Choose an account you can see.');
  const m = await matchFile(Buffer.from(file.data), file.name, file.mime, (file.pending as { versionId?: string }).versionId || null);
  if (!m.read || !m.version) throw new Error('No saved layout reads this file yet. Map one first.');
  const read = m.read;
  if (!read.period || read.opening == null || read.closing == null) throw new Error('The statement period or balances could not be read.');
  if (!read.ok) throw new Error('This file does not add up with the matched layout: ' + read.checks.filter((c) => !c.ok).map((c) => c.text).join('. '));
  if (m.layout!.kind !== dest.kind) throw new Error(m.layout!.kind === 'card' ? 'This is a credit card statement. Choose a credit card account.' : 'This is a bank account statement. Choose a bank account, not a credit card.');
  const end = new Date(read.period.end + 'T00:00:00Z'), start = new Date(read.period.start + 'T00:00:00Z');
  const dup = await db.statement.findFirst({ where: { accountId: dest.id, deletedAt: null, periodEnd: end } });
  if (dup) throw new Error('A statement for this period is already imported for ' + dest.name + '.');
  // transactions already imported from an overlapping statement are skipped
  const existing = new Set((await db.txn.findMany({ where: { statement: { accountId: dest.id, deletedAt: null }, date: { gte: start, lte: end } }, select: { date: true, debit: true, credit: true, description: true } })).map((t) => t.date.toISOString().slice(0, 10) + '|' + Number(t.debit) + '|' + Number(t.credit) + '|' + t.description));
  const fresh = read.txns.filter((t) => !existing.has(t.date + '|' + t.debit + '|' + t.credit + '|' + t.description));
  const status = 'Imported';
  const st = await db.statement.create({ data: {
    businessId: o.businessId, accountId: dest.id,
    periodStart: start, periodEnd: end, opening: read.opening, closing: read.closing, credits: read.credits || 0, debits: read.debits || 0,
    status, layoutVersionId: m.version.id, fileId: file.id, pages: read.pages, importedById: o.userId
  } });
  await db.txn.createMany({ data: fresh.map((t, i) => ({ statementId: st.id, date: new Date(t.date + 'T00:00:00Z'), description: t.description.slice(0, 300), debit: t.debit, credit: t.credit, balance: t.balance, page: t.page, row: t.row, y: t.y ?? null, yh: t.yh ?? null, category: categorize(t.description, t.credit), dedupeKey: dest.id + ':' + t.date + ':' + i })) });
  await db.storedFile.update({ where: { id: file.id }, data: { pending: Prisma.DbNull } });
  return { statementId: st.id, status, note: null, skipped: read.txns.length - fresh.length };
}
