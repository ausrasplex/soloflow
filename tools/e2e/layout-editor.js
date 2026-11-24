// Click-through: map a new layout from a sample PDF using suggested boxes, check it, and save it.
// Run: node tools/e2e/layout-editor.js [sample.pdf] [save] [layout name]
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3100';
(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const logs = []; p.on('pageerror', (e) => logs.push('pageerror ' + e.message));
  await p.goto(BASE + '/signin'); await p.fill('input[name=email]', 'alex@soloflow.local'); await p.fill('input[name=password]', 'soloflow-demo');
  await Promise.all([p.waitForNavigation(), p.click('button[type=submit]')]);
  await p.goto(BASE + '/settings', { waitUntil: 'networkidle' });
  await p.click('button:has-text("Layouts")'); await p.waitForTimeout(500);
  await p.click('button[aria-label="Map a new layout"]');
  p.on('filechooser', (fc) => fc.setFiles(process.argv[2] || require('path').join(__dirname, '..', 'testdata', 'business-account.pdf')));
  await p.click('button:has-text("Choose file")'); await p.waitForTimeout(2500);
  await p.click('button:has-text("Choose a bank")'); await p.getByText('Example Bank').last().click();
  await p.click('button:has-text("Account statement")');
  await p.click('button:has-text("Continue")'); await p.waitForTimeout(1500);
  for (let i = 0; i < 16; i++) {
    const sug = p.locator('button[aria-label^="Place a suggested"]');
    if (await sug.count()) { await sug.first().click(); await p.waitForTimeout(200); continue; }
    const open = p.locator('button', { hasText: /Marking/ });
    if (await p.locator('.dsheetbg').count()) break; // every section is marked and the section list is open
    if (await open.count()) { await open.first().click(); await p.waitForTimeout(200); }
  }
  await p.keyboard.press('Escape');
  const closeSecs = p.locator('.dsheetbg'); if (await closeSecs.count()) await closeSecs.first().click({ force: true });
  await p.screenshot({ path: '/tmp/e1.png', fullPage: true });
  await p.click('button:has-text("Continue")'); await p.waitForTimeout(4000);
  await p.screenshot({ path: '/tmp/e2.png', fullPage: true });
  if (process.argv[4]) await p.fill('input.fin >> nth=0', process.argv[4]);
  if (process.argv[3] === 'save') { await p.click('button:has-text("Save layout")'); await p.waitForTimeout(700); console.log(await p.locator('[role=status]').allTextContents()); await p.waitForTimeout(1800); await p.screenshot({ path: '/tmp/e3.png', fullPage: true }); }
  console.log(logs.join('\n') || 'ok');
  console.log('checks:', (await p.locator('body').innerText()).match(/Opening[^\n]*closing[^\n]*/g) || 'none shown');
  await b.close();
})();
