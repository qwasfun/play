// Complete input-only compatibility scenarios for already published games.
// Future games still supply their own qa/playthrough.mjs.
import { rng } from '@playground/game-sdk';
import { moveBoard, spawnTile, hasMoves } from '../games/merge/src/model.js';
import { findGroup, collapseBubbles } from '../games/bubbles/src/model.js';
export const legacyScenarioIds = Object.freeze([
  'boxes',
  'pipes',
  'lights',
  'slide',
  'mines',
  'star',
  'bridge',
  'echo',
  'catch',
  'bounce',
  'pairs',
  'merge',
  'rings',
  'snake',
  'jump',
  'bubbles',
  'rhythm',
  'constellation',
  'tower',
  'rain',
  'lantern',
  'sail',
  'balance',
  'pebble',
]);

function solveBubbles(board) {
  const memo = new Set();
  function visit(b) {
    if (b.every((v) => v == null)) return [];
    const key = b.map((v) => v ?? 'x').join(',');
    if (memo.has(key)) return null;
    memo.add(key);
    const seen = new Set();
    for (let i = 0; i < 20; i++) {
      if (b[i] == null || seen.has(i)) continue;
      const g = findGroup(b, i);
      g.forEach((j) => seen.add(j));
      if (g.length < 2) continue;
      const next = [...b];
      g.forEach((j) => (next[j] = null));
      const p = visit(collapseBubbles(next));
      if (p) return [i, ...p];
    }
    return null;
  }
  return visit(board);
}
function solveMerge(seed) {
  const random = rng(`${seed}:numbers`),
    start = spawnTile(spawnTile(Array(16).fill(0), random).board, random).board,
    stream = Array.from({ length: 700 }, random);
  let beam = [{ board: start, path: [] }],
    seen = new Set();
  for (let depth = 0; depth < 300; depth++) {
    const next = [];
    for (const state of beam)
      for (const direction of ['left', 'up', 'right', 'down']) {
        const move = moveBoard(state.board, direction);
        if (!move.moved) continue;
        let cursor = depth * 2;
        const b = spawnTile(move.board, () => stream[cursor++]).board,
          path = [...state.path, direction];
        if (Math.max(...b) >= 128) return path;
        if (!hasMoves(b)) continue;
        const key = b.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        let smooth = 0;
        for (let i = 0; i < 16; i++) {
          if (i % 4 < 3 && b[i] && b[i + 1])
            smooth -= Math.abs(Math.log2(b[i]) - Math.log2(b[i + 1]));
          if (i < 12 && b[i] && b[i + 4]) smooth -= Math.abs(Math.log2(b[i]) - Math.log2(b[i + 4]));
        }
        const rank =
          b.filter((v) => !v).length * 120 +
          Math.max(...b) * 8 +
          b.reduce((sum, v) => sum + (v ? v * Math.log2(v) : 0), 0) +
          smooth * 5;
        next.push({ board: b, path, rank });
      }
    beam = next.sort((a, b) => b.rank - a.rank).slice(0, 300);
    if (!beam.length) break;
  }
  throw Error('合成验收：未找到合法输入路径');
}
function snakePath(s) {
  const start = s.body[0].y * 12 + s.body[0].x,
    goal = s.food.y * 12 + s.food.x,
    blocked = new Set(s.body.slice(1, -1).map((p) => p.y * 12 + p.x)),
    queue = [[start, []]],
    seen = new Set([start]);
  for (let h = 0; h < queue.length; h++) {
    const [a, path] = queue[h];
    if (a === goal) return path;
    for (const d of [1, 12, -1, -12]) {
      const b = a + d;
      if (
        b < 0 ||
        b >= 120 ||
        Math.abs((b % 12) - (a % 12)) + Math.abs(Math.floor(b / 12) - Math.floor(a / 12)) !== 1 ||
        blocked.has(b) ||
        seen.has(b)
      )
        continue;
      seen.add(b);
      queue.push([b, [...path, b]]);
    }
  }
  return null;
}

export async function planLegacy(id, seed = 42) {
  if (!legacyScenarioIds.includes(id)) throw Error(`没有兼容场景：${id}`);
  const module = await import(`../games/${id}/src/index.js`);
  let result;
  const engine = module.createGame({ seed, onFinish: (r) => (result = r) }),
    events = [];
  let frame = 0;
  const state = () => engine.getState(),
    done = () => !!result,
    input = (type, payload = {}) => {
      if (done()) return;
      events.push({ frame, type, payload });
      engine.input(type, payload);
    },
    key = (key) => {
      input('key-down', { key });
      input('key-up', { key });
    },
    tap = (x, y) => {
      input('primary-down', { x, y });
      input('primary-up', { x, y });
    },
    update = (n = 1) => {
      for (let i = 0; i < n && !done(); i++) {
        engine.update(1 / 60);
        frame++;
      }
    },
    until = (t) => {
      while (frame / 60 < t - 1e-9 && !done()) update();
    },
    wait = (predicate) => {
      for (let i = 0; i < 15000 && !done() && !predicate(); i++) update();
      if (!done() && !predicate()) throw Error(`${id} phase did not advance`);
    };
  if (id === 'boxes')
    for (const direction of module.getPuzzle(seed).solution) {
      key({ U: 'ArrowUp', R: 'ArrowRight', D: 'ArrowDown', L: 'ArrowLeft' }[direction]);
      update(5);
    }
  if (id === 'pipes')
    for (const [cell, turns] of module.generatePipes(seed).solution.entries())
      for (let turn = 0; turn < turns; turn++) {
        tap(156 + (cell % 4) * 96, 91 + Math.floor(cell / 4) * 96);
        update(5);
      }
  if (id === 'lights')
    for (const cell of module.generateLights(seed).solution) {
      tap(156 + (cell % 4) * 96, 91 + Math.floor(cell / 4) * 96);
      update(5);
    }
  if (id === 'slide')
    for (const cell of module.generateSlide(seed).solution) {
      tap(180 + (cell % 3) * 120, 118 + Math.floor(cell / 3) * 120);
      update(5);
    }
  if (id === 'mines') {
    const { mines } = module.generateMines(seed);
    for (let cell = 0; cell < 16; cell++)
      if (!mines.includes(cell)) {
        tap(156 + (cell % 4) * 96, 96 + Math.floor(cell / 4) * 96);
        update(5);
      }
  }
  if (id === 'star') {
    const groups = new Map();
    for (const e of module.generateStarSchedule(seed)) {
      const group = groups.get(e.time) || [];
      group.push(e);
      groups.set(e.time, group);
    }
    for (const [time, group] of groups) {
      const mail = group.find((e) => e.type === 'mail'),
        lane = mail ? mail.lane : 1 - group[0].lane;
      until(time - 0.15);
      if (state().lane !== lane) tap(300, 250);
      until(time + 0.03);
    }
    until(60.1);
  }
  if (id === 'bridge')
    for (const island of module.generateIslands(seed)) {
      wait(() => state().phase === 'idle');
      input('primary-down', { x: 300, y: 250 });
      update(Math.round(((island.gap + island.width / 2) / island.speed) * 60));
      input('primary-up', { x: 300, y: 250 });
      update(82);
    }
  if (id === 'catch') {
    const crossing = module
      .generateHarvest(seed)
      .map((e) => ({ ...e, at: e.time + (429 - (e.type === 'rock' ? 16 : 15)) / e.speed }))
      .sort((a, b) => a.at - b.at);
    for (const e of crossing) {
      until(e.at - 0.08);
      const x = e.type === 'fruit' ? e.x : e.x < 300 ? 500 : 100;
      tap(x, 420);
      until(e.at + 0.02);
    }
    until(60.1);
  }
  if (id === 'rain')
    for (const e of module.generateRainSchedule(seed)) {
      until(e.crossTime - 0.12);
      tap(e.x, 330);
      until(e.crossTime + 0.03);
    }
  if (id === 'jump')
    for (const e of module.generateJumpSchedule(seed)) {
      until(e.time - 0.52);
      tap(300, 250);
      until(e.time + 0.7);
    }
  if (id === 'rhythm')
    for (const e of module.generateRhythmSchedule(seed)) {
      until(e.time);
      tap(126 + e.lane * 116, 361);
      update(2);
    }
  if (id === 'tower')
    for (let i = 0; i < 12000 && !done(); i++) {
      const s = state();
      if (s.phase === 'moving' && Math.abs(s.moving.x - s.top.x) < 2) tap(300, 250);
      update();
    }
  if (id === 'lantern')
    for (let i = 0; i < 24 && !done(); i++) {
      until(i * 1.5 + 0.78);
      const cell = module.makeSchedule(seed)[i];
      tap(180 + (cell % 3) * 120, 144 + Math.floor(cell / 3) * 108);
      until((i + 1) * 1.5 + 0.03);
    }
  if (id === 'sail')
    for (let i = 0; i < 18 && !done(); i++) {
      until(i * 2.4 + 0.25);
      tap(140 + module.makeGates(seed)[i] * 160, 410);
      until((i + 1) * 2.4 + 0.03);
    }
  if (id === 'echo') {
    const sequence = module.createEchoSequence(seed),
      points = [
        [200, 142],
        [400, 142],
        [400, 320],
        [200, 320],
      ];
    for (let round = 0; round < 12; round++) {
      wait(() => state().phase === 'input');
      update(10);
      for (const i of sequence.slice(0, round + 1)) {
        tap(...points[i]);
        update(5);
      }
      if (!done()) {
        update(20);
        wait(() => state().phase !== 'input');
      }
    }
  }
  if (id === 'pairs') {
    const board = module.generatePairs(seed);
    for (let value = 0; value < 6; value++)
      for (let i = 0; i < 12; i++)
        if (board[i] === value) {
          tap(150 + (i % 4) * 100, 124 + Math.floor(i / 4) * 116);
          update(5);
        }
  }
  if (id === 'merge')
    for (const direction of solveMerge(seed)) {
      key({ left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }[direction]);
      update(5);
    }
  if (id === 'bubbles')
    for (const board of module.generateBubbles(seed)) {
      const path = solveBubbles(board);
      if (!path) throw Error('消除验收：没有合法解');
      for (const cell of path) {
        tap(108 + (cell % 5) * 96, 96 + Math.floor(cell / 5) * 96);
        update(5);
      }
      update(45);
    }
  if (id === 'constellation')
    for (const puzzle of module.generateConstellations(seed)) {
      for (const cell of puzzle.solution) {
        tap(puzzle.nodes[cell].x, puzzle.nodes[cell].y);
        update(4);
      }
      update(42);
    }
  if (id === 'balance')
    for (const puzzle of module.makePuzzles(seed)) {
      for (const cell of puzzle.solution) {
        tap(160 + (cell % 3) * 140, 205 + Math.floor(cell / 3) * 90);
        update(5);
      }
      tap(300, 400);
      update(12);
    }
  if (id === 'pebble')
    for (const board of module.makeBoards(seed))
      for (const [a, , c] of board.solution) {
        for (const cell of [a, c]) {
          tap(160 + (cell % 5) * 70, 120 + Math.floor(cell / 5) * 70);
          update(5);
        }
      }
  if (id === 'snake')
    for (let guard = 0; guard < 500 && !done(); guard++) {
      const s = state(),
        path = snakePath(s);
      if (!path?.length) throw Error('小蛇验收：无法找到安全路径');
      const to = path[0],
        from = s.body[0].y * 12 + s.body[0].x,
        delta = to - from,
        k =
          delta === 1
            ? 'ArrowRight'
            : delta === -1
              ? 'ArrowLeft'
              : delta === 12
                ? 'ArrowDown'
                : 'ArrowUp';
      update(5);
      key(k);
      const old = s.body[0];
      wait(() => state().body[0].x !== old.x || state().body[0].y !== old.y);
    }
  if (id === 'rings')
    for (let guard = 0; guard < 9000 && !done(); guard++) {
      const s = state();
      if (s.phase === 'aim') {
        update(12);
        const ring = module.generateRings(seed)[s.progress],
          { vx, vy } = ring.solution;
        input('primary-down', { x: 260, y: 250 });
        input('primary-move', { x: 260 - vx / 3.7, y: 250 - vy / 3.7 });
        input('primary-up', { x: 260 - vx / 3.7, y: 250 - vy / 3.7 });
      }
      update();
    }
  if (id === 'bounce') {
    let oldVy = 0,
      bounces = 0;
    for (let guard = 0; guard < 7300 && !done(); guard++) {
      const s = state(),
        b = s.ball;
      if (b.vy < 0 && oldVy > 0) bounces++;
      oldVy = b.vy;
      let target = 300;
      if (s.phase !== 'serve') {
        target = b.x;
        if (b.vy > 0) {
          let landing = b.x + b.vx * Math.max(0, (418 - b.y) / b.vy),
            phase = (((landing - 30) % 1080) + 1080) % 1080;
          landing = 30 + (phase <= 540 ? phase : 1080 - phase);
          target = landing - Math.sin(bounces * 2.399 + 1) * 25;
        }
      }
      input(guard === 0 ? 'primary-down' : 'primary-move', {
        x: Math.max(78, Math.min(522, target)),
        y: 430,
      });
      update();
    }
  }
  if (!result?.won)
    throw Error(`${id} 普通模式未完成：${JSON.stringify(result ?? state()).slice(0, 300)}`);
  engine.destroy();
  return { events, frames: frame, result };
}

async function bounceFromCanvas(page, mobile) {
  await page.evaluate((mobile) => {
    const canvas = document.querySelector('canvas'),
      ctx = canvas.getContext('2d'),
      original = ctx.arc;
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
              let landing = x + ((418 - y) * dx) / dy,
                phase = (((landing - 30) % 1080) + 1080) % 1080;
              landing = 30 + (phase <= 540 ? phase : 1080 - phase);
              target = landing - Math.sin(bounces * 2.399 + 1) * 25;
            }
            target = Math.max(78, Math.min(522, target));
            const b = canvas.getBoundingClientRect();
            canvas.dispatchEvent(
              new PointerEvent(pressed ? 'pointermove' : 'pointerdown', {
                pointerId: 81,
                pointerType: mobile ? 'touch' : 'mouse',
                isPrimary: true,
                button: 0,
                buttons: 1,
                clientX: b.x + (target / 600) * b.width,
                clientY: b.y + (430 / 480) * b.height,
                bubbles: true,
                cancelable: true,
              }),
            );
            pressed = true;
          }
        }
        previous = { x, y };
      }
      return original.call(this, x, y, r, ...rest);
    };
    window.__restoreLegacyBall = () => {
      ctx.arc = original;
    };
  }, mobile);
  for (let i = 0; i < 122 && !(await page.locator('.result-card').count()); i++)
    await page.clock.runFor(1000);
  await page.evaluate(() => {
    window.__restoreLegacyBall?.();
    delete window.__restoreLegacyBall;
  });
}

export async function playLegacy(id, { page, mobile, seed }) {
  const plan = await planLegacy(id, seed);
  if (id === 'bounce') await bounceFromCanvas(page, mobile);
  else {
    await page.evaluate(
      ({ events, mobile, id }) => {
        const canvas = document.querySelector('canvas');
        function pointer(type, p) {
          const b = canvas.getBoundingClientRect();
          canvas.dispatchEvent(
            new PointerEvent(type, {
              pointerId: 81,
              pointerType: mobile ? 'touch' : 'mouse',
              isPrimary: true,
              button: 0,
              buttons: type === 'pointerup' ? 0 : 1,
              clientX: b.x + ((p.x || 0) / canvas.width) * b.width,
              clientY: b.y + ((p.y || 0) / canvas.height) * b.height,
              bubbles: true,
              cancelable: true,
            }),
          );
        }
        for (const e of events)
          setTimeout(
            () => {
              if (e.type.startsWith('key-')) {
                if (mobile && ['snake', 'merge', 'boxes'].includes(id)) {
                  if (e.type === 'key-up') return;
                  const delta = {
                    ArrowRight: [70, 0],
                    ArrowLeft: [-70, 0],
                    ArrowDown: [0, 70],
                    ArrowUp: [0, -70],
                  }[e.payload.key];
                  pointer('pointerdown', { x: 300, y: 240 });
                  pointer('pointerup', { x: 300 + delta[0], y: 240 + delta[1] });
                } else
                  canvas.dispatchEvent(
                    new KeyboardEvent(e.type === 'key-down' ? 'keydown' : 'keyup', {
                      key: e.payload.key,
                      bubbles: true,
                      cancelable: true,
                    }),
                  );
              } else
                pointer(
                  {
                    'primary-down': 'pointerdown',
                    'primary-up': 'pointerup',
                    'primary-move': 'pointermove',
                  }[e.type],
                  e.payload,
                );
            },
            (e.frame * 1000) / 60,
          );
      },
      { events: plan.events, mobile, id },
    );
    await page.clock.runFor((plan.frames * 1000) / 60 + 400);
  }
  await page.locator('.result-card').waitFor();
  if (!(await page.locator('.result-card h2').innerText()).includes('漂亮'))
    throw Error(`${id} 普通模式浏览器未通关：${await page.locator('.result-card').innerText()}`);
}
