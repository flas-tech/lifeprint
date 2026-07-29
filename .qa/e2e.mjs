import { chromium } from 'playwright';
import fs from 'fs';
const scenario = process.argv[2] || 'demo';
const OUT = '/home/user/workspace/qa-shots';
const DL = '/home/user/workspace/qa-downloads';
fs.mkdirSync(DL, { recursive: true });
const log = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') log.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => log.push(`pageerror: ${e.message}`));

await page.goto(`http://localhost:8811/lifeprint/index.html?scenario=${scenario}&step=0`);
await page.waitForTimeout(400);

// walk steps 0..9 using the in-app forward nav
for (let i = 0; i < 10; i += 1) {
  const nav = page.locator('.step-nav button, .step-body button').filter({ hasText: /Continue|Next|→|Start|Review/ }).first();
  const before = await page.evaluate(() => window.LifePrint.state.currentStep);
  if (await nav.count()) await nav.click().catch(() => {});
  await page.waitForTimeout(320);
  const after = await page.evaluate(() => window.LifePrint.state.currentStep);
  log.push(`nav ${before} -> ${after}`);
  if (after >= 9) break;
  if (after === before) { await page.evaluate((n) => window.LifePrint.go(n + 1, { validate: false }), before); await page.waitForTimeout(300); }
}

// step 9 safety: acknowledge everything, then continue
await page.evaluate(() => window.LifePrint.go(9, { validate: false }));
await page.waitForTimeout(350);
const ackBoxes = page.locator('.step-body input[type="checkbox"]');
const n = await ackBoxes.count();
for (let i = 0; i < n; i += 1) await ackBoxes.nth(i).check().catch(() => {});
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}/e2e-${scenario}-s09-acked.png`, fullPage: true });
log.push(`safety checkboxes: ${n}`);

// step 10 generate
await page.evaluate(() => window.LifePrint.go(10, { validate: false }));
await page.waitForTimeout(300);
await page.locator('button').filter({ hasText: /Start building|Rebuild the book/ }).first().click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/e2e-${scenario}-s10-built.png`, fullPage: true });
const stats = await page.evaluate(() => {
  const b = window.LifePrint.state.book;
  return b ? { chapters: b.chapters.length, days: b.stats.mealPlanDays, checks: b.validation.checks.length, pass: b.validation.passed, warn: b.validation.warned, fail: b.validation.failed } : null;
});
log.push(`book: ${JSON.stringify(stats)}`);

// step 11 editor: edit a paragraph + regenerate one
await page.locator('button').filter({ hasText: 'Open the book editor' }).first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/e2e-${scenario}-s11-editor.png`, fullPage: true });
const firstEdit = page.locator('.blk button', { hasText: 'Edit' }).first();
if (await firstEdit.count()) {
  await firstEdit.click({ force: true });
  await page.waitForTimeout(300);
  await page.locator('.modal textarea').fill('QA edit: this paragraph was replaced by hand to prove edits persist through a rebuild.');
  await page.locator('.modal button', { hasText: 'Save' }).click();
  await page.waitForTimeout(700);
  const kept = await page.evaluate(() => JSON.stringify(Object.keys(window.LifePrint.state.book.edits || {})));
  log.push(`edits after save: ${kept}`);
}
const regen = page.locator('.blk button').filter({ hasText: /^Regenerate/ }).first();
if (await regen.count()) { await regen.click({ force: true }); await page.waitForTimeout(700); log.push('regenerated a paragraph'); }
await page.screenshot({ path: `${OUT}/e2e-${scenario}-s11-edited.png`, fullPage: true });

// step 12 export
await page.locator('button').filter({ hasText: 'Validate & export' }).first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/e2e-${scenario}-s12-export.png`, fullPage: true });
for (const label of ['Download standard pdf', 'Download printer-friendly', 'Download mobile reading']) {
  const btn = page.locator('button', { hasText: new RegExp(label, 'i') }).first();
  if (!(await btn.count())) { log.push(`missing button: ${label}`); continue; }
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }).catch(() => null), btn.click()]);
  if (!dl) { log.push(`no download for ${label}`); continue; }
  const name = dl.suggestedFilename();
  await dl.saveAs(`${DL}/${scenario}-${name}`);
  log.push(`downloaded ${name}`);
  await page.waitForTimeout(500);
}
await page.screenshot({ path: `${OUT}/e2e-${scenario}-s12-after.png`, fullPage: true });
console.log(log.join('\n'));
await browser.close();
