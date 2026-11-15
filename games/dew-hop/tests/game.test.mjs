import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  DEW_HOP,
  directionAt,
  DIRECTIONS,
  generateTargets,
  padPoint,
  responseWindow,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function reveal(game) {
  game.update(DEW_HOP.revealTime + 0.01);
}

function pressTarget(game) {
  const state = game.getState();
  game.input('key-down', { key: DIRECTIONS[state.target.direction].key, repeat: false });
}

function hopNext(game) {
  reveal(game);
  pressTarget(game);
  if (!game.getState().finished) game.update(DEW_HOP.hopTime + 0.01);
}

test('seeded lily targets are deterministic, balanced and varied', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const targets = generateTargets(seed);
    assert.deepEqual(targets, generateTargets(seed));
    assert.equal(targets.length, DEW_HOP.total);
    for (let start = 0; start < targets.length; start += 4) {
      assert.deepEqual(
        new Set(targets.slice(start, start + 4).map(({ direction }) => direction)),
        new Set([0, 1, 2, 3]),
      );
      if (start) assert.notEqual(targets[start].direction, targets[start - 1].direction);
    }
    for (const target of targets) {
      assert.ok(target.direction >= 0 && target.direction < DIRECTIONS.length);
      assert.ok(target.leaf >= 0 && target.leaf < 4);
    }
    signatures.add(targets.map(({ direction, leaf }) => `${direction}${leaf}`).join(''));
  }
  assert.ok(signatures.size > 285);
  assert.notDeepEqual(generateTargets(42), generateTargets(43));
});

test('response window becomes brisker while remaining readable', () => {
  assert.equal(responseWindow(0), 1.58);
  assert.ok(responseWindow(6) < responseWindow(0));
  assert.ok(responseWindow(11) >= 0.88);
});

test('real keyboard directions complete twelve hops and finish once', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  for (let hop = 0; hop < DEW_HOP.total; hop++) hopNext(game);
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 1200,
    elapsed: results[0].elapsed,
    won: true,
    progress: 12,
    lives: 3,
  });
  assert.ok(results[0].elapsed > 7 && results[0].elapsed < 10);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.input('key-down', { key: 'ArrowUp', repeat: false });
  game.update(999);
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('pointer and all supported direction keys choose the matching lily pads', () => {
  for (const [key, direction] of [
    ['ArrowUp', 0],
    ['w', 0],
    ['ArrowRight', 1],
    ['d', 1],
    ['ArrowDown', 2],
    ['s', 2],
    ['ArrowLeft', 3],
    ['a', 3],
  ]) {
    const targetSeed = Array.from({ length: 80 }, (_, seed) => seed).find(
      (seed) => generateTargets(seed)[0].direction === direction,
    );
    const game = createGame({ seed: targetSeed });
    reveal(game);
    game.input('key-down', { key, repeat: false });
    assert.equal(game.getState().progress, 1, key);
  }

  const pointer = createGame({ seed: 9 });
  reveal(pointer);
  const direction = pointer.getState().target.direction;
  pointer.input('primary-down', padPoint(direction));
  assert.equal(pointer.getState().progress, 1);
  DIRECTIONS.forEach((_, index) => assert.equal(directionAt(padPoint(index)), index));
});

test('reveal and hop phases lock input while repeated and invalid input are ignored', () => {
  const game = createGame({ seed: 11 });
  pressTarget(game);
  assert.equal(game.getState().progress, 0);
  reveal(game);
  const key = DIRECTIONS[game.getState().target.direction].key;
  game.input('key-down', { key, repeat: true });
  game.input('key-down', { key: 'x', repeat: false });
  for (const point of [
    {},
    { x: NaN, y: 20 },
    { x: -1, y: 20 },
    { x: 601, y: 20 },
    { x: 300, y: 246 },
  ])
    game.input('primary-down', point);
  assert.equal(game.getState().progress, 0);
  game.input('key-down', { key, repeat: false });
  assert.equal(game.getState().phase, 'hop');
  game.input('primary-down', padPoint(game.getState().target.direction));
  assert.equal(game.getState().progress, 1);
});

test('wrong directions and expired ripples cost chances and three misses finish', () => {
  const results = [];
  const game = createGame({ seed: 4, onFinish: (result) => results.push(result) });
  for (let miss = 0; miss < 3; miss++) {
    reveal(game);
    const wrong = (game.getState().target.direction + 1) % 4;
    game.input('primary-down', padPoint(wrong));
    if (miss < 2) game.update(DEW_HOP.resetTime + DEW_HOP.revealTime + 0.02);
  }
  assert.equal(results.length, 1);
  assert.equal(results[0].score, 0);
  assert.equal(results[0].progress, 0);
  assert.equal(results[0].lives, 0);
  assert.equal(results[0].won, false);
  assert.deepEqual(rules.validate(results[0]), []);

  const timeout = createGame({ seed: 6 });
  reveal(timeout);
  timeout.update(responseWindow(0) + 0.01);
  assert.equal(timeout.getState().lives, 2);
  assert.equal(timeout.getState().phase, 'reset');
});

test('invalid time is ignored, global timeout is bounded and destroy stays silent', () => {
  const timed = [];
  const game = createGame({ seed: 9, onFinish: (result) => timed.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  game.update(999);
  assert.equal(timed.length, 1);
  assert.ok(timed[0].lives === 0 || timed[0].elapsed === DEW_HOP.limit);
  assert.deepEqual(rules.validate(timed[0]), []);

  const destroyed = [];
  const quiet = createGame({ seed: 1, onFinish: (result) => destroyed.push(result) });
  quiet.destroy();
  quiet.update(999);
  quiet.input('key-down', { key: 'ArrowUp' });
  assert.equal(destroyed.length, 0);
});

test('state snapshots are isolated and ranked rules reject forged results', () => {
  const game = createGame({ seed: 17 });
  const state = game.getState();
  state.target.direction = 99;
  assert.notEqual(game.getState().target.direction, 99);

  const good = { score: 1200, elapsed: 8, won: true, progress: 12, lives: 2 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1100 },
    { ...good, score: 1190 },
    { ...good, progress: 11 },
    { ...good, lives: 0 },
    { ...good, won: false },
    { ...good, elapsed: 2 },
    { ...good, elapsed: 61 },
    { score: 300, elapsed: 2, won: false, progress: 3, lives: 2 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'dew' }), good);
});
