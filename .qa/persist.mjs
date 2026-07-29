// QA: localStorage resume, reset, JSON export/import, version restore + clean sample PDF.
import { chromium } from 'playwright';
import fs from 'fs';
const DL = '/home/user/workspace/qa-downloads';
const OUT = '/home/user/workspace/qa-shots';
fs.mkdirSync(DL, { recursive: true });
const log = [];
const errs = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
const st = () => page.evaluate(() => {
  const s = window.LifePrint.state;
  return {
    step: s.currentStep,
    name: (s.profile || {}).firstName,
    chapters: s.book ? s.book.chapters.length : null,
    versions: (s.versions || []).map((v) => ({ chapters: v.chapters, restorable: !!v.snapshot })),
    bytes: (localStorage.getItem('lifeprint.v1') || '').length,
  };
});

// ---- build a clean demo book (no manual edits) -------------------------------
await page.goto('http://localhost:8811/lifeprint/index.html?scenario=demo&step=9');
await page.waitForTimeout(500);
const boxes = page.locator('.step-body input[type="checkbox"]');
for (let i = 0; i < (await boxes.count()); i += 1) await boxes.nth(i).check().catch(() => {});
await page.evaluate(() => window.LifePrint.go(10, { validate: false }));
await page.waitForTimeout(300);
await page.locator('button').filter({ hasText: /Start building|Rebuild the book/ }).first().click();
await page.waitForTimeout(2600);
log.push(`built: ${JSON.stringify(await st())}`);

// ---- resume across reload ---------------------------------------------------
await page.goto('http://localhost:8811/lifeprint/index.html');
await page.waitForTimeout(700);
const resumed = await st();
log.push(`after reload: ${JSON.stringify(resumed)}`);
if (!resumed.name || !resumed.chapters) errs.push('RESUME FAILED: state or book lost on reload');

// ---- clean sample PDF -------------------------------------------------------
await page.evaluate(() => window.LifePrint.go(12, { validate: false }));
await page.waitForTimeout(900);
const btn = page.locator('button', { hasText: /Download standard pdf/i }).first();
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), btn.click()]);
await dl.saveAs('/home/user/workspace/lifeprint-sample-book.pdf');
log.push(`sample pdf saved from ${dl.suggestedFilename()}`);

// ---- JSON export ------------------------------------------------------------
await page.evaluate(() => window.LifePrint.openMenu());
await page.waitForTimeout(400);
const [jdl] = await Promise.all([
  page.waitForEvent('download', { timeout: 20000 }),
  page.locator('.modal button', { hasText: 'Export answers (JSON)' }).click(),
]);
const jsonPath = `${DL}/answers.json`;
await jdl.saveAs(jsonPath);
log.push(`json exported: ${jdl.suggestedFilename()} (${fs.statSync(jsonPath).size} bytes)`);

// ---- second draft, then restore the earlier one ------------------------------
await page.keyboard.press('Escape');
await page.evaluate(() => {
  window.LifePrint.setState((s) => { s.bookPrefs.chapters = s.bookPrefs.chapters.map((c, i) => (i > 27 ? { ...c, on: false } : c)); });
  window.LifePrint.go(10, { validate: false });
});
await page.waitForTimeout(400);
await page.locator('button').filter({ hasText: /Start building|Rebuild the book/ }).first().click();
await page.waitForTimeout(2600);
const two = await st();
log.push(`second draft: ${JSON.stringify(two)}`);
await page.evaluate(() => window.LifePrint.openMenu());
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/persist-versions.png`, fullPage: true });
const restoreBtn = page.locator('.modal button', { hasText: 'Restore' }).first();
log.push(`restore buttons: ${await page.locator('.modal button', { hasText: 'Restore' }).count()}`);
await restoreBtn.click();
await page.waitForTimeout(400);
await page.locator('.modal button', { hasText: 'Restore this draft' }).click();
await page.waitForTimeout(1200);
const restored = await st();
log.push(`after restore: ${JSON.stringify(restored)}`);
if (restored.chapters !== two.versions[1].chapters) errs.push(`RESTORE FAILED: got ${restored.chapters}, expected ${two.versions[1].chapters}`);

// ---- reset ------------------------------------------------------------------
await page.evaluate(() => window.LifePrint.openMenu());
await page.waitForTimeout(400);
await page.locator('.modal button', { hasText: 'Reset all data' }).click();
await page.waitForTimeout(300);
await page.locator('.modal button', { hasText: 'Erase and start over' }).click();
await page.waitForTimeout(700);
const cleared = await st();
log.push(`after reset: ${JSON.stringify(cleared)}`);
if (cleared.name || cleared.chapters || cleared.step !== 0) errs.push('RESET FAILED: data survived');

// ---- import ----------------------------------------------------------------
await page.evaluate(() => window.LifePrint.openMenu());
await page.waitForTimeout(400);
await page.setInputFiles('#import-json', jsonPath);
await page.waitForTimeout(1200);
const imported = await st();
log.push(`after import: ${JSON.stringify(imported)}`);
if (!imported.name) errs.push('IMPORT FAILED: profile not restored');
await page.screenshot({ path: `${OUT}/persist-imported.png`, fullPage: true });

console.log(log.join('\n'));
console.log(errs.length ? `\nPROBLEMS:\n${errs.join('\n')}` : '\nPERSISTENCE QA CLEAN');
await browser.close();
