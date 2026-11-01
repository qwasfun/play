import assert from 'node:assert/strict';
import { beijingDate, dailyGame, dailySeed, playLink } from '@playground/game-registry/core';
import { campaign } from '../games/lights/src/campaign.js';
import { playLegacy } from './legacy-playthroughs.mjs';

const site = 'https://play.185036.xyz',
  api = 'https://play-api.185036.xyz',
  stats = 'https://um.185036.xyz';
// This mock exercises the real tracker callback API without sending any data
// outside the fixture. In particular, default URL/title must be overridden.
const tracker = `window.umami = { track: build => fetch('${stats}/api/send', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'event', payload: build({
    website: 'default', url: 'stale', title: 'stale', screen: '1280x900', language: 'zh-CN'
  }) })
}).then(response => { if (!response.ok) throw Error('collector unavailable'); }) };`;

async function waitFor(predicate) {
  const until = Date.now() + 10000;
  while (!predicate()) {
    if (Date.now() > until) throw Error('统计验收：等待模拟采集超时');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

export async function verifyAnalytics({ browser, server, check, mobile }) {
  const events = [],
    unexpected = [];
  let scripts = 0,
    failCollector = false,
    failScript = false;
  const ctx = await browser.newContext({
    viewport: { width: mobile ? 390 : 1280, height: mobile ? 844 : 900 },
    hasTouch: mobile,
    isMobile: mobile,
    serviceWorkers: 'block',
  });
  // All production-looking URLs below are fulfilled locally. No request to
  // either the production leaderboard or the real collector can escape.
  await ctx.route('**/*', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin === stats) {
      if (url.pathname === '/script.js') {
        scripts++;
        return failScript
          ? route.abort()
          : route.fulfill({ contentType: 'application/javascript', body: tracker });
      }
      assert.equal(url.pathname, '/api/send');
      events.push(request.postDataJSON().payload);
      return route.fulfill({
        status: failCollector ? 503 : 200,
        contentType: 'application/json',
        body: '{}',
      });
    }
    if (url.origin === site || url.origin === api) {
      const backend = url.origin === api;
      const response = await route.fetch({
        url: server.origin + (backend ? '/__api' : '') + url.pathname + url.search,
        headers: { ...request.headers(), ...(backend ? { origin: server.origin } : {}) },
      });
      return route.fulfill({
        response,
        headers: {
          ...response.headers(),
          ...(backend ? { 'access-control-allow-origin': site } : {}),
        },
      });
    }
    if (url.origin === server.origin) return route.continue();
    unexpected.push(request.url());
    return route.abort();
  });
  const page = await ctx.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  const views = () => events.filter((event) => !event.name);
  const finishes = (mode) =>
    events.filter((event) => event.name === 'game_finish' && event.data.mode === mode);
  async function go(hash) {
    const before = views().length;
    await page.evaluate((hash) => {
      location.hash = hash;
    }, hash);
    await waitFor(() => views().length === before + 1);
  }
  async function start() {
    await page.locator('[data-action="start"]').click();
    await page.locator('#pause:enabled').waitFor();
  }
  try {
    await page.goto(server.origin);
    assert.equal(scripts, 0);
    assert.equal(events.length, 0);
    check(`analytics/${mobile}/local-disabled`, true);

    await page.goto(site + '/#/');
    await waitFor(() => views().length === 1);
    await go('#/favorites');
    await page.goBack();
    await waitFor(() => views().length === 3);
    await page.goForward();
    await waitFor(() => views().length === 4);
    await go('#/');
    await page.evaluate(() => {
      location.hash = '#games';
    });
    await page.waitForTimeout(100);
    assert.equal(views().length, 5);
    await go('#/daily');
    assert.match(views().at(-1).url, /\/#\/play\//);
    assert.ok(!views().at(-1).url.includes('#/daily'));
    assert.notEqual(views().at(-1).title, 'stale');
    assert.equal(scripts, 1);
    check(`analytics/${mobile}/hash-history-anchor-and-daily-redirect`, true);

    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await go('#/play/lights');
    await start();
    await playLegacy('lights', { page, mobile, seed: 42 });
    await page.locator('.result-card').waitFor();
    await waitFor(() => finishes('normal').length === 1);

    let date;
    for (let days = 0; days < 365; days++) {
      const candidate = new Date(Date.parse(beijingDate() + 'T12:00:00Z') - days * 86400000)
        .toISOString()
        .slice(0, 10);
      if (dailyGame(candidate) === 'lights') {
        date = candidate;
        break;
      }
    }
    assert.ok(date, 'daily lights fixture exists');
    await go(playLink('lights', date));
    await start();
    await playLegacy('lights', { page, mobile, seed: dailySeed(date, 'lights') });
    await page.locator('.result-card').waitFor();
    await waitFor(() => finishes('daily').length === 1);

    await go('#/levels/lights/1?cv=1');
    await start();
    const level = campaign.levels[0];
    for (const cell of level.solution) {
      await page.locator('#game-canvas').scrollIntoViewIfNeeded();
      const box = await page.locator('#game-canvas').boundingBox();
      const x = box.x + ((20 + (((cell % level.size) + 0.5) * 560) / level.size) * box.width) / 600;
      const y =
        box.y +
        ((20 + ((Math.floor(cell / level.size) + 0.5) * 560) / level.size) * box.height) / 600;
      if (mobile) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
      await page.clock.runFor(34);
    }
    await page.locator('.result-card').waitFor();
    await waitFor(() => finishes('campaign').length === 1);
    assert.equal(finishes('campaign')[0].data.level, 1);
    assert.equal(finishes('campaign')[0].data.campaign_version, 1);
    assert.equal(finishes('campaign')[0].data.won, true);
    for (const mode of ['normal', 'daily', 'campaign']) {
      assert.equal(
        events.filter((event) => event.name === 'game_start' && event.data.mode === mode).length,
        1,
      );
      assert.equal(finishes(mode).length, 1);
    }
    check(`analytics/${mobile}/real-normal-daily-campaign-playthroughs`, true);

    failCollector = true;
    await go('#/play/lights');
    await start();
    await playLegacy('lights', { page, mobile, seed: 42 });
    await page.locator('.result-card').waitFor();
    await waitFor(() => finishes('normal').length === 2);
    check(`analytics/${mobile}/collector-failure-does-not-block-play`, true);

    failScript = true;
    const before = events.length;
    await page.reload();
    await start();
    await playLegacy('lights', { page, mobile, seed: 42 });
    await page.locator('.result-card').waitFor();
    assert.equal(events.length, before);
    assert.equal(errors.length, 0);
    assert.equal(unexpected.length, 0);
    assert.ok(events.every((event) => event.website === 'bb63e651-8401-482f-84dc-3beff0aac59e'));
    check(`analytics/${mobile}/script-failure-no-errors-no-external-requests`, true);
  } finally {
    await ctx.close();
  }
}
