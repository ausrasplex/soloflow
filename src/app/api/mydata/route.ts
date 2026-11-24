import JSZip from 'jszip';
import { currentMembership, currentUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { dec } from '@/lib/server/crypto';

export const dynamic = 'force-dynamic';
const q = (v: unknown) => { const s = v == null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = (head: string[], rows: unknown[][]) => [head.join(',')].concat(rows.map((r) => r.map(q).join(','))).join('\n') + '\n';
const safe = (s: string) => s.replace(/[^\w.\- ]/g, '_');

/** Your own data in this business: the accounts you hold. fmt=csv|json, files=1 adds the original statements. */
export async function GET(req: Request) {
  const u = await currentUser();
  if (!u) return new Response('Sign in again', { status: 401 });
  const { m } = await currentMembership(u);
  if (!m) return new Response('Not found', { status: 404 });
  const sp = new URL(req.url).searchParams;
  const fmt = sp.get('fmt') === 'json' ? 'json' : 'csv', withFiles = sp.get('files') === '1';
  const accts = await db.account.findMany({ where: { businessId: m.businessId, deletedAt: null, holders: { some: { userId: u.id } } }, include: { bank: true, statements: { where: { deletedAt: null }, include: { txns: true, file: withFiles } } } });
  const stamp = new Date().toISOString().slice(0, 10);
  const zip = new JSZip();
  const strip = <T extends Record<string, unknown>>(o: T) => JSON.parse(JSON.stringify(o, (k, v) => (k === 'file' || k === 'data' ? undefined : v)));
  if (fmt === 'json') {
    const out = { exported: new Date().toISOString(), person: { name: u.displayName, email: u.email }, business: { name: m.business.name, abn: m.business.abn },
      accounts: accts.map((a) => strip({ ...a, bsb: dec(a.bsb), number: dec(a.number) })) };
    if (!withFiles) return new Response(JSON.stringify(out, null, 2), { headers: { 'content-type': 'application/json', 'content-disposition': `attachment; filename="soloflow-my-data-${stamp}.json"` } });
    zip.file('soloflow-my-data.json', JSON.stringify(out, null, 2));
  } else {
    for (const a of accts) {
      const base = safe(a.name);
      zip.file(base + '/statements.csv', csv(['Start', 'End', 'Opening', 'Closing', 'Money in', 'Money out', 'Status'], a.statements.map((x) => [x.periodStart, x.periodEnd, x.opening, x.closing, x.credits, x.debits, x.status])));
      zip.file(base + '/transactions.csv', csv(['Date', 'Description', 'Debit', 'Credit', 'Balance', 'Category'], a.statements.flatMap((x) => x.txns).sort((p, q2) => +p.date - +q2.date).map((t) => [t.date, t.description, t.debit, t.credit, t.balance, t.category])));
    }
  }
  if (withFiles) {
    for (const a of accts) for (const x of a.statements) if (x.file) zip.file('originals/' + safe(a.name) + '/' + x.periodEnd.toISOString().slice(0, 10) + (/\.csv$/i.test(x.file.name) ? '.csv' : '.pdf'), x.file.data);
  }
  const out = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return new Response(out as unknown as BodyInit, { headers: { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="soloflow-my-data-${stamp}.zip"` } });
}
