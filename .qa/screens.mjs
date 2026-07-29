import { chromium } from 'playwright';
const BASE = 'http://localhost:8811/lifeprint/index.html';
const OUT = '/home/user/workspace/qa-shots';
const scenario = process.argv[2] || 'demo';
const widths = [[1280, 900, 'desk'], [375, 812, 'mob']];
const errors = [];
const browser = await chromium.launch();
for (const [w, h, tag] of widths) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${tag}] console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  for (let step = 0; step <= 12; step += 1) {
    await page.goto(`${BASE}?scenario=${scenario}&step=${step}`, { waitUntil: 'load' });
    await page.waitForTimeout(step === 10 ? 500 : 350);
    if (step === 10) {
      const btn = page.locator('button:has-text("Start building"), button:has-text("Rebuild the book")').first();
      if (await btn.count()) { await btn.click(); await page.waitForTimeout(1500); }
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 2) errors.push(`[${tag}] step ${step}: horizontal overflow ${overflow}px`);
    await page.screenshot({ path: `${OUT}/${scenario}-${tag}-s${String(step).padStart(2, '0')}.png`, fullPage: true });
  }
  await page.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'CLEAN');
