import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 375, height: 812 } });
await p.goto('http://localhost:8811/lifeprint/index.html?scenario=demo&step=8');
await p.waitForTimeout(500);
const bad = await p.evaluate(() => [...document.querySelectorAll('*')]
  .filter((e) => e.getBoundingClientRect().right > 377)
  .slice(0, 12)
  .map((e) => `${e.tagName}.${e.className}`.slice(0, 90) + ' -> ' + Math.round(e.getBoundingClientRect().right)));
console.log(bad.join('\n'));
await b.close();
