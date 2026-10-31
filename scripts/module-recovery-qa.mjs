import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { playLegacy } from './legacy-playthroughs.mjs';

export async function verifyModuleRecovery({ browser, server, check, mobile }) {
  const map = JSON.parse(await readFile('dist/module-map.json', 'utf8'));
  const asset = (part) => Object.entries(map).find(([path]) => path.endsWith(part))[1].file;
  const engine = asset('/star/src/index.js'),
    campaign = asset('/star/src/campaign.js');
  const artifacts = 'output/playwright/module-recovery';
  await mkdir(artifacts, { recursive: true });
  const reports = [];
  async function scenario(name, target, action) {
    const ctx = await browser.newContext({
      viewport: { width: mobile ? 390 : 1280, height: mobile ? 844 : 900 },
      hasTouch: mobile,
      isMobile: mobile,
      serviceWorkers: 'block',
    });
    await server.route(ctx);
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    const report = { name, mobile, resources: [], errors: [] };
    reports.push(report);
    page.on('requestfailed', (r) => {
      if (new URL(r.url()).pathname.endsWith('.js'))
        report.resources.push({ path: new URL(r.url()).pathname, error: r.failure()?.errorText });
    });
    page.on('response', (r) => {
      if (r.status() >= 400 && new URL(r.url()).pathname.endsWith('.js'))
        report.resources.push({ path: new URL(r.url()).pathname, status: r.status() });
    });
    page.on('pageerror', (error) => report.errors.push(error.message));
    const tap = async (selector) => {
      const el = page.locator(selector);
      await el.scrollIntoViewIfNeeded();
      if (!mobile) return el.click();
      const b = await el.boundingBox();
      await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    };
    try {
      await page.goto(server.origin);
      await action({ page, ctx, tap, report, target });
      check(`module/${mobile}/${name}/no-runtime-errors`, report.errors.length === 0);
      report.passed = true;
    } catch (error) {
      report.failure = error.message;
      report.url = page.url();
      report.overlay = await page
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
    await scenario('first-request-reset', engine, async ({ page, tap, report, target }) => {
      let requests = 0;
      await page.route('**/' + target, (r) =>
        ++requests === 1 ? r.abort('connectionreset') : r.continue(),
      );
      await page.goto(server.origin + '/#/play/star');
      await tap('[data-open-board]');
      await page.locator('.leaderboard-status').filter({ hasText: '位玩家' }).waitFor();
      check(`module/${mobile}/board-independent-of-engine`, true);
      await page.locator('[data-action="start"]').waitFor();
      check(`module/${mobile}/automatic-import-retry`, requests === 2);
      check(
        `module/${mobile}/single-board`,
        (await page.locator('[data-open-board]').count()) === 1,
      );
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      await tap('[data-action="start"]');
      await page.locator('#pause:enabled').waitFor();
      await playLegacy('star', { page, mobile, seed: 42 });
      await page.locator('.rank-result').filter({ hasText: '总榜第 ' }).waitFor();
      await page.locator('.leaderboard-table .is-me').waitFor();
      check(`module/${mobile}/recovered-star-real-win-and-rank`, true);
      report.requests = requests;
    });
    await scenario(
      'permanent-error-manual-retry',
      engine,
      async ({ page, tap, report, target }) => {
        let broken = true,
          requests = 0;
        await page.route('**/' + target, (r) => {
          requests++;
          return broken ? r.abort('connectionreset') : r.continue();
        });
        await page.goto(server.origin + '/#/play/star');
        await page.locator('[data-retry-module]').waitFor();
        check(`module/${mobile}/bounded-failure`, requests === 3);
        check(
          `module/${mobile}/specific-load-error`,
          (await page.getByRole('alert').innerText()).includes('游戏资源：加载失败'),
        );
        await tap('[data-open-board]');
        await page.locator('.leaderboard-status').filter({ hasText: '位玩家' }).waitFor();
        check(`module/${mobile}/failed-game-board-still-readable`, true);
        broken = false;
        await tap('[data-retry-module]');
        await page.locator('[data-action="start"]').waitFor();
        check(`module/${mobile}/manual-retry-without-reload`, requests === 4);
        check(
          `module/${mobile}/manual-retry-single-board`,
          (await page.locator('[data-open-board]').count()) === 1,
        );
        report.requests = requests;
      },
    );
    await scenario('hung-module-navigation', engine, async ({ page, report, target }) => {
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      await page.route('**/' + target, async (r) => {
        await gate;
        await r.continue().catch(() => {});
      });
      try {
        await page.clock.install();
        await page.clock.pauseAt(new Date());
        await page.goto(server.origin + '/#/play/star');
        await page.locator('[data-open-board]').waitFor();
        await page.clock.runFor(12100);
        await page.getByRole('alert').filter({ hasText: '加载超时' }).waitFor();
        check(`module/${mobile}/hung-import-timeout`, true);
        await page.goto(server.origin + '/#/play/lights');
        await page.locator('[data-action="start"]').waitFor();
        release();
        await page.clock.runFor(500);
        check(
          `module/${mobile}/late-import-cannot-replace-new-route`,
          (await page.locator('h1').innerText()).includes('灯塔方阵'),
        );
        await page.goto(server.origin + '/#/play/star');
        await page.locator('[data-action="start"]').waitFor();
        check(
          `module/${mobile}/late-import-reusable-on-reentry`,
          (await page.locator('[data-open-board]').count()) === 1,
        );
        report.boundedMilliseconds = 12000;
      } finally {
        release();
      }
    });
    for (const type of ['levels', 'campaign'])
      await scenario(
        type + '-resource-retry',
        type === 'levels' ? campaign : engine,
        async ({ page, target }) => {
          let requests = 0;
          await page.route('**/' + target, (r) =>
            ++requests === 1 ? r.abort('connectionreset') : r.continue(),
          );
          await page.goto(
            server.origin + '/#/levels/star' + (type === 'campaign' ? '/1?cv=1' : ''),
          );
          await page
            .locator(type === 'levels' ? '.level-grid' : '[data-action="start"]')
            .first()
            .waitFor();
          check(`module/${mobile}/${type}/automatic-retry`, requests === 2);
          check(
            `module/${mobile}/${type}/board-present`,
            (await page.locator('[data-open-board]').count()) === 1,
          );
        },
      );
  } finally {
    await writeFile(`${artifacts}/report-${mobile}.json`, JSON.stringify(reports, null, 2));
  }
}
