// Demo data for trying Folio: a household with three people, loans, accounts, statements and layouts.
// Run with: npm run db:seed   (it refuses to run when the database already has people in it, unless --force)
// Sign in as alex@folio.local / folio-demo (admin). Sam and Jordan use sam@ / jordan@folio.local, same password.
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
  const key = scryptSync(process.env.FOLIO_SECRET || '', 'folio-at-rest', 32);
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
  const pw = await bcrypt.hash('folio-demo', 11);
  const alex = await db.user.create({ data: { email: 'alex@folio.local', displayName: 'Alex', passwordHash: pw, isAdmin: true } });
  const sam = await db.user.create({ data: { email: 'sam@folio.local', displayName: 'Sam', passwordHash: pw } });
  const jordan = await db.user.create({ data: { email: 'jordan@folio.local', displayName: 'Jordan', passwordHash: pw } });
  const h = await db.household.create({ data: { name: 'Sample household' } });
  await db.membership.create({ data: { userId: alex.id, householdId: h.id, role: 'OWNER', joinedAt: D('2023-01-10') } });
  await db.membership.create({ data: { userId: sam.id, householdId: h.id, role: 'OWNER', joinedAt: D('2023-03-02') } });
  await db.membership.create({ data: { userId: jordan.id, householdId: h.id, role: 'VIEWER', joinedAt: D('2025-08-14') } });
  for (const u of [alex, sam, jordan]) await db.user.update({ where: { id: u.id }, data: { currentHouseholdId: h.id } });

  const ex = await db.lender.create({ data: { householdId: h.id, name: 'Example Bank', website: 'https://www.examplebank.example', phone: '13 00 00', email: 'homeloans@examplebank.example', note: 'Home loan support, Mon to Fri 8am to 6pm' } });
  const cu = await db.lender.create({ data: { householdId: h.id, name: 'Sample Credit Union', website: 'https://www.samplecu.example', phone: '1800 000 111', email: 'hello@samplecu.example' } });
  const br = await db.broker.create({ data: { householdId: h.id, name: 'Jamie Taylor', company: 'Taylor Finance', licence: 'Credit licence 000000', phone: '0400 000 000', email: 'jamie@taylorfinance.example', website: 'https://www.taylorfinance.example', note: 'Arranged the original loan and the rate review', reviewOn: true, lastReview: new Date(+today - 175 * DAY), reviewEvery: 6 } });

  // ----- layouts (server-wide)
  const box = (page: number, b: number[]) => ({ page, box: b });
  const loanMap = { period: box(1, [58, 19, 38, 7]), opening: box(1, [4, 36, 18, 7]), interest: box(1, [24, 36, 18, 7]), credits: box(1, [62, 36, 16, 7]), closing: box(1, [80, 36, 17, 7]), table: box(2, [4, 12, 92, 80]), cDate: box(2, [4, 12, 12, 80]), cDesc: box(2, [16, 12, 41, 80]), cDebit: box(2, [57, 12, 13, 80]), cCredit: box(2, [70, 12, 13, 80]), cBal: box(2, [83, 12, 13, 80]), acct: box(1, [58, 13, 38, 5]), advance: box(1, [4, 46, 18, 7]), offset: box(1, [62, 46, 16, 7]), rate: box(1, [80, 46, 17, 7]) };
  const acctMap = { period: box(1, [58, 19, 38, 7]), opening: box(1, [4, 36, 18, 7]), debits: box(1, [24, 36, 18, 7]), credits: box(1, [62, 36, 16, 7]), closing: box(1, [80, 36, 17, 7]), table: box(2, [4, 12, 92, 80]), cDate: box(2, [4, 12, 12, 80]), cDesc: box(2, [16, 12, 41, 80]), cDebit: box(2, [57, 12, 13, 80]), cCredit: box(2, [70, 12, 13, 80]), cBal: box(2, [83, 12, 13, 80]), acct: box(1, [58, 13, 38, 5]) };
  const mkLayout = async (name: string, lenderName: string, kind: string, format: string, versions: [string, string, object][], status = 'ok', failed?: string) => {
    const l = await db.layout.create({ data: { name, lenderName, kind, format, status, failedNote: failed } });
    const out = [];
    for (let i = 0; i < versions.length; i++) out.push(await db.layoutVersion.create({ data: { layoutId: l.id, version: i + 1, map: versions[i][2] as Prisma.InputJsonValue, fingerprint: { words: [lenderName.toUpperCase(), kind === 'loan' ? 'HOME LOAN' : 'ACCOUNT STATEMENT'] }, createdBy: versions[i][1], createdAt: D(versions[i][0]) } }));
    return out;
  };
  const [L1v1, L1v2] = await mkLayout('Home loan statement', 'Example Bank', 'loan', 'PDF', [['2023-01-12', 'Alex', loanMap], ['2026-03-14', 'Alex', loanMap]]);
  const [L2v1] = await mkLayout('Everyday account statement', 'Example Bank', 'account', 'PDF', [['2024-02-20', 'Sam', acctMap]], 'remap', 'Rental Offset, September 2026');
  await mkLayout('Credit card statement', 'Example Bank', 'account', 'PDF', [['2026-10-02', 'Alex', acctMap]]);
  const [L3v1] = await mkLayout('Account export', 'Sample Credit Union', 'account', 'CSV', [['2025-04-05', 'Alex', { cols: ['date', 'desc', 'debit', 'credit', 'balance'], dateFmt: 'dmy', header: ['Date', 'Narrative', 'Debit', 'Credit', 'Balance'] }]]);
  const [L4v1] = await mkLayout('Loan statement', 'Sample Credit Union', 'loan', 'PDF', [['2024-09-18', 'Alex', loanMap]]);

  // ----- loans
  type SplitDef = { name: string; suffix: string; kind: 'VARIABLE' | 'FIXED'; fixedUntil?: Date; amount: number; rate: number; rates?: [string, number][]; repay: number; freq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'; day: number; anchor?: Date };
  const mkLoan = async (o: { name: string; purpose: string; lender: string; broker?: string; start: string; term: number; postingDay: number; borrowers: string[]; splits: SplitDef[]; stmtMonths: number; layout?: string[]; status?: string; closedReason?: string; closedAt?: string; acct?: string }) => {
    const loan = await db.loan.create({ data: { householdId: h.id, lenderId: o.lender, brokerId: o.broker, name: o.name, purpose: o.purpose, startDate: D(o.start), termYears: o.term, postingDay: o.postingDay, status: o.status || 'active', closedReason: o.closedReason, closedAt: o.closedAt ? D(o.closedAt) : null, accountNumber: o.acct ? enc(o.acct) : null, createdById: alex.id,
      lenderSnapshot: o.status === 'archived' ? { name: o.lender === ex.id ? 'Example Bank' : 'Sample Credit Union' } : undefined, borrowers: { create: o.borrowers.map((userId) => ({ userId })) } } });
    let order = 0;
    for (const s of o.splits) {
      const sp = await db.loanSplit.create({ data: { loanId: loan.id, name: s.name, accountSuffix: s.suffix, kind: s.kind, fixedUntil: s.fixedUntil, openingBalance: s.amount, startRate: s.rate, repayment: s.repay, frequency: s.freq, repayDay: s.day, anchorDate: s.anchor, sortOrder: order++ } });
      for (const [dt, rate] of s.rates || []) await db.rateChange.create({ data: { splitId: sp.id, effectiveDate: D(dt), rate, source: 'statement' } });
      if (o.status === 'archived') continue;
      // statements from the start, every stmtMonths, with weekly/fortnightly/monthly repayments and monthly interest
      let bal = s.amount;
      let pStart = D(o.start);
      let vIdx = 0;
      while (true) {
        const pEnd = new Date(+addMonths(pStart, o.stmtMonths) - DAY);
        if (pEnd > today) break;
        const txns: { date: Date; description: string; debit: number; credit: number; balance: number; rate?: number }[] = [];
        const open = bal; let interest = 0, credits = 0;
        const rateOn = (d: Date) => { let r = s.rate; for (const [dt, rr] of s.rates || []) if (D(dt) <= d) r = rr; return r; };
        let accrued = 0;
        for (let t = +pStart; t <= +pEnd; t += DAY) {
          const day = new Date(t);
          for (const [dt, rr] of s.rates || []) if (+D(dt) === t) txns.push({ date: day, description: 'INTEREST RATE CHANGE TO ' + rr.toFixed(2) + '% PA', debit: 0, credit: 0, balance: r2(bal), rate: rr });
          const pay = s.freq === 'MONTHLY' ? day.getUTCDate() === s.day : day.getUTCDay() === s.day && (s.freq === 'WEEKLY' || Math.round((t - +(s.anchor || D(o.start))) / DAY) % 14 === 0);
          if (pay && bal > 0) { const a = Math.min(bal, s.repay); bal = r2(bal - a); credits += a; txns.push({ date: day, description: 'REPAYMT A/C TFR', debit: 0, credit: a, balance: bal }); }
          accrued += bal * rateOn(day) / 100 / 365;
          if (day.getUTCDate() === o.postingDay) { const i = r2(accrued); accrued = 0; if (i > 0 && bal > 0) { bal = r2(bal + i); interest += i; txns.push({ date: day, description: 'INTEREST', debit: i, credit: 0, balance: bal }); } }
        }
        const lv = o.layout ? (pEnd >= D('2026-03-14') && o.layout[1] ? o.layout[1] : o.layout[0]) : null;
        const st = await db.statement.create({ data: { householdId: h.id, splitId: sp.id, periodStart: pStart, periodEnd: pEnd, opening: open, closing: bal, interest: r2(interest), credits: r2(credits), rate: rateOn(pEnd), paymentsInAdvance: r2(Math.max(0, credits - interest) * 0.4), status: 'Reconciled', layoutVersionId: lv, pages: 3, importedById: alex.id, importedAt: new Date(+pEnd + 3 * DAY) } });
        await db.txn.createMany({ data: txns.map((x, i) => ({ statementId: st.id, date: x.date, description: x.description, debit: x.debit, credit: x.credit, balance: x.balance, rate: x.rate, page: 2, row: i, dedupeKey: sp.id + ':' + x.date.toISOString().slice(0, 10) + ':' + i })) });
        pStart = new Date(+pEnd + DAY);
        vIdx++;
      }
      await db.loanSplit.update({ where: { id: sp.id }, data: { balanceAmount: bal, balanceDate: new Date(+pStart - DAY) } });
    }
    return loan;
  };
  const home = await mkLoan({ name: 'Sample Home Loan', purpose: 'Home loan', lender: ex.id, broker: br.id, start: '2023-02-12', term: 30, postingDay: 10, borrowers: [alex.id, sam.id], stmtMonths: 6, layout: [L1v1.id, L1v2.id], acct: '000123456',
    splits: [
      { name: 'Split 01', suffix: '01', kind: 'VARIABLE', amount: 250000, rate: 5.89, rates: [['2023-06-20', 6.14], ['2023-12-01', 6.59], ['2025-06-15', 6.34], ['2026-02-17', 5.66], ['2026-03-31', 5.91], ['2026-10-08', 6.16]], repay: 384, freq: 'WEEKLY', day: 4 },
      { name: 'Split 02', suffix: '02', kind: 'FIXED', fixedUntil: D('2027-02-12'), amount: 40000, rate: 5.19, repay: 64, freq: 'WEEKLY', day: 4 }
    ] });
  const inv = await mkLoan({ name: 'Investment Property', purpose: 'Investment loan', lender: ex.id, start: '2024-05-11', term: 30, postingDay: 10, borrowers: [alex.id], stmtMonths: 6, layout: [L1v1.id, L1v2.id], splits: [{ name: 'Split 01', suffix: '01', kind: 'FIXED', fixedUntil: D('2027-06-09'), amount: 340000, rate: 5.89, repay: 2015, freq: 'MONTHLY', day: 11 }] });
  await mkLoan({ name: 'Car loan', purpose: 'Car loan', lender: cu.id, start: '2024-09-10', term: 5, postingDay: 10, borrowers: [alex.id], stmtMonths: 6, layout: [L4v1.id], splits: [{ name: 'Loan', suffix: '01', kind: 'FIXED', fixedUntil: D('2029-09-10'), amount: 32000, rate: 7.10, repay: 290, freq: 'FORTNIGHTLY', day: 5, anchor: D('2024-09-13') }] });
  await mkLoan({ name: 'Jordan\'s car', purpose: 'Car loan', lender: cu.id, start: '2025-09-01', term: 5, postingDay: 1, borrowers: [jordan.id], stmtMonths: 6, splits: [{ name: 'Loan', suffix: '01', kind: 'FIXED', amount: 24000, rate: 8.2, repay: 245, freq: 'FORTNIGHTLY', day: 3 }] });
  await mkLoan({ name: 'Old car loan', purpose: 'Car loan', lender: cu.id, start: '2021-03-01', term: 5, postingDay: 1, borrowers: [alex.id], stmtMonths: 6, status: 'archived', closedReason: 'Paid off', closedAt: '2025-06-20', splits: [{ name: 'Loan', suffix: '01', kind: 'FIXED', amount: 18000, rate: 6.4, repay: 180, freq: 'FORTNIGHTLY', day: 5 }] });
  await mkLoan({ name: 'First home loan', purpose: 'Home loan', lender: ex.id, start: '2018-01-15', term: 30, postingDay: 10, borrowers: [alex.id, sam.id], stmtMonths: 6, status: 'archived', closedReason: 'Refinanced', closedAt: '2023-01-30', splits: [{ name: 'Split 01', suffix: '01', kind: 'VARIABLE', amount: 260000, rate: 4.2, repay: 320, freq: 'WEEKLY', day: 4 }] });

  // ----- accounts with monthly statements and transactions
  const mkAcct = async (o: { name: string; type: string; lender: string; holders: string[]; offset?: string; bsb: string; number: string; nameOn: string; opening: number; opened: string; layout?: string; pattern: [string, number, number][]; closed?: string }) => {
    const a = await db.account.create({ data: { householdId: h.id, lenderId: o.lender, name: o.name, type: o.type, offsetLoanId: o.offset, bsb: enc(o.bsb), number: enc(o.number), nameOnAccount: o.nameOn, openingBalance: o.opening, openingDate: addMonths(today, -13), openedAt: D(o.opened), closedAt: o.closed ? D(o.closed) : null, holders: { create: o.holders.map((userId) => ({ userId })) } } });
    if (o.closed) return a;
    let bal = o.opening;
    for (let k = 12; k >= 1; k--) {
      const pStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - k, 1));
      const pEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - k + 1, 0));
      if (o.name === 'Bills Account' && k === 1) continue; // the latest one has not been imported
      const open = bal; let deb = 0, cre = 0;
      const tx: { date: Date; description: string; debit: number; credit: number; balance: number; category: string }[] = [];
      for (const [desc, amt, dom] of o.pattern) {
        const day = new Date(Date.UTC(pStart.getUTCFullYear(), pStart.getUTCMonth(), Math.min(dom, pEnd.getUTCDate())));
        const v = r2(amt * (0.85 + rnd() * 0.3));
        if (v >= 0) { cre += v; bal = r2(bal + v); } else { deb += -v; bal = r2(bal + v); }
        tx.push({ date: day, description: desc, debit: v < 0 ? -v : 0, credit: v > 0 ? v : 0, balance: bal, category: '' });
      }
      tx.sort((x, y) => +x.date - +y.date);
      let rb = open; tx.forEach((t) => { rb = r2(rb + t.credit - t.debit); t.balance = rb; });
      const st = await db.statement.create({ data: { householdId: h.id, accountId: a.id, periodStart: pStart, periodEnd: pEnd, opening: open, closing: rb, debits: r2(deb), credits: r2(cre), status: 'Imported', layoutVersionId: o.layout, pages: 2, importedById: alex.id, importedAt: new Date(+pEnd + 4 * DAY) } });
      await db.txn.createMany({ data: tx.map((x, i) => ({ statementId: st.id, date: x.date, description: x.description, debit: x.debit, credit: x.credit, balance: x.balance, page: 2, row: i, dedupeKey: a.id + ':' + x.date.toISOString().slice(0, 10) + ':' + i })) });
      bal = rb;
    }
    return a;
  };
  await mkAcct({ name: 'Everyday Account', type: 'Everyday', lender: ex.id, holders: [alex.id, sam.id], offset: home.id, bsb: '000-000', number: '12345678', nameOn: 'A Sample and S Sample', opening: 78000, opened: '2019-02-01', layout: L2v1.id,
    pattern: [['Employer pay', 3900, 1], ['Woolworths', -180, 3], ['Shell Coles Express', -75, 6], ['Bunnings', -60, 9], ['Cafe Bellissimo', -38, 11], ['Employer pay', 3900, 15], ['Coles', -210, 17], ['Myki top up', -50, 19], ['Kmart', -45, 22], ['Uber Eats', -42, 25], ['Woolworths', -165, 27], ['Transfer to Bills', -1000, 28], ['Loan repayment', -1940, 4], ['Card payment', -2600, 20], ['JB Hi-Fi', -420, 13], ['Transfer to Holiday', -400, 12]] });
  await mkAcct({ name: 'Bills Account', type: 'Everyday', lender: ex.id, holders: [alex.id, sam.id], bsb: '000-000', number: '23456789', nameOn: 'A Sample and S Sample', opening: 3020, opened: '2019-02-01', layout: L2v1.id,
    pattern: [['Transfer in', 1000, 1], ['Red Energy', -190, 5], ['NRMA Home insurance', -126, 8], ['Council rates', -205, 14], ['Aussie Broadband', -89, 18], ['Telstra mobile', -76, 21], ['Water bill', -95, 24], ['Car insurance AAMI', -112, 26]] });
  await mkAcct({ name: 'Holiday Savings', type: 'Savings', lender: cu.id, holders: [alex.id], bsb: '111-111', number: '34567890', nameOn: 'A Sample', opening: 12100, opened: '2021-06-01', layout: L3v1.id, pattern: [['Transfer in', 400, 12], ['Interest', 18, 28]] });
  await mkAcct({ name: 'Rental Offset', type: 'Offset', lender: ex.id, holders: [alex.id], offset: inv.id, bsb: '000-000', number: '45678901', nameOn: 'A Sample', opening: 21100, opened: '2024-05-11', layout: L2v1.id, pattern: [['Rent received', 2600, 7], ['Agent fee', -208, 18], ['Water rates', -110, 21], ['Transfer to loan', -2150, 11]] });
  await mkAcct({ name: 'Old Savings', type: 'Savings', lender: cu.id, holders: [alex.id], bsb: '111-111', number: '56789012', nameOn: 'A Sample', opening: 0, opened: '2019-02-01', pattern: [], closed: '2024-08-20' });
  await mkAcct({ name: 'Jordan Everyday', type: 'Everyday', lender: cu.id, holders: [jordan.id], bsb: '111-111', number: '67890123', nameOn: 'J Sample', opening: 2400, opened: '2025-08-20', pattern: [['Pay', 2100, 2], ['Groceries', -140, 9]] });

  await db.serverSetting.createMany({ data: [{ key: 'signup', value: 'invite' }, { key: 'allowOutside', value: true }, { key: 'backups', value: { auto: true, freq: 'daily', keep: 7, folder: './backups', remind: true } }] });
  console.log('Demo data ready. Sign in as alex@folio.local with the password folio-demo.');
}

main().finally(() => db.$disconnect());
