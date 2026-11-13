import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { verifyBatch } from './batch-2026-10-27-qa.js';
const require = createRequire(import.meta.url),
  { chromium } = require('playwright');
await mkdir('output/playwright', { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
});
const summary = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: { width: mobile ? 390 : 1280, height: mobile ? 844 : 900 },
      hasTouch: mobile,
      isMobile: mobile,
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    try {
      summary.push({ mobile, ...(await verifyBatch(page, { mobile })) });
    } catch (e) {
      console.log('FAILURE DOM', await page.locator('body').innerText());
      await page.screenshot({ path: `output/playwright/failure-${mobile}.png`, fullPage: true });
      throw e;
    } finally {
      await context.close();
    }
  }
  console.log(JSON.stringify(summary));
  await writeFile('output/playwright/batch-results.json', JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}
