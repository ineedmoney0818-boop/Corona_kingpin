const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1080/390, colorScheme: 'dark', isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  for (const [name, path] of [['home','/'],['pricing','/pricing'],['signup','/sign-up']]) {
    await p.goto('https://coronakingpin-web.vercel.app' + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    await p.screenshot({ path: `shots/${name}.png`, fullPage: true });
  }
  await b.close();
})();
