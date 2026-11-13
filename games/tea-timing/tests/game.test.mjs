import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, generateCourse, kettlePoint, TEA_TIMING } from '../src/index.js';
import { rules } from '../src/rules.js';

function tap(game, station) {
  const point = kettlePoint(station);
  game.input('primary-down', point);
  game.input('primary-up', point);
}

function complete(game, seed) {
  for (const [index, entry] of generateCourse(seed).entries()) {
    game.update(entry.duration * 0.72);
    tap(game, entry.station);
    if (index < TEA_TIMING.rounds - 1) game.update(0.45);
  }
}

test('seeded tea courses are deterministic, varied, bounded and avoid repeated furnaces', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const course = generateCourse(seed);
    assert.deepEqual(course, generateCourse(seed));
    assert.equal(course.length, TEA_TIMING.rounds);
    for (const [index, entry] of course.entries()) {
      assert.ok(Number.isInteger(entry.station) && entry.station >= 0 && entry.station <= 2);
      assert.ok(entry.duration >= 1.2 && entry.duration <= 2.1);
      if (index) assert.notEqual(entry.station, course[index - 1].station);
    }
    signatures.add(course.map(({ station }) => station).join(''));
  }
  assert.ok(signatures.size >= 100);
  assert.notDeepEqual(generateCourse(42), generateCourse(43));
});

test('real pointer taps at the golden heat complete twelve kettles once', () => {
  const course = generateCourse(42);
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  complete(game, 42);
  assert.equal(results.length, 1);
  assert.deepEqual(
    { ...results[0], elapsed: undefined },
    {
      score: 1200,
      elapsed: undefined,
      won: true,
      cups: 12,
      handled: 12,
      lives: 3,
    },
  );
  const expectedElapsed =
    course.reduce((total, entry) => total + entry.duration * 0.72, 0) +
    (TEA_TIMING.rounds - 1) * 0.45;
  assert.ok(Math.abs(results[0].elapsed - expectedElapsed) < 1e-9);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.update(999);
  tap(game, 0);
  assert.deepEqual(game.getState(), end);
});

test('A S D direct keys and arrow selection use the intended furnaces', () => {
  const course = generateCourse(7);
  const first = course[0];
  const game = createGame({ seed: 7 });
  game.update(first.duration * 0.72);
  game.input('key-down', { key: ['a', 's', 'd'][first.station] });
  assert.equal(game.getState().cups, 1);
  game.update(0.45);
  const second = course[1];
  game.update(second.duration * 0.72);
  while (game.getState().cursor !== second.station) game.input('key-down', { key: 'ArrowRight' });
  game.input('key-down', { key: 'Enter' });
  assert.equal(game.getState().cups, 2);
  game.input('key-down', { key: ' ', repeat: true });
  assert.equal(game.getState().handled, 2);
});

test('early, wrong and overheated kettles each consume exactly one chance', () => {
  const course = generateCourse(11);
  const results = [];
  const game = createGame({ seed: 11, onFinish: (result) => results.push(result) });
  tap(game, course[0].station);
  assert.equal(game.getState().lives, 2);
  game.update(0.45);
  tap(game, (course[1].station + 1) % 3);
  assert.equal(game.getState().lives, 1);
  game.update(0.45);
  game.update(course[2].duration);
  assert.equal(game.getState().lives, 0);
  assert.deepEqual(
    { ...results[0], elapsed: undefined },
    {
      score: 0,
      elapsed: undefined,
      won: false,
      cups: 0,
      handled: 3,
      lives: 0,
    },
  );
  assert.ok(Math.abs(results[0].elapsed - (0.9 + course[2].duration)) < 1e-9);
  assert.deepEqual(rules.validate(results[0]), []);
});

test('cancelled, mismatched, invalid and unrelated inputs stay harmless', () => {
  const game = createGame({ seed: 5 });
  const target = game.getState().target;
  const point = kettlePoint(target);
  game.input('primary-down', point);
  game.input('primary-cancel');
  game.input('primary-up', point);
  game.input('primary-down', kettlePoint(0));
  game.input('primary-up', kettlePoint(1));
  for (const payload of [{}, { x: NaN, y: 220 }, { x: 20, y: 20 }, { x: Infinity, y: 220 }]) {
    game.input('primary-down', payload);
    game.input('primary-up', payload);
  }
  game.input('key-down', { key: 'q' });
  game.input('key-down', { key: 'a', repeat: true });
  assert.equal(game.getState().handled, 0);
  assert.equal(game.getState().lives, 3);
});

test('transition locks input and the next kettle starts from cold', () => {
  const course = generateCourse(19);
  const game = createGame({ seed: 19 });
  game.update(course[0].duration * 0.72);
  tap(game, course[0].station);
  assert.equal(game.getState().phase, 'transition');
  tap(game, course[1].station);
  assert.equal(game.getState().handled, 1);
  game.update(0.45);
  assert.equal(game.getState().phase, 'play');
  assert.equal(game.getState().heat, 0);
  assert.equal(game.getState().target, course[1].station);
});

test('large updates settle safely, timeout clamps and destroy remains silent', () => {
  const results = [];
  const game = createGame({ seed: 12, onFinish: (result) => results.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  game.update(999);
  assert.equal(results.length, 1);
  assert.equal(results[0].won, false);
  assert.equal(results[0].lives, 0);
  assert.ok(results[0].elapsed < TEA_TIMING.limit);
  assert.deepEqual(rules.validate(results[0]), []);

  const timed = [];
  const timeout = createGame({ seed: 8, onFinish: (result) => timed.push(result) });
  timeout.update(74.9);
  if (!timeout.getState().finished) timeout.update(1);
  assert.equal(timed.length, 1);
  assert.ok(timed[0].lives === 0 || timed[0].elapsed === TEA_TIMING.limit);

  const quiet = [];
  const destroyed = createGame({ seed: 9, onFinish: (result) => quiet.push(result) });
  destroyed.destroy();
  destroyed.update(999);
  assert.equal(quiet.length, 0);
});

test('snapshots are isolated and rules reject forged scores and unfinished losses', () => {
  const game = createGame({ seed: 42 });
  const state = game.getState();
  state.course[0].station = 99;
  assert.notEqual(game.getState().course[0].station, 99);

  const good = { score: 900, elapsed: 30, won: false, cups: 9, handled: 12, lives: 1 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 800 },
    { ...good, score: 950 },
    { ...good, cups: 10 },
    { ...good, handled: 8 },
    { ...good, won: true },
    { score: 1200, elapsed: 76, won: true, cups: 12, handled: 12, lives: 3 },
    { score: 500, elapsed: 20, won: false, cups: 5, handled: 7, lives: 2 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'drop' }), good);
});
