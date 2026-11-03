import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, distanceToSegment, generateRoutes, GLOW_PATH } from '../src/index.js';
import { rules } from '../src/rules.js';

function traceRoute(game, route) {
  const points = route.points;
  game.input('primary-down', points[0]);
  for (const point of points.slice(1)) {
    game.update(0.05);
    game.input('primary-move', point);
  }
  game.input('primary-up', points.at(-1));
}

function complete(game, seed) {
  for (const [index, route] of generateRoutes(seed).entries()) {
    traceRoute(game, route);
    if (index < GLOW_PATH.routes - 1) game.update(0.8);
  }
}

test('seeded routes are deterministic, varied, bounded and become gradually narrower', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const routes = generateRoutes(seed);
    assert.deepEqual(routes, generateRoutes(seed));
    assert.equal(routes.length, GLOW_PATH.routes);
    assert.deepEqual(
      routes.map((route) => route.radius),
      [...GLOW_PATH.widths],
    );
    for (const route of routes) {
      assert.equal(route.points.length, GLOW_PATH.checkpoints + 1);
      for (const point of route.points) {
        assert.ok(point.x >= 58 && point.x <= 542);
        assert.ok(point.y >= 104 && point.y <= 366);
      }
      for (let index = 1; index < route.points.length; index++)
        assert.ok(Math.abs(route.points[index].y - route.points[index - 1].y) < 70);
    }
    signatures.add(
      routes.flatMap((route) => route.points.map((point) => point.y.toFixed(1))).join(','),
    );
  }
  assert.ok(signatures.size > 250);
  assert.notDeepEqual(generateRoutes(42), generateRoutes(43));
});

test('segment distance handles endpoints, projections, zero length and invalid points', () => {
  const from = { x: 10, y: 20 };
  const to = { x: 110, y: 20 };
  assert.equal(distanceToSegment({ x: 60, y: 20 }, from, to), 0);
  assert.equal(distanceToSegment({ x: 60, y: 45 }, from, to), 25);
  assert.equal(distanceToSegment({ x: -5, y: 20 }, from, to), 15);
  assert.equal(distanceToSegment({ x: 13, y: 24 }, from, from), 5);
  assert.equal(distanceToSegment({}, from, to), Infinity);
});

test('real pointer tracing completes three routes once with a valid ranked result', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  complete(game, 42);
  assert.equal(results.length, 1);
  assert.deepEqual(
    { ...results[0], elapsed: 2.8 },
    {
      score: 1200,
      elapsed: 2.8,
      won: true,
      progress: 24,
      rounds: 3,
      lives: 3,
    },
  );
  assert.ok(Math.abs(results[0].elapsed - 2.8) < 1e-9);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.input('primary-down', end.position);
  game.input('primary-move', { x: 0, y: 0 });
  game.update(999);
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('leaving the path costs one life, resets to the last flower and three misses end once', () => {
  const results = [];
  const route = generateRoutes(7)[0];
  const game = createGame({ seed: 7, onFinish: (result) => results.push(result) });
  game.input('primary-down', route.points[0]);
  game.update(0.05);
  game.input('primary-move', route.points[1]);
  assert.equal(game.getState().progress, 1);
  const checkpoint = game.getState().position;
  for (let miss = 0; miss < 3; miss++) {
    game.input('primary-down', game.getState().position);
    game.input('primary-move', { x: checkpoint.x, y: checkpoint.y > 240 ? 0 : 480 });
    assert.equal(game.getState().lives, 2 - miss);
  }
  assert.equal(results.length, 1);
  assert.equal(results[0].won, false);
  assert.equal(results[0].score, 50);
  assert.equal(results[0].progress, 1);
  assert.equal(results[0].lives, 0);
  assert.deepEqual(rules.validate(results[0]), []);
});

test('pointer must begin on the light; release, cancel and invalid coordinates stay harmless', () => {
  const game = createGame({ seed: 42 });
  const start = game.getState().position;
  game.input('primary-down', { x: start.x + 80, y: start.y });
  game.input('primary-move', { x: 200, y: 200 });
  assert.deepEqual(game.getState().position, start);
  game.input('primary-down', start);
  game.input('primary-cancel');
  game.input('primary-move', generateRoutes(42)[0].points[1]);
  game.input('primary-up', generateRoutes(42)[0].points[1]);
  for (const point of [{}, { x: NaN, y: 20 }, { x: -1, y: 20 }, { x: 601, y: 20 }]) {
    game.input('primary-down', point);
    game.input('primary-move', point);
    game.input('primary-up', point);
  }
  assert.deepEqual(game.getState().position, start);
  assert.equal(game.getState().lives, 3);
});

test('held keyboard moves continuously, repeats do not latch and opposed directions cancel', () => {
  const game = createGame({ seed: 42 });
  const start = game.getState().position;
  game.input('key-down', { key: 'ArrowRight', repeat: true });
  game.update(0.1);
  assert.deepEqual(game.getState().position, start);
  const forward = start.x < 300 ? 'ArrowRight' : 'ArrowLeft';
  const opposite = forward === 'ArrowRight' ? 'a' : 'd';
  game.input('key-down', { key: forward, repeat: false });
  game.update(0.08);
  assert.notDeepEqual(game.getState().position, start);
  const moved = game.getState().position;
  game.input('key-down', { key: opposite, repeat: false });
  game.update(0.08);
  assert.deepEqual(game.getState().position, moved);
  game.input('primary-cancel');
  game.update(0.08);
  assert.deepEqual(game.getState().position, moved);
});

test('invalid time is ignored, timeout clamps at ninety seconds and destroy stays silent', () => {
  const timed = [];
  const game = createGame({ seed: 42, onFinish: (result) => timed.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  game.update(999);
  game.update(1);
  assert.deepEqual(timed[0], {
    score: 0,
    elapsed: 90,
    won: false,
    progress: 0,
    rounds: 0,
    lives: 3,
  });
  assert.deepEqual(rules.validate(timed[0]), []);

  const destroyed = [];
  const quiet = createGame({ seed: 2, onFinish: (result) => destroyed.push(result) });
  quiet.destroy();
  quiet.update(999);
  quiet.input('key-down', { key: 'ArrowRight' });
  assert.equal(destroyed.length, 0);
});

test('ranked rules reject forged scores, counters, wins, unfinished losses and impossible speed', () => {
  const good = { score: 1200, elapsed: 3, won: true, progress: 24, rounds: 3, lives: 2 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1150 },
    { ...good, score: 1100 },
    { ...good, progress: 23 },
    { ...good, rounds: 2 },
    { ...good, lives: 0 },
    { ...good, won: false },
    { ...good, elapsed: 0.5 },
    { ...good, elapsed: 91 },
    { score: 400, elapsed: 30, won: false, progress: 8, rounds: 1, lives: 2 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, routeData: 'drop' }), good);
});
