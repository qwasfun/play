import { createGame as windmill } from '../games/windmill/src/index.js';
import { createGame as weave } from '../games/weave/src/index.js';
import { games, leaderboardPolicy } from '@playground/game-registry';
export function solveWeave(s) {
  const groups = (a) => {
    const out = [];
    let n = 0;
    for (const v of [...a, 0])
      if (v) n++;
      else if (n) {
        out.push(n);
        n = 0;
      }
    return out.length ? out : [0];
  };
  const choices = s.rows.map((r) =>
    Array.from({ length: 32 }, (_, m) => Array.from({ length: 5 }, (_, c) => (m >> c) & 1)).filter(
      (a) => String(groups(a)) === String(r),
    ),
  );
  let answer;
  function solve(rows) {
    if (rows.length === 5) {
      if (s.cols.every((c, j) => String(c) === String(groups(rows.map((r) => r[j])))))
        answer = rows.flat();
      return;
    }
    for (const a of choices[rows.length]) {
      solve([...rows, a]);
      if (answer) return;
    }
  }
  solve([]);
  return answer;
}
export function jugPath(target) {
  const q = [[0, 0, []]],
    seen = new Set();
  while (q.length) {
    const [a, b, path] = q.shift();
    if (a === target || b === target) return path;
    if (seen.has(`${a},${b}`)) continue;
    seen.add(`${a},${b}`);
    const x = Math.min(a, 5 - b),
      y = Math.min(b, 3 - a);
    [
      [3, b],
      [a, 5],
      [0, b],
      [a, 0],
      [a - x, b + x],
      [a + y, b - y],
    ].forEach(([c, d], i) => q.push([c, d, [...path, i]]));
  }
}
export function courierPath(start, target) {
  const q = [[start]],
    seen = new Set([start]);
  while (q.length) {
    const path = q.shift(),
      p = path.at(-1);
    if (p === target) return path.slice(1);
    for (const n of [p - 1, p + 1, p - 6, p + 6])
      if (
        n >= 0 &&
        n < 36 &&
        !seen.has(n) &&
        ![8, 9, 20, 21, 12].includes(n) &&
        Math.abs((n % 6) - (p % 6)) + Math.abs(Math.floor(n / 6) - Math.floor(p / 6)) === 1
      ) {
        seen.add(n);
        q.push([...path, n]);
      }
  }
}
export async function verifyBatch(
  page,
  {
    mobile = false,
    base = 'http://127.0.0.1:4175',
    artifacts = 'output/playwright',
    ids = ['windmill', 'courier', 'weave', 'jugs'],
    online = false,
  } = {},
) {
  let count = 0;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const check = (name, v) => {
    if (!v) throw Error(name);
    count++;
    console.log('PASS', mobile, name);
  };
  await page.addInitScript(() => {
    crypto.getRandomValues = (a) => {
      a.fill(42);
      return a;
    };
  });
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const btn = async (s) => {
    if (mobile) await page.locator(s).tap();
    else await page.locator(s).click();
  };
  const tap = async (x, y) => {
    const c = page.locator('#game-canvas');
    await c.scrollIntoViewIfNeeded();
    const b = await c.boundingBox(),
      p = { x: b.x + (x / 600) * b.width, y: b.y + (y / 480) * b.height };
    if (mobile) await page.touchscreen.tap(p.x, p.y);
    else await page.mouse.click(p.x, p.y);
  };
  const resume = async () => {
    if (await page.locator('[data-action="resume"]').isVisible())
      await btn('[data-action="resume"]');
  };
  for (const id of ids) {
    await page.setViewportSize({ width: mobile ? 390 : 1280, height: mobile ? 844 : 900 });
    await page.goto(base + '/#/play/' + id);
    await page.locator('[data-action="start"]').waitFor();
    await btn('[data-action="start"]');
    await page.clock.runFor(50);
    await btn('#pause');
    check(id + ' pause', await page.locator('[data-action="resume"]').isVisible());
    const t = await page.locator('#live-time').innerText();
    await page.clock.runFor(2000);
    check(id + ' pause freezes time', t === (await page.locator('#live-time').innerText()));
    await resume();
    await btn('#fullscreen-toggle');
    check(
      id + ' fullscreen',
      await page.locator('.play-main').evaluate((el) => el.classList.contains('is-fullscreen')),
    );
    await btn('#fullscreen-toggle');
    await resume();
    for (const size of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(size);
      await page.clock.runFor(200);
      check(
        id + ' layout ' + size.width,
        await page.locator('#game-canvas').evaluate((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 100 && r.left >= 0 && r.right <= innerWidth + 1;
        }),
      );
      await resume();
    }
    await page.setViewportSize({ width: mobile ? 390 : 1280, height: mobile ? 844 : 900 });
    await page.clock.runFor(100);
    await resume();
    await btn('#restart');
    await btn('[data-action="again"]');
    await page.clock.runFor(50);
    check(id + ' restart', (await page.locator('#live-score').innerText()) === '0');
    await page.screenshot({ path: `${artifacts}/${id}-${mobile ? 'mobile' : 'desktop'}.png` });
    await resume();
    // Restart once more so timed action rounds begin from a known state.
    await btn('#restart');
    await btn('[data-action="again"]');
    await page.clock.runFor(50);
    if (id === 'windmill') {
      const mirror = windmill({ seed: 42 });
      for (let i = 0; i < 12; i++) {
        const { target } = mirror.getState();
        let hit = false;
        for (let j = 0; j < 300; j++) {
          await page.clock.runFor(16);
          hit = await page.locator('#game-canvas').evaluate((el, target) => {
            const p = el
              .getContext('2d')
              .getImageData(
                Math.round(300 + 105 * Math.cos(target)),
                Math.round(250 + 105 * Math.sin(target)),
                1,
                1,
              ).data;
            return Math.abs(p[0] - 101) < 5 && Math.abs(p[1] - 139) < 5 && Math.abs(p[2] - 120) < 5;
          }, target);
          if (hit) break;
        }
        check('windmill timing ' + i, hit);
        if (mobile) await tap(300, 250);
        else await page.locator('#game-canvas').press('Space');
        const s = mirror.getState();
        mirror.update(((s.target - s.angle + Math.PI * 2) % (Math.PI * 2)) / (1.5 + s.hits * 0.12));
        mirror.input('key-down', { key: ' ' });
      }
    } else if (id === 'courier') {
      let pos = 0;
      for (const target of [5, 30, 11, 24, 35]) {
        for (const n of courierPath(pos, target)) {
          if (mobile) await tap(150 + (n % 6) * 60, 100 + Math.floor(n / 6) * 60);
          else
            await page
              .locator('#game-canvas')
              .press(
                n === pos - 1
                  ? 'ArrowLeft'
                  : n === pos + 1
                    ? 'ArrowRight'
                    : n === pos - 6
                      ? 'ArrowUp'
                      : 'ArrowDown',
              );
          pos = n;
        }
      }
    } else if (id === 'weave') {
      const solution = solveWeave(weave({ seed: 42 }).getState());
      let cursor = 0;
      for (let i = 0; i < 25; i++)
        if (solution[i]) {
          if (mobile) await tap(230 + (i % 5) * 60, 120 + Math.floor(i / 5) * 60);
          else {
            while (cursor !== i) {
              await page.locator('#game-canvas').press('ArrowRight');
              cursor = (cursor + 1) % 25;
            }
            await page.locator('#game-canvas').press('Space');
          }
        }
      if (mobile) await tap(320, 430);
      else await page.locator('#game-canvas').press('Enter');
    } else {
      let cursor = 0;
      for (const target of [4, 2, 1])
        for (const i of jugPath(target)) {
          if (mobile) await tap(160 + (i % 3) * 140, 303 + Math.floor(i / 3) * 90);
          else {
            while (cursor !== i) {
              await page.locator('#game-canvas').press('ArrowRight');
              cursor = (cursor + 1) % 6;
            }
            await page.locator('#game-canvas').press('Enter');
          }
        }
    }
    await page.clock.runFor(100);
    await page.locator('.result-card').waitFor();
    check(id + ' win', (await page.locator('.result-card').innerText()).includes('漂亮'));
    if (online) {
      await page.locator('.rank-result').filter({ hasText: '第 ' }).waitFor();
      check(id + ' ranked', true);
      await btn('[data-open-board]');
      await page.locator('.leaderboard-table .is-me').waitFor();
      check(id + ' visible rank', true);
      check(
        id + ' board mode options',
        (await page.getByLabel('榜单类型').locator('option').count()) ===
          (leaderboardPolicy(id).daily ? 2 : 1),
      );
    }
    check(
      id + ' saved',
      await page.evaluate(
        (id) => !!JSON.parse(localStorage.getItem('tiny-break-arcade:v1')).best[id],
        id,
      ),
    );
    await page.reload();
    await page.locator('[data-action="start"]').waitFor();
    if (online) {
      await btn('[data-open-board]');
      await page.locator('.leaderboard-table .is-me').waitFor();
      check(id + ' rank persists after reload', true);
    }
    check(
      id + ' saved after reload',
      !(await page.locator('#best-record').innerText()).includes('等待'),
    );
  }
  await page.goto(base);
  check('all home cards', (await page.locator('[data-game]').count()) === games.length);
  for (const id of ids) await btn(`[data-favorite="${id}"]`);
  await page.reload();
  check(
    'favorites persisted',
    await page.evaluate(
      (ids) =>
        JSON.parse(localStorage.getItem('tiny-break-arcade:v1')).favorites.length === ids.length,
      ids,
    ),
  );
  check(
    'recent recorded',
    await page.evaluate(
      (ids) =>
        ids.every((id) =>
          JSON.parse(localStorage.getItem('tiny-break-arcade:v1')).recent.includes(id),
        ),
      ids,
    ),
  );
  check('no page errors', errors.length === 0);
  return { checks: count, errors };
}
