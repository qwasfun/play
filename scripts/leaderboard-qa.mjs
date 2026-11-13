import { games } from '@playground/game-registry';
import { recordLevel } from '@playground/game-sdk/level-proof';
import { playLevel } from './campaigns/replay.mjs';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const campaignSolutions = JSON.parse(
  readFileSync(new URL('../tests/fixtures/new-campaign-solutions.json', import.meta.url)),
);
async function levelResult(id, number) {
  const [{ createGame }, { campaign }] = await Promise.all([
    import(`../games/${id}/src/index.js`),
    import(`../games/${id}/src/campaign.js`),
  ]);
  const level = campaign.levels[number - 1];
  let result;
  const engine = recordLevel(createGame, {
    level,
    seed: 0,
    onFinish: (r) => {
      result = r;
    },
  });
  const tap = (cell) => {
    const p = {
      x: 20 + (((cell % level.size) + 0.5) * 560) / level.size,
      y: 20 + ((Math.floor(cell / level.size) + 0.5) * 560) / level.size,
    };
    engine.input('primary-down', p);
    engine.input('primary-up', p);
  };
  if (id === 'boxes')
    for (const dir of level.solution)
      engine.input('key-down', {
        key: { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' }[dir],
      });
  else if (['lights', 'slide'].includes(id)) for (const cell of level.solution) tap(cell);
  else if (id === 'pipes')
    level.solution.forEach((turns, cell) => {
      for (let i = 0; i < turns; i++) tap(cell);
    });
  else if (id === 'mines')
    for (const { cell, kind } of level.solution) {
      if (kind === 'flag') continue;
      tap(cell);
    }
  else playLevel(id, level, engine, campaignSolutions[id]?.[number - 1]);
  engine.destroy();
  assert.equal(result?.won, true, `${id}/${number}`);
  return result;
}

export async function verifyLeaderboardFlows({ browser, server, check, mobile }) {
  const ctx = await browser.newContext({
    viewport: { width: mobile ? 390 : 1280, height: mobile ? 844 : 900 },
    hasTouch: mobile,
    isMobile: mobile,
    serviceWorkers: 'block',
  });
  await server.route(ctx);
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    let reads = 0,
      writes = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST') writes++;
    });
    await page.route('**/v1/leaderboards?**', async (route) => {
      reads++;
      if (reads === 1) return route.abort('failed');
      if (reads === 2) await new Promise((resolve) => setTimeout(resolve, 3000));
      return route.fallback();
    });
    await page.goto(server.origin + '/#/play/lights');
    await page.locator('[data-open-board]').click();
    await page.locator('.leaderboard-status').filter({ hasText: '位玩家' }).waitFor();
    check('board/' + mobile + '/transient-retry-and-three-second-response', reads === 2);
    check('board/' + mobile + '/reads-create-no-identity', writes === 0);
    await page.unroute('**/v1/leaderboards?**');
    await page.goto(server.origin);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    for (const game of games.filter((g) => g.campaign)) {
      console.log('Campaign ranking QA:', game.id, mobile ? 'touch' : 'desktop');
      const result = await levelResult(game.id, 1),
        proof = result.levelProof;
      await page.goto(server.origin + '/#/levels/' + game.id + '/1?cv=1');
      await page.locator('[data-action="start"]').click();
      await page.locator('#game-overlay').waitFor({ state: 'hidden' });
      if (game.id === 'bounce') {
        await page.evaluate(() => {
          const canvas = document.querySelector('canvas'),
            ctx = canvas.getContext('2d'),
            arc = ctx.arc;
          let previous,
            falling = false,
            bounces = 0,
            pressed = false;
          ctx.arc = function (x, y, r, ...rest) {
            if (r === 8) {
              if (previous) {
                const dx = x - previous.x,
                  dy = y - previous.y;
                if (dx || dy) {
                  if (dy < 0 && falling) bounces++;
                  if (dy) falling = dy > 0;
                  let target = x;
                  if (dy > 0) {
                    const landing = x + ((418 - y) * dx) / dy,
                      phase = (((landing - 30) % 1080) + 1080) % 1080;
                    target =
                      30 +
                      (phase <= 540 ? phase : 1080 - phase) -
                      Math.sin(bounces * 2.399 + 1) * 25;
                  }
                  target = Math.max(78, Math.min(522, target));
                  const b = canvas.getBoundingClientRect();
                  canvas.dispatchEvent(
                    new PointerEvent(pressed ? 'pointermove' : 'pointerdown', {
                      pointerId: 1,
                      pointerType: 'mouse',
                      isPrimary: true,
                      button: 0,
                      buttons: 1,
                      clientX: b.x + (target / 600) * b.width,
                      clientY: b.y + (430 / canvas.height) * b.height,
                      bubbles: true,
                      cancelable: true,
                    }),
                  );
                  pressed = true;
                }
              }
              previous = { x, y };
            }
            return arc.call(this, x, y, r, ...rest);
          };
        });
        for (let t = 0; t < 180 && !(await page.locator('.result-card').isVisible()); t++)
          await page.clock.runFor(1000);
      } else {
        await page.evaluate(
          ({ proof, mobile }) => {
            const canvas = document.querySelector('canvas');
            for (const [tick, type, payload] of proof.events)
              setTimeout(
                () => {
                  if (type.startsWith('key-')) {
                    canvas.dispatchEvent(
                      new KeyboardEvent(type === 'key-down' ? 'keydown' : 'keyup', {
                        key: payload.key,
                        bubbles: true,
                        cancelable: true,
                      }),
                    );
                    if (type === 'key-down')
                      canvas.dispatchEvent(
                        new KeyboardEvent('keyup', {
                          key: payload.key,
                          bubbles: true,
                          cancelable: true,
                        }),
                      );
                  } else if (type === 'undo') {
                    document.querySelector('#undo')?.click();
                  } else {
                    const b = canvas.getBoundingClientRect();
                    canvas.dispatchEvent(
                      new PointerEvent(
                        {
                          'primary-down': 'pointerdown',
                          'primary-up': 'pointerup',
                          'primary-move': 'pointermove',
                          'primary-cancel': 'pointercancel',
                        }[type],
                        {
                          pointerId: 1,
                          pointerType: mobile ? 'touch' : 'mouse',
                          isPrimary: true,
                          button: 0,
                          buttons: type === 'primary-up' ? 0 : 1,
                          clientX: b.x + ((payload.x || 0) / canvas.width) * b.width,
                          clientY: b.y + ((payload.y || 0) / canvas.height) * b.height,
                          bubbles: true,
                          cancelable: true,
                        },
                      ),
                    );
                  }
                },
                (tick * 1000) / 60 + 25,
              );
          },
          { proof, mobile },
        );
        await page.clock.runFor((proof.ticks * 1000) / 60 + 500);
      }
      await page.locator('.rank-result').filter({ hasText: '本关第 ' }).waitFor();
      check(game.id + '/' + mobile + '/campaign-real-win-ranked', true);
      await page.locator('[data-open-board]').click();
      await page.locator('.leaderboard-table .is-me').waitFor();
      check(
        game.id + '/' + mobile + '/campaign-visible-rank',
        (await page.getByLabel('榜单关卡').inputValue()) === '1',
      );
      await page.getByLabel('榜单关卡').selectOption('2');
      await page.locator('.leaderboard-status').filter({ hasText: '第 2 关' }).waitFor();
      check(
        game.id + '/' + mobile + '/level-isolation',
        (await page.locator('.leaderboard-table').count()) === 0,
      );
      await page.reload();
      await page.locator('[data-open-board]').click();
      await page.locator('.leaderboard-table .is-me').waitFor();
      check(game.id + '/' + mobile + '/campaign-reload', true);
      check(
        game.id + '/' + mobile + '/layout',
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      );
    }
    check('campaign/' + mobile + '/no-runtime-errors', errors.length === 0);
  } finally {
    await ctx.close();
  }
}
