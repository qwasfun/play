import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, feedback, generateSecret } from '../src/index.js';
import { rules } from '../src/rules.js';

const symbolPoint = (value) => ({ x: 132 + (value - 1) * 84, y: 164 });
const submitPoint = { x: 510, y: 110 };

function tap(game, point, release = point) {
  game.input('primary-down', point);
  game.input('primary-up', release);
}

function enter(game, values, keyboard = false) {
  for (const value of values)
    if (keyboard) game.input('key-down', { key: String(value) });
    else tap(game, symbolPoint(value));
  if (keyboard) game.input('key-down', { key: 'Enter' });
  else tap(game, submitPoint);
}

test('seeded garden codes are deterministic, varied and contain at least three symbols', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 400; seed++) {
    const secret = generateSecret(seed);
    assert.deepEqual(secret, generateSecret(seed));
    assert.equal(secret.length, 4);
    assert.ok(secret.every((value) => Number.isInteger(value) && value >= 1 && value <= 5));
    assert.ok(new Set(secret).size >= 3);
    signatures.add(secret.join(''));
  }
  assert.ok(signatures.size > 100);
  assert.notDeepEqual(generateSecret(42), generateSecret(43));
});

test('feedback handles exact, displaced and duplicate symbols without double counting', () => {
  assert.deepEqual(feedback([1, 2, 3, 4], [1, 2, 3, 4]), { exact: 4, near: 0 });
  assert.deepEqual(feedback([1, 2, 3, 4], [4, 3, 2, 1]), { exact: 0, near: 4 });
  assert.deepEqual(feedback([1, 1, 2, 3], [1, 2, 1, 1]), { exact: 1, near: 2 });
  assert.deepEqual(feedback([1, 2, 3, 4], [5, 5, 5, 5]), { exact: 0, near: 0 });
  for (const pair of [
    [[], []],
    [
      [1, 2, 3, 4],
      [1, 2],
    ],
  ])
    assert.throws(() => feedback(pair[0], pair[1]));
});

test('cancel, drag out, invalid points, repeats and incomplete submissions never spend an attempt', () => {
  const game = createGame({ seed: 42 });
  game.input('primary-down', symbolPoint(1));
  game.input('primary-cancel');
  game.input('primary-up', symbolPoint(1));
  game.input('primary-down', symbolPoint(2));
  game.input('primary-up', symbolPoint(3));
  for (const point of [{}, { x: NaN, y: 164 }, { x: 20, y: 20 }]) tap(game, point);
  game.input('key-down', { key: '1', repeat: true });
  game.input('key-down', { key: 'Enter' });
  tap(game, submitPoint);
  assert.deepEqual(game.getState().draft, [0, 0, 0, 0]);
  assert.equal(game.getState().attempts, 0);
});

test('pointer, direct keys, cursor cycling and clearing edit the intended slots', () => {
  const game = createGame({ seed: 42 });
  tap(game, symbolPoint(2));
  game.input('key-down', { key: '3' });
  game.input('key-down', { key: 'ArrowUp' });
  game.input('key-down', { key: 'ArrowRight' });
  game.input('key-down', { key: 'ArrowDown' });
  assert.deepEqual(game.getState().draft, [2, 3, 1, 5]);
  game.input('key-down', { key: 'Backspace' });
  assert.deepEqual(game.getState().draft, [2, 3, 1, 0]);
  tap(game, { x: 210, y: 100 });
  tap(game, symbolPoint(4));
  assert.deepEqual(game.getState().draft, [2, 4, 1, 0]);
});

test('a wrong flower slip yields honest feedback and state snapshots are isolated', () => {
  const game = createGame({ seed: 42 });
  const secret = generateSecret(42);
  const wrong = secret.map((value) => (value % 5) + 1);
  enter(game, wrong);
  const expected = feedback(secret, wrong);
  const state = game.getState();
  assert.equal(state.attempts, 1);
  assert.deepEqual(state.history[0], { guess: wrong, ...expected });
  state.history[0].guess[0] = 99;
  state.draft[0] = 99;
  assert.deepEqual(game.getState().history[0].guess, wrong);
  assert.deepEqual(game.getState().draft, [0, 0, 0, 0]);
});

test('real keyboard and pointer entries solve a code once with a valid ranked result', () => {
  for (const keyboard of [true, false]) {
    const results = [];
    const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
    enter(game, generateSecret(42), keyboard);
    assert.equal(results.length, 1);
    assert.deepEqual(results[0], {
      score: 1000,
      elapsed: 0,
      won: true,
      attempts: 1,
      exact: 4,
    });
    assert.deepEqual(rules.validate(results[0]), []);
    const end = game.getState();
    enter(game, [1, 2, 3, 4], keyboard);
    game.update(999);
    assert.deepEqual(game.getState(), end);
    assert.equal(results.length, 1);
  }
});

test('eight wrong guesses end the game and timeout clamps elapsed', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  const secret = generateSecret(42);
  const wrong = secret.map((value) => (value % 5) + 1);
  assert.ok(feedback(secret, wrong).exact < 4);
  for (let attempt = 0; attempt < 8; attempt++) enter(game, wrong);
  assert.deepEqual(results[0], {
    score: 0,
    elapsed: 0,
    won: false,
    attempts: 8,
    exact: feedback(secret, wrong).exact,
  });
  assert.deepEqual(rules.validate(results[0]), []);

  const timed = [];
  const timeout = createGame({ seed: 7, onFinish: (result) => timed.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) timeout.update(dt);
  timeout.update(999);
  timeout.update(1);
  assert.deepEqual(timed[0], { score: 0, elapsed: 180, won: false, attempts: 0, exact: 0 });
  assert.deepEqual(rules.validate(timed[0]), []);
});

test('result rules reject forged scores, counters, win state and unfinished losses', () => {
  const good = { score: 800, elapsed: 40, won: true, attempts: 3, exact: 4 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 900 },
    { ...good, score: 850 },
    { ...good, won: false },
    { ...good, attempts: 0 },
    { ...good, attempts: 9 },
    { ...good, exact: 3 },
    { ...good, exact: 4.5 },
    { ...good, elapsed: 181 },
    { score: 0, elapsed: 40, won: false, attempts: 4, exact: 2 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'drop' }), good);
});
