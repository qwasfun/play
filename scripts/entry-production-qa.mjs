// Read-only production acceptance. Never start a game or create a guest here.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { beijingDate, dailyGame } from '@playground/game-registry/core';
const { chromium } = createRequire(import.meta.url)('playwright');
const site = 'https://play.185036.xyz',
  api = 'https://play-api.185036.xyz';
const sha = process.env.RELEASE_SHA;
if (!/^[a-f0-9]{40}$/.test(sha || '')) throw Error('验收版本：请指定完整 RELEASE_SHA');
const artifacts = 'output/playwright/entry-production';
await mkdir(artifacts, { recursive: true });
const report = {
  sha,
  checks: [],
  cases: [],
  blockedWrites: 0,
  productionWritesSent: 0,
  physicalPhoneTested: false,
};
const check = (name, value) => {
  if (!value) throw Error(name);
  report.checks.push(name);
};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
});
async function scenario(name, mobile, action) {
  const ctx = await browser.newContext({
    viewport: { width: mobile ? 390 : 1280, height: mobile ? 844 : 900 },
    hasTouch: mobile,
    isMobile: mobile,
    serviceWorkers: 'block',
  });
  await ctx.route(api + '/**', (route) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.continue();
    report.blockedWrites++;
    return route.fulfill({
      status: 403,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': site, 'Access-Control-Allow-Credentials': 'true' },
      body: '{"errors":[{"message":"线上验收仅允许读取"}]}',
    });
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const record = { name, mobile, resources: [], errors: [] };
  const pending = new Map();
  report.cases.push(record);
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.endsWith('.js')) pending.set(r, new URL(r.url()).pathname);
  });
  page.on('requestfinished', (r) => pending.delete(r));
  page.on('requestfailed', (r) => {
    pending.delete(r);
    if (new URL(r.url()).pathname.endsWith('.js'))
      record.resources.push({ path: new URL(r.url()).pathname, error: r.failure()?.errorText });
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && new URL(r.url()).pathname.endsWith('.js'))
      record.resources.push({ path: new URL(r.url()).pathname, status: r.status() });
  });
  page.on('pageerror', (error) => record.errors.push(error.message));
  async function board(mode, level) {
    const button = page.locator('[data-open-board]');
    await button.waitFor();
    check(
      `${name}/${mobile}/${new URL(page.url()).hash}/${mode}/${level || 0}/entry`,
      (await button.count()) === 1,
    );
    if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
    await page.locator('.leaderboard-status').filter({ hasText: '位玩家' }).waitFor();
    if (mode) await page.getByLabel('榜单类型').selectOption(mode);
    if (level) await page.getByLabel('榜单关卡').selectOption(String(level));
    await page
      .locator('.leaderboard-status')
      .filter({ hasText: level ? `第 ${level} 关` : '位玩家' })
      .waitFor();
    check(`${name}/${mobile}/${new URL(page.url()).hash}/${mode}/${level || 0}/read`, true);
    check(
      `${name}/${mobile}/${new URL(page.url()).hash}/${mode}/${level || 0}/layout`,
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
  }
  async function ready() {
    await page.waitForFunction(
      () =>
        document.querySelector('[data-action="start"]') ||
        document.querySelector('[data-retry-module]'),
    );
    const error = await page.locator('[data-retry-module]').count();
    if (error)
      throw Error('游戏资源恢复失败：' + (await page.locator('[role="alert"]').innerText()));
    check(`${name}/${mobile}/${new URL(page.url()).hash}/ready`, true);
  }
  try {
    await action({ page, board, ready });
    check(`${name}/${mobile}/no-runtime-errors`, record.errors.length === 0);
    record.passed = true;
  } catch (error) {
    record.failure = error.message;
    record.pendingResources = [...pending.values()];
    record.url = page.url();
    record.overlay = await page
      .locator('#game-overlay')
      .innerText()
      .catch(() => '');
    await page.screenshot({ path: `${artifacts}/${name}-${mobile}-failure.png`, fullPage: true });
    throw error;
  } finally {
    await ctx.close();
  }
}
try {
  for (const mobile of [false, true]) {
    await scenario('sequence', mobile, async ({ page, board, ready }) => {
      await page.goto(site + '/release.json?verify=' + sha);
      check(`release/${mobile}`, JSON.parse(await page.locator('body').innerText()).sha === sha);
      for (const id of ['tea-grid', 'lights', 'mines', 'windmill', 'jugs', 'star']) {
        console.log('Production sequence:', id, mobile);
        await page.goto(site + '/#/play/' + id);
        await board('total');
        await ready();
        if (id !== 'tea-grid') {
          await page.goto(site + '/#/levels/' + id);
          await board('campaign', 20);
          await page.goto(site + '/#/levels/' + id + '/1?cv=1');
          await board('campaign', 1);
          await ready();
        }
      }
      const date = beijingDate();
      await page.goto(site + '/#/play/' + dailyGame(date) + '?date=' + date + '&v=1');
      await board('daily');
      await ready();
      await page.screenshot({ path: `${artifacts}/daily-${mobile}.png`, fullPage: true });
    });
    for (let attempt = 0; attempt < (mobile ? 5 : 2); attempt++)
      await scenario('cold-' + attempt, mobile, async ({ page, board, ready }) => {
        await page.goto(site + '/#/play/star');
        await board('total');
        await ready();
        await page.screenshot({
          path: `${artifacts}/cold-${mobile}-${attempt}.png`,
          fullPage: true,
        });
      });
  }
  check('zero-production-write-attempts', report.blockedWrites === 0);
  report.passed = true;
} finally {
  await browser.close();
  await writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
}
console.log(
  JSON.stringify({
    passed: true,
    checks: report.checks.length,
    cases: report.cases.length,
    blockedWrites: report.blockedWrites,
    resourceFailures: report.cases.flatMap((item) => item.resources).length,
  }),
);
