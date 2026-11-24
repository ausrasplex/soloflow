// Demo data for trying SoloFlow: two sole-trader businesses, their bank and card accounts, statements and layouts.
// Run with: npm run db:seed   (it refuses to run when the database already has people in it, unless --force)
// Sign in as alex@soloflow.local / soloflow-demo (admin, owns Sample Electrical). Sam is a bookkeeper in both businesses
// (sam@soloflow.local). Jordan owns Taylor Plumbing (jordan@soloflow.local). Same password for everyone.
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createCipheriv, randomBytes, scryptSync } from 'node:crypto';

const db = new PrismaClient();
const D = (s: string) => new Date(s + 'T00:00:00Z');
const DAY = 86400000;
const r2 = (n: number) => Math.round(n * 100) / 100;
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

function enc(plain: string) {
  const key = scryptSync(process.env.SOLOFLOW_SECRET || '', 'soloflow-at-rest', 32);
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

const today = (() => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); })();
const addMonths = (d: Date, m: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m, d.getUTCDate()));

async function main() {
  if ((await db.user.count()) > 0 && !process.argv.includes('--force')) {
    console.log('The database already has people in it. Run `npm run db:reset` first, or `npx tsx prisma/seed.ts --force`.');
    return;
  }
  const pw = await bcrypt.hash('soloflow-demo', 11);
  const alex = await db.user.create({ data: { email: 'alex@soloflow.local', displayName: 'Alex', passwordHash: pw, isAdmin: true } });
  const sam = await db.user.create({ data: { email: 'sam@soloflow.local', displayName: 'Sam', passwordHash: pw } });
  const jordan = await db.user.create({ data: { email: 'jordan@soloflow.local', displayName: 'Jordan', passwordHash: pw } });
  const elec = await db.business.create({ data: { name: 'Sample Electrical', abn: '51 824 753 556', gstRegistered: true, gstPeriod: 'quarterly' } });
  const plumb = await db.business.create({ data: { name: 'Taylor Plumbing', gstRegistered: false } });
  await db.membership.create({ data: { userId: alex.id, businessId: elec.id, role: 'OWNER', joinedAt: D('2024-07-01') } });
  await db.membership.create({ data: { userId: sam.id, businessId: elec.id, role: 'EDITOR', joinedAt: D('2024-07-20') } });
  await db.membership.create({ data: { userId: jordan.id, businessId: plumb.id, role: 'OWNER', joinedAt: D('2025-08-14') } });
  await db.membership.create({ data: { userId: sam.id, businessId: plumb.id, role: 'EDITOR', joinedAt: D('2025-09-01') } });
  for (const [u, b] of [[alex, elec], [sam, elec], [jordan, plumb]] as const) await db.user.update({ where: { id: u.id }, data: { currentBusinessId: b.id } });

  const ex = await db.bank.create({ data: { businessId: elec.id, name: 'Example Bank', website: 'https://www.examplebank.example', phone: '13 00 00', email: 'business@examplebank.example', note: 'Business banking, Mon to Fri 8am to 6pm' } });
  const cu = await db.bank.create({ data: { businessId: elec.id, name: 'Sample Credit Union', website: 'https://www.samplecu.example', phone: '1800 000 111', email: 'hello@samplecu.example' } });
  const cu2 = await db.bank.create({ data: { businessId: plumb.id, name: 'Sample Credit Union', website: 'https://www.samplecu.example' } });

  // ----- layouts (server-wide). The account layout matches tools/make_test_pdf.py.
  const box = (page: number, b: number[]) => ({ page, box: b });
  const acctMap = { period: box(1, [58, 19, 38, 7]), opening: box(1, [4, 36, 18, 7]), debits: box(1, [24, 36, 18, 7]), credits: box(1, [62, 36, 16, 7]), closing: box(1, [80, 36, 17, 7]), table: box(2, [4, 12, 92, 80]), cDate: box(2, [4, 12, 12, 80]), cDesc: box(2, [16, 12, 41, 80]), cDebit: box(2, [57, 12, 13, 80]), cCredit: box(2, [70, 12, 13, 80]), cBal: box(2, [83, 12, 13, 80]), acct: box(1, [58, 13, 38, 5]) };
  const mkLayout = async (name: string, bankName: string, kind: string, format: string, versions: [string, string, object][], status = 'ok', failed?: string) => {
    const l = await db.layout.create({ data: { name, bankName, kind, format, status, failedNote: failed } });
    const out = [];
    for (let i = 0; i < versions.length; i++) out.push(await db.layoutVersion.create({ data: { layoutId: l.id, version: i + 1, map: versions[i][2] as Prisma.InputJsonValue, fingerprint: { words: [bankName.toUpperCase(), kind === 'card' ? 'CREDIT CARD' : 'ACCOUNT STATEMENT'] }, createdBy: versions[i][1], createdAt: D(versions[i][0]) } }));
    return out;
  };
  const [L1v1, L1v2] = await mkLayout('Business account statement', 'Example Bank', 'account', 'PDF', [['2024-07-12', 'Alex', acctMap], ['2026-03-14', 'Alex', acctMap]]);
  const [L2v1] = await mkLayout('Business credit card statement', 'Example Bank', 'card', 'PDF', [['2024-08-02', 'Sam', acctMap]]);
  const [L3v1] = await mkLayout('Account export', 'Sample Credit Union', 'account', 'CSV', [['2025-04-05', 'Alex', { cols: ['date', 'desc', 'debit', 'credit', 'balance'], dateFmt: 'dmy', header: ['Date', 'Narrative', 'Debit', 'Credit', 'Balance'] }]]);

  // ----- accounts with monthly statements and transactions
  type Pattern = [string, number, number][]; // description, amount (+ in, − out), day of month
  const mkAcct = async (o: { business: string; name: string; type: string; bank: string; holders: string[]; bsb?: string; number: string; nameOn: string; opening: number; opened: string; layout?: string | ((end: Date) => string); pattern: Pattern; closed?: string; skipLatest?: boolean }) => {
    const card = o.type === 'Credit card';
    const a = await db.account.create({ data: { businessId: o.business, bankId: o.bank, name: o.name, type: o.type, bsb: o.bsb ? enc(o.bsb) : null, number: enc(o.number), nameOnAccount: o.nameOn, openingBalance: o.opening, openingDate: addMonths(today, -13), openedAt: D(o.opened), closedAt: o.closed ? D(o.closed) : null, holders: { create: o.holders.map((userId) => ({ userId })) } } });
    if (o.closed) return a;
    let bal = o.opening;
    for (let k = 12; k >= 1; k--) {
      const pStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - k, 1));
      const pEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - k + 1, 0));
      if (o.skipLatest && k === 1) continue; // the latest one has not been imported
      const open = bal; let deb = 0, cre = 0;
      const tx: { date: Date; description: string; debit: number; credit: number; balance: number }[] = [];
      for (const [desc, amt, dom] of o.pattern) {
        const day = new Date(Date.UTC(pStart.getUTCFullYear(), pStart.getUTCMonth(), Math.min(dom, pEnd.getUTCDate())));
        const v = r2(amt * (0.85 + rnd() * 0.3));
        if (v >= 0) cre += v; else deb += -v;
        tx.push({ date: day, description: desc, debit: v < 0 ? -v : 0, credit: v > 0 ? v : 0, balance: 0 });
      }
      tx.sort((x, y) => +x.date - +y.date);
      // a card balance is owed, so spending adds to it
      let rb = open; tx.forEach((t) => { rb = r2(card ? rb + t.debit - t.credit : rb + t.credit - t.debit); t.balance = rb; });
      const layoutVersionId = typeof o.layout === 'function' ? o.layout(pEnd) : o.layout;
      const st = await db.statement.create({ data: { businessId: o.business, accountId: a.id, periodStart: pStart, periodEnd: pEnd, opening: open, closing: rb, debits: r2(deb), credits: r2(cre), status: 'Imported', layoutVersionId, pages: 2, importedById: o.holders[0], importedAt: new Date(+pEnd + 4 * DAY) } });
      await db.txn.createMany({ data: tx.map((x, i) => ({ statementId: st.id, date: x.date, description: x.description, debit: x.debit, credit: x.credit, balance: x.balance, page: 2, row: i, dedupeKey: a.id + ':' + x.date.toISOString().slice(0, 10) + ':' + i })) });
      bal = rb;
    }
    return a;
  };
  await mkAcct({ business: elec.id, name: 'Business Transaction', type: 'Transaction', bank: ex.id, holders: [alex.id, sam.id], bsb: '000-000', number: '12345678', nameOn: 'A Sample trading as Sample Electrical', opening: 8400, opened: '2024-07-01', layout: (end) => (end >= D('2026-03-14') ? L1v2.id : L1v1.id),
    pattern: [['Invoice 1042 Smith Builders', 4180, 3], ['Bunnings Warehouse', -312, 4], ['Shell Coles Express', -96, 6], ['Middys Electrical', -1240, 8], ['Invoice 1043 R Jones', 1650, 10], ['Telstra business', -89, 12], ['Transfer to tax savings', -1500, 14], ['Invoice 1044 Harbour Strata', 6930, 17], ['Rexel', -870, 19], ['Ampol', -102, 21], ['Card payment', -2100, 22], ['Drawings to personal', -2500, 25], ['Monthly account fee', -10, 28], ['Invoice 1045 K Nguyen', 990, 27]] });
  await mkAcct({ business: elec.id, name: 'Tax Savings', type: 'Savings', bank: cu.id, holders: [alex.id, sam.id], bsb: '111-111', number: '34567890', nameOn: 'A Sample', opening: 9100, opened: '2024-07-01', layout: L3v1.id, pattern: [['Transfer in', 1500, 14], ['Interest', 24, 28]] });
  await mkAcct({ business: elec.id, name: 'Business Card', type: 'Credit card', bank: ex.id, holders: [alex.id, sam.id], number: '4417', nameOn: 'A Sample', opening: 1450, opened: '2024-07-15', layout: L2v1.id, skipLatest: true,
    pattern: [['Bunnings Warehouse', -186, 5], ['Officeworks', -64, 9], ['Haymans Electrical', -720, 11], ['NRMA business insurance', -142, 15], ['Aussie Broadband', -79, 18], ['Payment received thank you', 1250, 22], ['Shell Coles Express', -88, 24], ['Interest charged', -14, 28]] });
  await mkAcct({ business: elec.id, name: 'Old Savings', type: 'Savings', bank: cu.id, holders: [alex.id], bsb: '111-111', number: '56789012', nameOn: 'A Sample', opening: 0, opened: '2023-02-01', pattern: [], closed: '2024-08-20' });
  await mkAcct({ business: plumb.id, name: 'Everyday Business', type: 'Transaction', bank: cu2.id, holders: [jordan.id, sam.id], bsb: '111-111', number: '67890123', nameOn: 'J Taylor', opening: 2400, opened: '2025-08-20', layout: L3v1.id,
    pattern: [['Invoice 0007 Lee family', 2600, 2], ['Reece Plumbing', -480, 6], ['Caltex', -90, 12], ['Invoice 0008 Body corporate', 3100, 18], ['Tradelink', -390, 23]] });

  await db.serverSetting.createMany({ data: [{ key: 'signup', value: 'invite' }, { key: 'allowOutside', value: true }, { key: 'backups', value: { auto: true, freq: 'daily', keep: 7, folder: './backups', remind: true } }] });
  console.log('Demo data ready. Sign in as alex@soloflow.local with the password soloflow-demo.');
}

main().finally(() => db.$disconnect());
