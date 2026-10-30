import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { games, leaderboardPolicy } from '@playground/game-registry';
import { startQaServer } from './qa-server.mjs';
import { verifyBatch } from './batch-2026-10-28-qa.js';
import { generateMines } from '../games/mines/src/index.js';
import { legacyScenarioIds, playLegacy } from './legacy-playthroughs.mjs';

const require = createRequire(import.meta.url),
  { chromium } = require('playwright');
const artifacts = 'output/playwright',
  report = { checks: [], errors: [], rankings: [], games: games.map((game) => game.id) };
await mkdir(artifacts, { recursive: true });
const base = process.env.QA_BASE_SHA,
  head = process.env.QA_HEAD_SHA || 'HEAD';
const localOnly = games.filter((game) => !leaderboardPolicy(game.id).normal).map((game) => game.id);
const changed = [
  ...new Set(
    execFileSync('git', ['diff', '--name-only', ...(base ? [base, head] : ['HEAD'])], {
      encoding: 'utf8',
    })
      .split('\n')
      .flatMap((path) => path.match(/^games\/([^/]+)\//)?.[1] ?? []),
  ),
];
const server = await startQaServer();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
  args: process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
});
const check = (name, value) => {
  if (!value) throw Error(name);
  report.checks.push(name);
};
async function context(mobile, serviceWorkers = 'block') {
  const context = await browser.newContext({
    viewport: { width: mobile ? 390 : 1280, height: mobile ? 844 : 900 },
    hasTouch: mobile,
    isMobile: mobile,
    serviceWorkers,
  });
  await server.route(context);
  // Ranked runs use the fixture backend seed; local-only games need the same
  // deterministic browser seed so their real input scenarios describe the board.
  await context.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (values) =>
      values instanceof Uint32Array && values.length === 1
        ? ((values[0] = 42), values)
        : original(values);
  });
  context.on('page', (page) => page.on('pageerror', (error) => report.errors.push(error.message)));
  return context;
}
async function smoke(mobile) {
  const ctx = await context(mobile),
    page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  try {
    for (const game of games) {
      await page.goto(server.origin + '/#/play/' + game.id);
      await page.locator('[data-action="start"]').click();
      await page.locator('#pause:enabled').waitFor();
      await page.locator('#pause').click();
      check(
        `${game.id}/${mobile ? 'touch' : 'desktop'}/pause`,
        await page.locator('[data-action="resume"]').isVisible(),
      );
      for (const size of [
        { width: 390, height: 844 },
        { width: 844, height: 390 },
      ]) {
        await page.setViewportSize(size);
        check(
          `${game.id}/${mobile}/${size.width}/layout`,
          await page.locator('#game-canvas').evaluate((element) => {
            const box = element.getBoundingClientRect();
            return box.width > 100 && box.left >= 0 && box.right <= innerWidth + 1;
          }),
        );
      }
      await page.locator('#restart').click();
      await page.locator('[data-action="again"]').click();
      await page.locator('#pause:enabled').waitFor();
      check(`${game.id}/${mobile}/restart`, !(await page.locator('.result-card').isVisible()));
    }
  } finally {
    await ctx.close();
  }
}
async function playChanged(mobile) {
  const legacy = changed.filter((id) => ['windmill', 'courier', 'weave', 'jugs'].includes(id));
  if (!changed.length || legacy.length) {
    const ctx = await context(mobile),
      page = await ctx.newPage();
    try {
      await verifyBatch(page, {
        mobile,
        base: server.origin,
        artifacts,
        ids: changed.length ? legacy : undefined,
      });
      report.checks.push(`complete legacy playthroughs/${mobile}`);
    } catch (error) {
      console.error(
        'Playthrough failure:',
        await page
          .locator('.result-card')
          .innerText()
          .catch(() => error.message),
      );
      await page.screenshot({ path: `${artifacts}/failure-${mobile}.png`, fullPage: true });
      throw error;
    } finally {
      await ctx.close();
    }
  }
  for (const id of changed.filter((id) => !legacy.includes(id))) {
    const scenario = resolve(`games/${id}/qa/playthrough.mjs`);
    let play;
    try {
      await access(scenario);
      ({ play } = await import(pathToFileURL(scenario)));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (!legacyScenarioIds.includes(id))
        throw Error(
          `游戏 ${id}：请提供 qa/playthrough.mjs，使用真实桌面及触屏输入完成游戏，不得直接触发结算`,
          { cause: error },
        );
      play = (options) => playLegacy(id, options);
    }
    if (typeof play !== 'function')
      throw Error(`游戏 ${id}：验收文件必须导出 play({page,mobile,point,seed})`);
    const ctx = await context(mobile),
      page = await ctx.newPage();
    try {
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      await page.goto(server.origin + '/#/play/' + id);
      await page.locator('[data-action="start"]').click();
      await page.locator('#pause:enabled').waitFor();
      const point = async (x, y) => {
        const canvas = page.locator('#game-canvas');
        await canvas.scrollIntoViewIfNeeded();
        const box = await canvas.boundingBox();
        const width = games.find((game) => game.id === id).canvas?.width || 600,
          height = games.find((game) => game.id === id).canvas?.height || 480;
        const px = box.x + (x / width) * box.width,
          py = box.y + (y / height) * box.height;
        if (mobile) await page.touchscreen.tap(px, py);
        else await page.mouse.click(px, py);
      };
      try {
        await play({ page, mobile, point, seed: 42 });
      } catch (error) {
        await page.screenshot({
          path: `${artifacts}/${id}-${mobile ? 'touch' : 'desktop'}-failure.png`,
          fullPage: true,
        });
        throw new Error(`游戏 ${id} / ${mobile ? '触屏' : '桌面'}：${error.message}`, {
          cause: error,
        });
      }
      await page.locator('.result-card').waitFor();
      if (!localOnly.includes(id))
        await page.locator('.rank-result').filter({ hasText: '第 ' }).waitFor();
      check(`${id}/${mobile}/completed${localOnly.includes(id) ? '-local' : '-and-ranked'}`, true);
      await page.screenshot({
        path: `${artifacts}/${id}-${mobile ? 'touch' : 'desktop'}-ranked.png`,
      });
      await page.reload();
      await page.locator('[data-action="start"]').waitFor();
      check(
        `${id}/${mobile}/saved`,
        await page.evaluate(
          (id) => !!JSON.parse(localStorage.getItem('tiny-break-arcade:v1') || '{}').best?.[id],
          id,
        ),
      );
      console.log('PASS complete ordinary playthrough', id, mobile ? 'touch' : 'desktop');
    } finally {
      await ctx.close();
    }
  }
}
async function ranking(mobile, recover = false) {
  const ctx = await context(mobile),
    page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  try {
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    if (recover) {
      let first = true;
      await page.route('**/v1/runs/*/result', async (route) => {
        if (!first) return route.fallback();
        first = false;
        await route.fulfill({
          status: 503,
          headers: {
            'Access-Control-Allow-Origin': server.origin,
            'Access-Control-Allow-Credentials': 'true',
          },
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [
              {
                field: 'service',
                code: 'unavailable',
                message: '排行榜：服务暂时不可用，请稍后重试',
              },
            ],
          }),
        });
      });
    }
    await page.goto(server.origin + '/#/play/mines');
    const started = page.waitForResponse(
      (response) => response.url().endsWith('/v1/runs') && response.request().method() === 'POST',
    );
    await page.locator('[data-action="start"]').click();
    const run = await (await started).json();
    await page.locator('#pause:enabled').waitFor();
    await page.locator('[data-open-board]').click();
    await page.locator('.leaderboard-status').filter({ hasText: '位玩家' }).waitFor();
    const mines = generateMines(run.run.seed).mines;
    const submitted = page.waitForResponse((response) =>
      response.url().endsWith(`/runs/${run.run.id}/result`),
    );
    for (let cell = 0; cell < 16; cell++) {
      if (mines.includes(cell) || (await page.locator('.result-card').isVisible())) continue;
      const canvas = page.locator('#game-canvas');
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox(),
        x = box.x + ((156 + (cell % 4) * 96) / 600) * box.width,
        y = box.y + ((96 + Math.floor(cell / 4) * 96) / 480) * box.height;
      if (mobile) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
    }
    let response = await submitted;
    if (recover) {
      check(`mines/${mobile}/temporary-submit-failure`, response.status() === 503);
      await page.locator('.rank-result').filter({ hasText: '自动重试' }).waitFor();
      await page
        .locator('.submission-notice')
        .filter({ hasText: '排行榜：服务暂时不可用' })
        .waitFor();
      check(`mines/${mobile}/specific-submit-error-visible`, true);
      check(
        `mines/${mobile}/pending-notice-layout`,
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      );
      await page.screenshot({
        path: `${artifacts}/pending-${mobile ? 'touch' : 'desktop'}.png`,
        fullPage: true,
      });
      check(
        `mines/${mobile}/durable-pending-result`,
        await page.evaluate(() =>
          Object.keys(localStorage).some((key) =>
            key.startsWith('tiny-break-arcade:pending-result:v1:'),
          ),
        ),
      );
      await page.reload();
      await page.locator('[data-open-board]').click();
      await page.locator('.leaderboard-status').filter({ hasText: '位玩家' }).waitFor();
      const retried = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/runs/${run.run.id}/result`) && response.status() === 200,
      );
      await page.clock.runFor(2500);
      response = await retried;
      await page.waitForFunction(
        () =>
          !Object.keys(localStorage).some((key) =>
            key.startsWith('tiny-break-arcade:pending-result:v1:'),
          ),
      );
      check(
        `mines/${mobile}/pending-cleared-after-reload`,
        await page.evaluate(
          () =>
            !Object.keys(localStorage).some((key) =>
              key.startsWith('tiny-break-arcade:pending-result:v1:'),
            ),
        ),
      );
    }
    const receipt = await response.json();
    check(
      `mines/${mobile}/real-accepted-result`,
      response.status() === 200 && !!receipt.accepted && !!receipt.eligible,
    );
    if (!recover) await page.locator('.rank-result').filter({ hasText: '第 ' }).waitFor();
    await page.locator('.leaderboard-table .is-me').waitFor();
    check(`mines/${mobile}/${recover ? 'recovered' : 'live'}-automatic-board-refresh`, true);
    const duplicate = await page.evaluate(async (id) => {
      const response = await fetch(`http://127.0.0.1:8787/v1/runs/${id}/result`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      return { status: response.status, data: await response.json() };
    }, run.run.id);
    check(
      `mines/${mobile}/idempotent-retry`,
      duplicate.status === 200 && JSON.stringify(duplicate.data) === JSON.stringify(receipt),
    );
    await page.reload();
    await page.locator('[data-open-board]').click();
    await page.locator('.leaderboard-table .is-me').waitFor();
    check(`mines/${mobile}/rank-persists-after-refresh`, true);
    await page.screenshot({
      path: `${artifacts}/isolated-ranking-${mobile ? 'touch' : 'desktop'}.png`,
      fullPage: true,
    });
  } finally {
    await ctx.close();
  }
}
try {
  for (const mobile of [false, true]) {
    await smoke(mobile);
    await playChanged(mobile);
    await ranking(mobile);
    await ranking(mobile, true);
  }
  const ctx = await context(false, 'allow'),
    page = await ctx.newPage();
  try {
    await page.goto(server.origin);
    const legacyQa = vm.runInThisContext(await readFile('scripts/pwa-qa.js', 'utf8'), {
      filename: 'pwa-qa.js',
    });
    report.offline = await legacyQa(page);
    report.checks.push('offline direct routes, cached games and saved scores');
  } finally {
    await ctx.close();
  }
  report.rankings = server.db.db
    .prepare('SELECT game_id,COUNT(*) AS entries FROM best_entries GROUP BY game_id')
    .all();
  for (const id of ['mines', ...changed.filter((id) => !localOnly.includes(id))])
    check(
      `${id}/isolated-sql-ranking`,
      report.rankings.some((row) => row.game_id === id && row.entries > 0),
    );
  check('no runtime errors', report.errors.length === 0);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.message;
  throw error;
} finally {
  await writeFile(`${artifacts}/game-verification.json`, JSON.stringify(report, null, 2));
  await browser.close();
  await server.close();
}
console.log(
  JSON.stringify({
    passed: true,
    checks: report.checks.length,
    changed,
    ranked: report.rankings.map((row) => row.game_id),
  }),
);
