import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  generateCourse,
  laneFromPoint,
  LANE_Y,
  MOON_MOTH,
  validPoint,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function complete(game, course, input = 'key-down') {
  for (const gate of course.gates) {
    if (input === 'primary-down') game.input(input, { x: 300, y: LANE_Y[gate.lane] });
    else game.input(input, { key: String(gate.lane + 1), repeat: false });
    game.update(gate.at - game.getState().elapsed + 0.001);
  }
}

test('seeded courses are deterministic, varied and cover all lanes', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 240; seed++) {
    const course = generateCourse(seed);
    assert.deepEqual(course, generateCourse(seed));
    assert.equal(course.gates.length, MOON_MOTH.total);
    assert.deepEqual([...new Set(course.gates.map(({ lane }) => lane))].sort(), [0, 1, 2]);
    assert.ok(course.gates.every(({ lane }) => lane >= 0 && lane <= 2));
    assert.ok(course.gates.every(({ at }, index) => at === 3 + index * 2.55));
    signatures.add(course.gates.map(({ lane }) => lane).join(''));
  }
  assert.ok(signatures.size > 230);
  assert.notDeepEqual(generateCourse(42), generateCourse(43));
});

test('keyboard lane movement and direct keys complete a run once', () => {
  const results = [];
  const game = createGame({ seed: 17, onFinish: (result) => results.push(result) });
  game.input('key-down', { key: 'ArrowUp', repeat: false });
  assert.equal(game.getState().lane, 0);
  game.input('key-down', { key: 's', repeat: false });
  assert.equal(game.getState().lane, 1);
  complete(game, generateCourse(17));
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 1500,
    elapsed: game.getState().elapsed,
    won: true,
    progress: 15,
    gates: 15,
    lives: 3,
  });
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.input('key-down', { key: '1' });
  game.update(999);
  assert.deepEqual(game.getState(), end);
});

test('pointer input can chase all fifteen lights', () => {
  const results = [];
  const game = createGame({ seed: 73, onFinish: (result) => results.push(result) });
  complete(game, generateCourse(73), 'primary-down');
  assert.equal(results[0].score, 1500);
  assert.equal(results[0].won, true);
  assert.deepEqual(rules.validate(results[0]), []);
});

test('wrong lanes spend leaves and stop after the third mist gate', () => {
  const results = [];
  const game = createGame({ seed: 9, onFinish: (result) => results.push(result) });
  const course = generateCourse(9);
  for (const gate of course.gates.slice(0, 3)) {
    game.input('key-down', { key: String(((gate.lane + 1) % 3) + 1), repeat: false });
    game.update(gate.at - game.getState().elapsed + 0.001);
  }
  assert.equal(results.length, 1);
  assert.equal(results[0].lives, 0);
  assert.equal(results[0].gates, 3);
  assert.equal(results[0].progress, 0);
  assert.deepEqual(rules.validate(results[0]), []);
});

test('pointer boundaries map all three wide touch lanes', () => {
  assert.equal(validPoint({ x: 24, y: 112 }), true);
  assert.equal(validPoint({ x: 576, y: 399 }), true);
  assert.equal(laneFromPoint({ x: 300, y: 164 }), 0);
  assert.equal(laneFromPoint({ x: 300, y: 258 }), 1);
  assert.equal(laneFromPoint({ x: 300, y: 352 }), 2);
  for (const point of [
    {},
    { x: NaN, y: 164 },
    { x: 23, y: 164 },
    { x: 577, y: 164 },
    { x: 300, y: 111 },
    { x: 300, y: 400 },
  ])
    assert.equal(laneFromPoint(point), -1);
});

test('repeated, unknown and out-of-range movement stays safe', () => {
  const game = createGame({ seed: 4 });
  game.input('key-down', { key: 'ArrowUp', repeat: true });
  game.input('key-down', { key: 'x', repeat: false });
  game.input('primary-down', { x: 0, y: 0 });
  assert.equal(game.getState().lane, MOON_MOTH.startLane);
  game.input('key-down', { key: '1', repeat: false });
  game.input('key-down', { key: 'ArrowUp', repeat: false });
  assert.equal(game.getState().lane, 0);
  game.input('key-down', { key: '3', repeat: false });
  game.input('key-down', { key: 'ArrowDown', repeat: false });
  assert.equal(game.getState().lane, 2);
});

test('invalid time is ignored, timeout is bounded and destroy stays silent', () => {
  const timed = [];
  const game = createGame({ seed: 4, onFinish: (result) => timed.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  game.update(999);
  assert.equal(timed.length, 1);
  assert.ok(timed[0].elapsed <= MOON_MOTH.limit);
  assert.equal(timed[0].won, false);
  assert.deepEqual(rules.validate(timed[0]), []);

  const destroyed = [];
  const quiet = createGame({ seed: 1, onFinish: (result) => destroyed.push(result) });
  quiet.destroy();
  quiet.update(999);
  quiet.input('key-down', { key: '1' });
  assert.equal(destroyed.length, 0);
});

test('ranked rules accept genuine results and reject forged counters', () => {
  const good = { score: 1500, elapsed: 39, won: true, progress: 15, gates: 15, lives: 3 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1400 },
    { ...good, progress: 14 },
    { ...good, gates: 14 },
    { ...good, lives: 2 },
    { ...good, won: false },
    { ...good, elapsed: 51 },
    { score: 100, elapsed: 3, won: false, progress: 1, gates: 2, lives: 0 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'moon' }), good);
});
