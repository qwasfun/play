import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GARDEN_SPRINKLER,
  createGame,
  generateCourse,
  potPoint,
  responseWindow,
} from '../src/index.js';
import { rules } from '../src/rules.js';

const reveal = (game) => game.update(GARDEN_SPRINKLER.reveal + 0.01);

const clickPot = (game, slot) => {
  const point = potPoint(slot);
  game.input('primary-down', point);
  game.input('primary-up', point);
};

test('seeded courses are deterministic, varied and never repeat a pot immediately', () => {
  assert.deepEqual(generateCourse('same'), generateCourse('same'));
  assert.notDeepEqual(generateCourse('same'), generateCourse('different'));
  const course = generateCourse('garden');
  assert.equal(course.length, GARDEN_SPRINKLER.rounds);
  course.forEach((item, index) => {
    assert.ok(item.pot >= 0 && item.pot < GARDEN_SPRINKLER.pots);
    if (index) assert.notEqual(item.pot, course[index - 1].pot);
  });
});

test('response windows tighten gradually while staying readable', () => {
  const windows = Array.from({ length: GARDEN_SPRINKLER.rounds }, (_, round) =>
    responseWindow(round),
  );
  assert.equal(windows[0], 2.65);
  assert.ok(windows.at(-1) >= 1.25);
  windows.slice(1).forEach((window, index) => assert.ok(window < windows[index]));
  assert.throws(() => responseWindow(-1), /超出/);
});

test('pot points sit in eight distinct reachable positions around the sprinkler', () => {
  const points = Array.from({ length: GARDEN_SPRINKLER.pots }, (_, slot) => potPoint(slot));
  assert.equal(new Set(points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`)).size, 8);
  points.forEach(({ x, y }) => assert.ok(Math.abs(Math.hypot(x - 300, y - 220) - 136) < 1e-8));
});

test('pointer requires a matching press and release and cancellation stays inert', () => {
  const game = createGame({ seed: 'pointer' });
  reveal(game);
  const target = game.getState().target.pot;
  game.input('primary-down', potPoint(target));
  game.input('primary-cancel');
  game.input('primary-up', potPoint(target));
  assert.equal(game.getState().shots, 0);
  game.input('primary-down', potPoint(target));
  game.input('primary-up', potPoint((target + 1) % 8));
  assert.equal(game.getState().shots, 0);
  clickPot(game, target);
  assert.equal(game.getState().watered, 1);
});

test('keyboard rotates the nozzle, ignores repeats and reports a wrong spray', () => {
  const game = createGame({ seed: 'keyboard' });
  reveal(game);
  game.input('key-down', { key: 'ArrowRight' });
  assert.equal(game.getState().selected, 1);
  game.input('key-down', { key: 'ArrowRight', repeat: true });
  assert.equal(game.getState().selected, 1);
  const target = game.getState().target.pot;
  if (target === 1) game.input('key-down', { key: 'ArrowRight' });
  game.input('key-down', { key: 'Enter' });
  assert.equal(game.getState().shots, 1);
  assert.equal(game.getState().lives, 2);
  assert.match(game.getState().hint, /空花盆/);
});

test('real pointer input waters all twelve pots and produces a ranked win', () => {
  const results = [];
  const game = createGame({ seed: 'complete', onFinish: (result) => results.push(result) });
  for (let round = 0; round < GARDEN_SPRINKLER.rounds; round++) {
    reveal(game);
    clickPot(game, game.getState().target.pot);
  }
  assert.equal(results.length, 1);
  assert.equal(results[0].score, 1200);
  assert.ok(
    Math.abs(results[0].elapsed - GARDEN_SPRINKLER.rounds * (GARDEN_SPRINKLER.reveal + 0.01)) <
      1e-9,
  );
  assert.equal(results[0].won, true);
  assert.equal(results[0].watered, 12);
  assert.equal(results[0].shots, 12);
  assert.equal(results[0].lives, 3);
  assert.deepEqual(rules.validate(results[0]), []);
});

test('three missed windows finish safely and invalid time or destroy cannot submit', () => {
  const results = [];
  const game = createGame({ seed: 'miss', onFinish: (result) => results.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  game.update(999);
  assert.equal(results.length, 1);
  assert.equal(results[0].won, false);
  assert.equal(results[0].lives, 0);
  assert.equal(results[0].shots, 0);
  assert.deepEqual(rules.validate(results[0]), []);

  const destroyed = [];
  const quiet = createGame({ seed: 'quiet', onFinish: (result) => destroyed.push(result) });
  quiet.destroy();
  quiet.update(999);
  quiet.input('key-down', { key: 'Space' });
  assert.equal(destroyed.length, 0);
});

test('state snapshots are isolated and ranked rules reject forged counters', () => {
  const game = createGame({ seed: 'snapshot' });
  const snapshot = game.getState();
  snapshot.target.pot = 99;
  assert.notEqual(game.getState().target.pot, 99);

  const good = { score: 1200, elapsed: 14, won: true, watered: 12, shots: 14, lives: 1 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1100 },
    { ...good, watered: 11 },
    { ...good, shots: 11 },
    { ...good, shots: 16 },
    { ...good, won: false },
    { score: 300, elapsed: 2, won: false, watered: 3, shots: 3, lives: 3 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'dew' }), good);
});
