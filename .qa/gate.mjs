import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto('http://localhost:8811/lifeprint/index.html?scenario=hard&step=9');
await p.waitForTimeout(500);
const clickAll = async (sel) => { const l = p.locator(sel); const n = await l.count(); for (let i = 0; i < n; i += 1) await l.nth(0).click().catch(()=>{}); return n; };
// try to continue without acknowledging
const cont = p.locator('.step-nav button', { hasText: 'Continue' }).first();
console.log('nav continue count', await cont.count());
if (await cont.count()) { await cont.click(); await p.waitForTimeout(400); }
console.log('step after nav continue:', await p.evaluate(() => window.LifePrint.state.currentStep));
console.log('errors shown:', await p.locator('.err:not([hidden]), .callout.stop h4').allTextContents());
// acknowledge each flag
let clicks = 0;
for (let i = 0; i < 10; i += 1) {
  const btn = p.locator('button', { hasText: 'I have read this and want to continue' }).first();
  if (!(await btn.count())) break;
  await btn.click(); clicks += 1; await p.waitForTimeout(220);
}
console.log('ack clicks', clicks);
console.log('acknowledged in state:', await p.evaluate(() => window.LifePrint.state.safety.acknowledged.length));
await p.screenshot({ path: '/home/user/workspace/qa-shots/gate-hard-acked.png', fullPage: true });
const gen = p.locator('button', { hasText: /Generate my book/ }).first();
console.log('generate button', await gen.count(), await gen.isEnabled().catch(()=>'n/a'));
if (await gen.count()) { await gen.click(); await p.waitForTimeout(600); console.log('step now', await p.evaluate(() => window.LifePrint.state.currentStep)); }
// reconciliation rows
console.log('reconcile rows:', await p.evaluate(() => window.LifePrint.buildRules(window.LifePrint.state).reconciliations.slice(0,3).map(r => JSON.stringify(r))));
await b.close();
