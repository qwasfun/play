import test from 'node:test';
import assert from 'node:assert/strict';
import { BEE_ORBIT, createGame, gateWindow, generateGates } from '../src/index.js';
import { rules } from '../src/rules.js';

function alignWithKeyboard(game) {
  if (game.getState().lane !== game.getState().gate.lane)
    game.input('key-down', { key: ' ', repeat: false });
}

function collectNext(game) {
  const before = game.getState().progress;
  alignWithKeyboard(game);
  game.update(gateWindow(before) + 0.02);
  if (!game.getState().finished) game.update(BEE_ORBIT.bloomTime + 0.02);
}

test('seeded gates are deterministic, balanced and vary across seeds', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const gates = generateGates(seed);
    assert.deepEqual(gates, generateGates(seed));
    assert.equal(gates.length, BEE_ORBIT.total);
    for (let start = 0; start < gates.length; start += 4) {
      assert.equal(gates.slice(start, start + 4).filter(({ lane }) => lane === 0).length, 2);
      assert.equal(gates.slice(start, start + 4).filter(({ lane }) => lane === 1).length, 2);
      if (start) assert.notEqual(gates[start].lane, gates[start - 1].lane);
    }
    for (const gate of gates) {
      assert.ok(gate.lane === 0 || gate.lane === 1);
      assert.ok(gate.petal >= 0 && gate.petal < 4);
    }
    signatures.add(gates.map(({ lane, petal }) => `${lane}${petal}`).join(''));
  }
  assert.ok(signatures.size > 285);
  assert.notDeepEqual(generateGates(42), generateGates(43));
});

test('response window becomes brisker but stays readable', () => {
  assert.equal(gateWindow(0), 2.42);
  assert.ok(gateWindow(6) < gateWindow(0));
  assert.ok(gateWindow(11) >= 1.68);
});

test('real keyboard switches collect twelve gates and finish once', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  for (let gate = 0; gate < BEE_ORBIT.total; gate++) collectNext(game);
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 1200,
    elapsed: results[0].elapsed,
    won: true,
    progress: 12,
    lives: 3,
  });
  assert.ok(results[0].elapsed > 20 && results[0].elapsed < 40);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.input('key-down', { key: ' ', repeat: false });
  game.update(999);
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('pointer and supported keys switch rings while invalid input is ignored', () => {
  const game = createGame({ seed: 8 });
  game.input('primary-down', { x: 300, y: 240 });
  assert.equal(game.getState().lane, 1);
  game.input('key-down', { key: 'ArrowDown', repeat: false });
  assert.equal(game.getState().lane, 0);
  game.input('key-down', { key: 'w', repeat: false });
  assert.equal(game.getState().lane, 1);
  game.input('key-down', { key: 'Enter', repeat: false });
  assert.equal(game.getState().lane, 0);
  for (const point of [{}, { x: NaN, y: 20 }, { x: -1, y: 20 }, { x: 601, y: 20 }])
    game.input('primary-down', point);
  game.input('key-down', { key: ' ', repeat: true });
  game.input('key-down', { key: 'x', repeat: false });
  assert.equal(game.getState().lane, 0);
});

test('input is locked during bloom and reset transitions', () => {
  const game = createGame({ seed: 11 });
  alignWithKeyboard(game);
  game.update(gateWindow(0) + 0.01);
  assert.equal(game.getState().phase, 'bloom');
  const lane = game.getState().lane;
  game.input('primary-down', { x: 300, y: 240 });
  game.input('key-down', { key: ' ', repeat: false });
  assert.equal(game.getState().lane, lane);
});

test('wrong rings cost lives and three dew hits finish with a valid loss', () => {
  const results = [];
  const game = createGame({ seed: 4, onFinish: (result) => results.push(result) });
  for (let miss = 0; miss < 3; miss++) {
    if (game.getState().lane === game.getState().gate.lane)
      game.input('key-down', { key: ' ', repeat: false });
    game.update(gateWindow(game.getState().progress) + 0.02);
    if (miss < 2) game.update(BEE_ORBIT.resetTime + 0.02);
  }
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 0,
    elapsed: results[0].elapsed,
    won: false,
    progress: 0,
    lives: 0,
  });
  assert.deepEqual(rules.validate(results[0]), []);
});

test('invalid time is ignored, global timeout clamps and destroy stays silent', () => {
  const timed = [];
  const game = createGame({ seed: 9, onFinish: (result) => timed.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  game.update(999);
  assert.equal(timed.length, 1);
  assert.ok(timed[0].lives === 0 || timed[0].elapsed === BEE_ORBIT.limit);
  assert.deepEqual(rules.validate(timed[0]), []);

  const destroyed = [];
  const quiet = createGame({ seed: 1, onFinish: (result) => destroyed.push(result) });
  quiet.destroy();
  quiet.update(999);
  quiet.input('key-down', { key: ' ' });
  assert.equal(destroyed.length, 0);
});

test('ranked rules reject forged scores, counters, wins and unfinished losses', () => {
  const good = { score: 1200, elapsed: 28, won: true, progress: 12, lives: 2 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1100 },
    { ...good, score: 1190 },
    { ...good, progress: 11 },
    { ...good, lives: 0 },
    { ...good, won: false },
    { ...good, elapsed: 2 },
    { ...good, elapsed: 61 },
    { score: 300, elapsed: 24, won: false, progress: 3, lives: 2 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'pollen' }), good);
});
