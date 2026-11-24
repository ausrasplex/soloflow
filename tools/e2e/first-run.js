// Click-through on an EMPTY database (run tools/testdb-reset.sh with --empty first): first-run setup, banks and
// layouts, adding a bank account with its first PDF statement, importing a CSV statement, reviewing a statement,
// inviting a viewer who joins and is switched on for one account, and a backup that restores.
// Run: node tools/e2e/first-run.js   (dev server on BASE, default http://localhost:3100)
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3100';
const DATA = path.join(__dirname, '..', 'testdata');
const fails = [];
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };

(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message || String(e)));
  const act = async (kind, payload) => { const r = await p.request.post(BASE + '/api/act', { data: { kind, payload } }); const j = await r.json(); if (!r.ok()) throw new Error(kind + ': ' + j.error); return j; };
  const state = async () => (await p.request.get(BASE + '/api/state')).json();

  // 1. first-run setup makes the admin and the business
  // the first requests after tools/testdb-reset.sh can fail while the dev server reconnects to the new database
  for (let i = 0; i < 5; i++) { await p.goto(BASE + '/dashboard').catch(() => {}); if (new URL(p.url()).pathname === '/setup') break; await p.waitForTimeout(1500); }
  check(new URL(p.url()).pathname === '/setup', 'a new server sends you to setup');
  errs.length = 0;
  await p.fill('input[name=name]', 'Pat Example'); await p.fill('input[name=email]', 'pat@example.test'); await p.fill('input[name=password]', 'correct-horse-battery');
  await p.fill('input[name=business]', 'Example Electrical');
  await Promise.all([p.waitForNavigation(), p.click('button[type=submit]')]);
  await p.waitForLoadState('networkidle');
  check(new URL(p.url()).pathname === '/dashboard', 'setup lands on the dashboard');
  check(await p.getByText('Add Your First Account').count() > 0, 'an empty dashboard offers to add an account');
  check((await state()).business.name === 'Example Electrical', 'the business is named');

  // 2. banks and the statement layouts for them (layouts are imported the way Settings > Layouts imports a file)
  await act('addBank', { name: 'Example Bank' });
  await act('addBank', { name: 'Sample Credit Union' });
  const ly = await act('importLayouts', JSON.parse(fs.readFileSync(path.join(DATA, 'layouts.json'), 'utf8')));
  check(ly.added === 2, 'two layouts imported');

  // 3. add a bank account in the wizard, importing its first statement (PDF) on the last step
  await p.goto(BASE + '/accounts/new', { waitUntil: 'networkidle' });
  await p.fill('input[placeholder="e.g. Business Transaction"]', 'Business Transaction');
  await p.click('button:has-text("Choose a bank")'); await p.locator('.sheetopt', { hasText: 'Example Bank' }).click();
  await p.click('button:has-text("Transaction")');
  await p.click('button:has-text("Continue")'); await p.waitForTimeout(300);
  await p.click('button:has-text("Continue")'); await p.waitForTimeout(300);
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('button:has-text("Choose files")')]);
  await fc.setFiles(path.join(DATA, 'business-account.pdf'));
  await p.getByText('Balance checked').first().waitFor({ timeout: 20000 });
  await p.click('button:has-text("Create account")');
  await p.waitForTimeout(2500);
  let s = await state();
  const acct = s.accounts.find((a) => a.name === 'Business Transaction');
  check(!!acct, 'the account is created');
  check(acct && acct.statementCount === 1 && Math.abs(acct.balance - 12062.45) < 0.01, 'its first PDF statement is imported and the balance is $12,062.45');

  // 4. a savings account, then its CSV statement through the Statements screen
  await act('createAccount', { name: 'Tax Savings', bank: 'Sample Credit Union', type: 'Savings' });
  await p.goto(BASE + '/statements', { waitUntil: 'networkidle' });
  const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('button:has-text("Drop PDF or CSV")')]);
  await fc2.setFiles(path.join(DATA, 'cu-export.csv'));
  await p.click('button:has-text("Import 1 statement")', { timeout: 20000 });
  await p.waitForTimeout(2000);
  s = await state();
  const sav = s.accounts.find((a) => a.name === 'Tax Savings');
  check(sav && sav.statementCount === 1 && Math.abs(sav.balance - 2168.19) < 0.01, 'the CSV statement is imported into Tax Savings ($2,168.19)');

  // 5. review a statement
  const st0 = s.statements.find((x) => x.accountId === acct.id);
  await act('reviewStatement', { id: st0.id, note: 'Checked against the bank' });
  s = await state();
  check(!!s.statements.find((x) => x.id === st0.id).reviewedAt, 'a statement can be marked as reviewed');

  // 6. invite a viewer (an accountant), who joins the business and is switched on for one account
  const inv = await act('createInvite', { role: 'Viewer' });
  const p2 = await (await b.newContext()).newPage();
  await p2.goto(BASE + '/join?t=' + inv.token);
  await p2.fill('input[name=name]', 'Sam Bookkeeper'); await p2.fill('input[name=email]', 'sam@example.test'); await p2.fill('input[name=password]', 'another-long-password');
  await Promise.all([p2.waitForNavigation(), p2.click('button[type=submit]')]);
  const s2 = await (await p2.request.get(BASE + '/api/state')).json();
  check(s2.business && s2.business.name === 'Example Electrical' && s2.accounts.length === 0, 'the invited viewer joins and sees no accounts until switched on');
  await act('setAccountAccess', { accountId: acct.id, userId: s2.me.id, allowed: true });
  const s3 = await (await p2.request.get(BASE + '/api/state')).json();
  check(s3.accounts.length === 1 && s3.accounts[0].id === acct.id, 'once switched on for one account, they see just that account');
  const page = await p2.request.post(BASE + '/api/act', { data: { kind: 'setAccountAccess', payload: { accountId: acct.id, userId: s2.me.id, allowed: false } } });
  check(page.status() === 400, 'a viewer cannot change who sees an account');

  // 7. a backup, read back and restored
  const bk = await act('backupNow', {});
  const list = (await state()).server.backups;
  check(list.length >= 1, 'a backup is made');
  const file = await p.request.get(BASE + '/api/backup/' + list[0].id);
  const buf = await file.body();
  check(buf.length > 1000, 'the backup downloads');
  await act('deleteStatements', { ids: [st0.id], reason: 'test' });
  const fd = { file: { name: list[0].name, mimeType: 'application/octet-stream', buffer: buf } };
  const info = await (await p.request.post(BASE + '/api/restore', { multipart: fd })).json();
  check(info.businesses === 1 && info.accounts === 2, 'the backup describes 1 business and 2 accounts');
  const done = await (await p.request.post(BASE + '/api/restore', { multipart: { ...fd, confirm: 'RESTORE' } })).json();
  check(done.restored === true, 'the restore runs');
  await p.goto(BASE + '/signin'); await p.fill('input[name=email]', 'pat@example.test'); await p.fill('input[name=password]', 'correct-horse-battery');
  await Promise.all([p.waitForNavigation(), p.click('button[type=submit]')]);
  s = await state();
  check(s.statements.some((x) => x.id === st0.id && !x.deletedAt), 'after the restore, the deleted statement is back');
  void bk;

  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + JSON.stringify(errs.slice(0, 3)) : ''));
  await b.close();
  console.log(fails.length ? fails.length + ' failed' : 'first run passed');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
