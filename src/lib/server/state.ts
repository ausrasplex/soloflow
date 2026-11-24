// Builds everything the signed-in person may see in their current business, in the shapes the screens use.
// Access rule: accounts you hold. Shared records (banks, layouts) never reveal anything about accounts you cannot see.
import { db } from './db';
import { dec } from './crypto';
import { currentMembership, type CurrentUser } from './auth';
import { APP_VERSION, backupSettings, dirSize, folderPath, freeSpace } from './backup';
import { categorize } from './categorize';
import { DAY, num, today0 } from './util';
import { ROLE_DEFAULT, ROLE_LOCKED, seesAccount, visibleAccounts } from './access';

const SLOTS = ['a1', 'a2', 'a3'];
export const initials = (name: string) => { const w = (name || '?').trim().split(/\s+/).filter(Boolean); return ((w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0] || '?').slice(0, 2)) || '?').toUpperCase(); };
const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '');
const monY = (d: Date | null) => (d ? d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
const dLong = (d: Date | null) => (d ? d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
const ROLE: Record<string, string> = { OWNER: 'Owner', EDITOR: 'Editor', VIEWER: 'Viewer' };

export async function buildState(u: CurrentUser) {
  const { m, all } = await currentMembership(u);
  const prefs = (u.prefs || {}) as Record<string, unknown>;
  const sessions = await db.session.findMany({ where: { userId: u.id }, orderBy: { lastSeen: 'desc' } });
  const me = {
    id: u.id, name: u.displayName, email: u.email, pendingEmail: u.pendingEmail, initials: initials(u.displayName), photo: u.photo || '',
    isAdmin: u.isAdmin, theme: u.theme, mode: u.mode, prefs, readAlerts: (prefs.readAlerts as string[]) || [], totpOn: u.totpOn,
    recoveryLeft: Array.isArray(u.recoveryCodes) ? (u.recoveryCodes as unknown[]).length : 0,
    sessions: sessions.map((s) => ({ id: s.id, current: s.id === u.sessionId, agent: s.userAgent || '', ip: s.ip || '', lastSeen: s.lastSeen.toISOString(), created: s.createdAt.toISOString() })),
    role: m ? ROLE[m.role] : '', canManage: !!m && (m.role === 'OWNER' || u.isAdmin), canEdit: !!m && m.role !== 'VIEWER'
  };
  const bCounts = await db.membership.groupBy({ by: ['businessId', 'role'], where: { businessId: { in: all.map((x) => x.businessId) }, removedAt: null }, _count: true });
  const businesses = all.map((x) => ({ id: x.businessId, name: x.business.name, role: ROLE[x.role], current: !!m && x.businessId === m.businessId,
    members: bCounts.filter((c) => c.businessId === x.businessId).reduce((t, c) => t + c._count, 0), owners: bCounts.filter((c) => c.businessId === x.businessId && c.role === 'OWNER').reduce((t, c) => t + c._count, 0) }));
  if (!m) return { me, businesses, business: null, noBusiness: true };
  const bid = m.businessId;

  // ----- people
  const mems = await db.membership.findMany({ where: { businessId: bid }, include: { user: true }, orderBy: { joinedAt: 'asc' } });
  const slotOf: Record<string, string> = {};
  mems.forEach((x, i) => { slotOf[x.userId] = SLOTS[i % 3]; });

  // ----- accounts you can see
  const acctRows = await db.account.findMany({
    where: { businessId: bid, deletedAt: null, ...visibleAccounts(u.id, m.role) },
    include: { bank: true, access: true, statements: { where: { deletedAt: null }, orderBy: { periodEnd: 'asc' }, include: { txns: { orderBy: [{ date: 'asc' }, { row: 'asc' }] } } } },
    orderBy: { createdAt: 'asc' }
  });
  const seen = new Set(acctRows.map((a) => a.id));
  const hiddenAccts = (await db.account.findMany({ where: { businessId: bid, deletedAt: null }, select: { id: true, bankId: true, closedAt: true } })).filter((a) => !seen.has(a.id));
  const live = mems.filter((x) => !x.removedAt);

  const acctBalance = (a: (typeof acctRows)[number]) => {
    const st = a.statements[a.statements.length - 1];
    return st ? num(st.closing) : num(a.openingBalance);
  };

  // ----- accounts
  const now = today0();
  const accounts = acctRows.map((a, i) => {
    const txns = a.statements.flatMap((s) => s.txns.map((t) => ({ ...t, stId: s.id })));
    const bal = acctBalance(a);
    const monthEnds: Date[] = []; for (let k = 11; k >= 0; k--) monthEnds.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 0)));
    const balAt = (d: Date) => {
      let b: number | null = null;
      for (const s of a.statements) { if (s.periodEnd <= d) b = num(s.closing); for (const t of s.txns) if (t.date <= d && t.balance != null) b = num(t.balance); }
      return b == null ? (a.openingDate && a.openingDate <= d ? num(a.openingBalance) : 0) : b;
    };
    const hist = monthEnds.map((d, k) => (k === 11 ? bal : balAt(d)));
    const inMonth = (d: Date, k: number) => { const e = monthEnds[k]; return d.getUTCFullYear() === e.getUTCFullYear() && d.getUTCMonth() === e.getUTCMonth(); };
    const inc = monthEnds.map((_, k) => Math.round(txns.filter((t) => inMonth(t.date, k)).reduce((s, t) => s + num(t.credit), 0)));
    const exp = monthEnds.map((_, k) => Math.round(txns.filter((t) => inMonth(t.date, k)).reduce((s, t) => s + num(t.debit), 0)));
    const lastEnd = a.statements.length ? a.statements[a.statements.length - 1].periodEnd : now;
    const since = new Date(+lastEnd - 30 * DAY);
    const cat: Record<string, number> = {};
    txns.filter((t) => t.date >= since && num(t.debit) > 0).forEach((t) => { const c = t.category || categorize(t.description, 0); if (c === 'Transfers' || c === 'Tax payments') return; cat[c] = (cat[c] || 0) + num(t.debit); });
    const cats = Object.entries(cat).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, Math.round(v)]);
    const recent = txns.slice(-6).reverse().map((t) => [Math.max(0, Math.round((+now - +t.date) / DAY)), t.description, num(t.credit) - num(t.debit), t.category || categorize(t.description, num(t.credit))]);
    // each current member's switch on this account: their role's default unless the account sets it
    const access = live.map((x) => {
      const row = a.access.find((r) => r.userId === x.userId);
      return { id: x.userId, name: x.user.displayName, ini: initials(x.user.displayName), slot: slotOf[x.userId] || 'a1', photo: x.user.photo || '', you: x.userId === u.id,
        role: ROLE[x.role], on: seesAccount(x.role, row?.allowed), locked: ROLE_LOCKED[x.role], byDefault: ROLE_LOCKED[x.role] || !row, roleDefault: ROLE_DEFAULT[x.role] };
    });
    const holders = access.filter((p) => p.on);
    const holderNames = holders.map((h) => h.name);
    return {
      id: a.id, name: a.name, bankId: a.bankId, bank: a.bank.name, type: a.type, card: a.type === 'Credit card',
      holders: holders.map((h) => h.id), holderPeople: holders.map((h) => ({ id: h.id, name: h.name, ini: h.ini, slot: h.slot })), access,
      slot: SLOTS[i % 3], initial: (a.name || '?').charAt(0).toUpperCase(),
      bsb: dec(a.bsb), num: dec(a.number), holder: a.nameOnAccount || holderNames.join(' and '),
      balance: bal, hist, inc, exp, cats, tx: recent, statementCount: a.statements.length,
      lastStatement: a.statements.length ? iso(a.statements[a.statements.length - 1].periodEnd) : '',
      openedAt: a.openedAt ? monY(a.openedAt) : '', openedIso: iso(a.openedAt), closedAt: a.closedAt ? monY(a.closedAt) : '', closedIso: iso(a.closedAt),
      monthsFrom: monthEnds.map((d) => d.toLocaleDateString('en-AU', { month: 'short', timeZone: 'UTC' }))
    };
  });

  // ----- banks (shared in the business)
  const bankRows = await db.bank.findMany({ where: { businessId: bid }, orderBy: { createdAt: 'asc' } });
  const bankOut = (b: (typeof bankRows)[number]) => ({
    id: b.id, name: b.name, website: b.website || '', phone: b.phone || '', email: b.email || '', note: b.note || '', icon: b.icon || '', logo: b.logo || '',
    accounts: accounts.filter((a) => a.bankId === b.id && !a.closedIso).map((a) => a.id),
    hiddenUse: hiddenAccts.some((x) => x.bankId === b.id && !x.closedAt),
    deletedAt: iso(b.deletedAt)
  });
  const banks = bankRows.filter((b) => !b.deletedAt).map(bankOut);
  const deletedBanks = bankRows.filter((b) => b.deletedAt).map(bankOut);

  // ----- statements (only for what you can see)
  const acctIds = accounts.map((a) => a.id);
  const stRows = await db.statement.findMany({
    where: { businessId: bid, accountId: { in: acctIds } },
    include: { layoutVersion: { include: { layout: true } }, file: { select: { id: true, name: true, mime: true, size: true } } },
    orderBy: { periodEnd: 'desc' }
  });
  const statements = stRows.map((s) => ({
    id: s.id, accountId: s.accountId, start: iso(s.periodStart), end: iso(s.periodEnd),
    opening: num(s.opening), closing: num(s.closing), credits: num(s.credits), debits: num(s.debits),
    status: s.status, note: s.statusNote || '', reviewedAt: iso(s.reviewedAt), reviewNote: s.reviewNote || '',
    layout: s.layoutVersion ? { id: s.layoutVersion.layoutId, name: s.layoutVersion.layout.name, version: s.layoutVersion.version } : null,
    file: s.file ? { id: s.file.id, name: s.file.name, mime: s.file.mime, size: s.file.size } : null, pages: s.pages,
    importedAt: s.importedAt.toISOString(), importedBy: (mems.find((x) => x.userId === s.importedById)?.user.displayName) || '',
    deletedAt: iso(s.deletedAt), deleteReason: s.deleteReason || ''
  }));

  // ----- layouts (server-wide; usage counts only from statements you can see)
  const layoutRows = await db.layout.findMany({ include: { versions: { orderBy: { version: 'asc' } } }, orderBy: { createdAt: 'asc' } });
  const usage: Record<string, Record<string, number>> = {};
  for (const s of stRows) {
    if (!s.layoutVersion || s.deletedAt) continue;
    const name = accounts.find((a) => a.id === s.accountId)?.name || '';
    const k = s.layoutVersion.layoutId;
    usage[k] = usage[k] || {};
    usage[k][name] = (usage[k][name] || 0) + 1;
  }
  const allUse = await db.statement.groupBy({ by: ['layoutVersionId'], where: { deletedAt: null, layoutVersionId: { not: null } }, _count: true, _max: { importedAt: true } });
  const layouts = layoutRows.map((l) => {
    const vIds = l.versions.map((v) => v.id);
    const total = allUse.filter((x) => x.layoutVersionId && vIds.includes(x.layoutVersionId)).reduce((t, x) => t + x._count, 0);
    const lastMatch = allUse.filter((x) => x.layoutVersionId && vIds.includes(x.layoutVersionId)).map((x) => x._max.importedAt).filter(Boolean).sort((a, b) => +b! - +a!)[0] || null;
    return {
      id: l.id, name: l.name, bankName: l.bankName, bank: banks.find((x) => x.name.toLowerCase() === l.bankName.toLowerCase())?.id || '', kind: l.kind, fmt: l.format,
      status: l.status === 'remap' ? 'remap' : total ? 'ok' : 'new', failed: l.failedNote || '', usedHidden: total > Object.values(usage[l.id] || {}).reduce((t, n) => t + n, 0), lastMatch: iso(lastMatch),
      used: Object.entries(usage[l.id] || {}), deletedAt: iso(l.deletedAt),
      versions: l.versions.map((v) => ({ id: v.id, n: v.version, date: dLong(v.createdAt), by: v.createdBy, map: v.map })),
      map: (l.versions[l.versions.length - 1]?.map as Record<string, unknown>) || {}
    };
  });

  // ----- members, invites, removed members
  const members = mems.filter((x) => !x.removedAt).map((x) => {
    const shared = accounts.filter((a) => a.holders.includes(x.userId)).map((a) => a.name);
    return { id: x.userId, name: x.user.displayName, you: x.userId === u.id, ini: initials(x.user.displayName), slot: slotOf[x.userId], photo: x.user.photo || '', role: x.user.isAdmin && x.userId === u.id ? 'Admin' : ROLE[x.role], baseRole: ROLE[x.role], isAdmin: x.user.isAdmin, joined: monY(x.joinedAt), shares: x.userId === u.id ? '' : shared.length ? 'Shares ' + shared.slice(0, 2).join(' and ') + (shared.length > 2 ? ' and ' + (shared.length - 2) + ' more' : '') + ' with you' : 'Nothing shared with you' };
  });
  const removedMembers = mems.filter((x) => x.removedAt).map((x) => ({ id: x.userId, name: x.user.displayName, ini: initials(x.user.displayName), slot: slotOf[x.userId], role: ROLE[x.role], removed: dLong(x.removedAt) }));
  const invites = me.canManage ? (await db.invite.findMany({ where: { businessId: bid, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } })).map((i) => ({ id: i.id, role: ROLE[i.role], made: i.createdAt.toISOString(), expires: i.expiresAt.toISOString(), token: i.token })) : [];

  // ----- notifications
  const notifications = buildAlerts({ accounts, layouts, statements, prefs });

  // ----- server (admin)
  const settings = Object.fromEntries((await db.serverSetting.findMany()).map((s) => [s.key, s.value]));
  const channels = (await db.channel.findMany({ where: { userId: u.id } })).map((c) => ({ service: c.service, amounts: c.amounts, config: Object.fromEntries(Object.entries((c.config as Record<string, string>) || {}).map(([k, v]) => [k, /token|secret/i.test(k) ? (v ? '••••••' : '') : v])) }));
  const server = u.isAdmin ? await serverInfo() : null;

  return {
    me, businesses, business: { id: bid, name: m.business.name, abn: m.business.abn || '', gstRegistered: m.business.gstRegistered, gstPeriod: m.business.gstPeriod }, members, removedMembers, invites,
    banks, deletedBanks,
    accounts: accounts.filter((a) => !a.closedIso), closedAccounts: accounts.filter((a) => !!a.closedIso), statements, layouts, notifications,
    settings, channels, server, origin: process.env.SOLOFLOW_URL || ''
  };
}

async function serverInfo() {
  const backups = await db.backup.findMany({ orderBy: { createdAt: 'desc' }, take: 30 });
  const files = await db.storedFile.aggregate({ _sum: { size: true }, _count: true });
  const businesses = await db.business.count({ where: { deletedAt: null } });
  const people = await db.user.count();
  const accountsN = await db.account.count({ where: { deletedAt: null } });
  const statementsN = await db.statement.count({ where: { deletedAt: null } });
  const dbSize = Number(((await db.$queryRawUnsafe('select pg_database_size(current_database()) as s')) as { s: bigint }[])[0]?.s || 0);
  const bs = await backupSettings();
  const dir = folderPath(bs.folder);
  const disk = await freeSpace(dir);
  const first = await db.user.findFirst({ orderBy: { createdAt: 'asc' } });
  return {
    backups: backups.map((b) => ({ id: b.id, name: b.fileName, size: b.size, auto: b.auto, at: b.createdAt.toISOString() })),
    fileBytes: files._sum.size || 0, fileCount: files._count, businesses, people, accounts: accountsN, statements: statementsN, dbBytes: dbSize,
    backupBytes: await dirSize(dir), diskFree: disk.free, diskTotal: disk.total, backupSettings: bs, backupDir: dir, version: APP_VERSION, since: first ? first.createdAt.toISOString() : ''
  };
}

type Built = { accounts: { id: string; name: string }[]; layouts: { id: string; name: string; bankName: string; status: string; failed: string }[]; statements: { accountId: string; end: string; start: string; status: string; deletedAt: string }[]; prefs: Record<string, unknown> };

/** Alerts: worked out from the data each time (missing statements, layouts that need re-mapping). */
function buildAlerts(b: Built) {
  const now = today0();
  const out: { id: string; title: string; tag: string; tagStyle: string; text: string; when: string; href: string; fo?: Record<string, string>; at: string }[] = [];
  const warn = 'background:var(--dangerSoft);color:var(--danger)', info = 'background:var(--surface2);color:var(--ink)';
  const choice = ((b.prefs.alerts || {}) as Record<string, boolean>);
  const on = (k: string) => choice[k] !== false;
  const missDays = Number(b.prefs.missDays || 7);
  if (on('missing')) for (const a of b.accounts) {
    const due = nextDue(b.statements.filter((s) => !s.deletedAt && s.accountId === a.id));
    if (!due) continue;
    const late = Math.round((+now - +due) / DAY);
    if (late > missDays) out.push({ id: 'missing-a' + a.id + '-' + iso(due), title: 'Statement not imported', tag: 'Action', tagStyle: warn, text: 'The statement for ' + a.name + ' ending about ' + dLong(due) + ' has not been imported yet.', when: late + ' days late', href: '/statements', at: iso(due) });
  }
  if (on('remap')) for (const ly of b.layouts) if (ly.status === 'remap') out.push({ id: 'remap-' + ly.id + '-' + (ly.failed || ''), title: 'Layout needs re-mapping', tag: 'Review', tagStyle: info, text: 'The ' + ly.name + ' layout from ' + ly.bankName + ' no longer matches ' + (ly.failed || 'a new statement') + '.', when: '', href: '/settings', fo: { kind: 'layout', id: ly.id }, at: '' });
  return out.sort((x, y) => (x.at < y.at ? 1 : -1));
}

/** When the next statement should end, going by how far apart the last two were (or the last one's own length). */
export function nextDue(sts: { start: string; end: string }[]) {
  const s = [...sts].sort((x, y) => (x.end < y.end ? 1 : -1));
  if (!s.length) return null;
  const last = new Date(s[0].end + 'T00:00:00Z');
  const from = new Date((s[1] ? s[1].end : s[0].start) + 'T00:00:00Z');
  const months = Math.max(1, Math.round((+last - +from) / DAY / 30.4));
  const due = new Date(last); due.setUTCMonth(due.getUTCMonth() + months);
  return due;
}
