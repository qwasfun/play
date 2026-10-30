import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  FLIGHT,
  generateCourse,
  passTime,
  ringCenter,
  fitsRing,
} from '../src/index.js';
import { rules } from '../src/rules.js';
const tick = (g, seconds) => {
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) g.update(Math.min(1 / 60, seconds - t));
};
function fly(g, misses = 0) {
  const rings = generateCourse(42);
  while (!g.getState().finished) {
    const s = g.getState(),
      ring = rings[s.handled];
    const target = s.handled < misses ? FLIGHT.top : ringCenter(ring, passTime(ring));
    const dir = Math.abs(s.y - target) < 4 ? 0 : s.y > target ? -1 : 1;
    g.input('primary-down', { x: 300, y: dir < 0 ? 120 : 360 });
    if (!dir) g.input('primary-up');
    g.update(1 / 60);
  }
}
test('course is deterministic, varied, bounded and every adjacent ring is reachable', () => {
  for (let seed = 0; seed < 300; seed++) {
    const course = generateCourse(seed);
    assert.deepEqual(course, generateCourse(seed));
    assert.equal(course.length, 12);
    let oldY = 240,
      oldTime = 0;
    for (const ring of course) {
      const time = passTime(ring),
        center = ringCenter(ring, time);
      assert.ok(center >= FLIGHT.top + FLIGHT.radius && center <= FLIGHT.bottom - FLIGHT.radius);
      assert.ok(Math.abs(center - oldY) < FLIGHT.lift * (time - oldTime));
      assert.ok(time < 60);
      oldY = center;
      oldTime = time;
    }
  }
  assert.notDeepEqual(generateCourse(42), generateCourse(43));
});
test('ring clearance includes the full kite, with exact inclusive boundary', () => {
  assert.equal(fitsRing(240, 240), true);
  assert.equal(fitsRing(240 + FLIGHT.halfGap - FLIGHT.radius, 240), true);
  assert.equal(fitsRing(240 + FLIGHT.halfGap - FLIGHT.radius + 0.001, 240), false);
  assert.equal(fitsRing(NaN, 240), false);
});
test('held keyboard input moves continuously, repeats do not latch and opposed keys cancel', () => {
  const g = createGame({ seed: 42 });
  g.input('key-down', { key: 'ArrowUp', repeat: true });
  tick(g, 0.2);
  assert.equal(g.getState().y, 240);
  g.input('key-down', { key: 'W' });
  tick(g, 0.5);
  assert.ok(Math.abs(g.getState().y - 150) < 0.01);
  g.input('key-down', { key: 's' });
  tick(g, 0.2);
  assert.ok(Math.abs(g.getState().y - 150) < 0.01);
  g.input('key-up', { key: 'W' });
  tick(g, 0.5);
  assert.ok(Math.abs(g.getState().y - 240) < 0.01);
  g.input('key-up', { key: 's' });
  tick(g, 0.2);
  assert.ok(Math.abs(g.getState().y - 240) < 0.01);
});
test('pointer press, drag, release, cancel and invalid coordinates cannot leave stuck input', () => {
  const g = createGame({ seed: 42 });
  g.input('primary-down', { x: 300, y: 120 });
  tick(g, 0.5);
  assert.ok(Math.abs(g.getState().y - 150) < 0.01);
  g.input('primary-move', { x: 300, y: 360 });
  tick(g, 0.5);
  assert.ok(Math.abs(g.getState().y - 240) < 0.01);
  g.input('primary-up');
  tick(g, 0.2);
  assert.ok(Math.abs(g.getState().y - 240) < 0.01);
  g.input('key-down', { key: 's' });
  g.input('primary-cancel');
  tick(g, 0.2);
  assert.equal(g.getState().direction, 0);
  for (const p of [{ x: -1, y: 20 }, { x: 300, y: 481 }, { x: NaN, y: 20 }, {}]) {
    g.input('primary-down', p);
    assert.equal(g.getState().direction, 0);
  }
  g.input('primary-down', { x: 50, y: 40 });
  g.input('primary-move', { x: 900, y: 20 });
  assert.equal(g.getState().direction, 0);
});
test('flight boundaries clamp without deducting lives before any ring', () => {
  const g = createGame({ seed: 42 });
  g.input('key-down', { key: 'ArrowUp' });
  tick(g, 1);
  assert.equal(g.getState().y, FLIGHT.top);
  assert.equal(g.getState().lives, 3);
  g.input('primary-cancel');
  g.input('key-down', { key: 'ArrowDown' });
  tick(g, 2);
  assert.equal(g.getState().y, FLIGHT.bottom);
  assert.equal(g.getState().lives, 3);
});
test('twelve real crossings win exactly once; snapshots cannot mutate the course', () => {
  const results = [],
    g = createGame({ seed: 42, onFinish: (r) => results.push(r) });
  const snapshot = g.getState();
  snapshot.rings[0].y = -100;
  assert.notEqual(g.getState().rings[0].y, -100);
  fly(g);
  assert.equal(results.length, 1);
  assert.equal(results[0].won, true);
  assert.equal(results[0].score, 1200);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = g.getState();
  g.update(999);
  g.input('key-down', { key: 'w' });
  assert.deepEqual(g.getState(), end);
  assert.equal(results.length, 1);
});
test('two missed rings still permit completion; third miss ends the flight once', () => {
  for (const misses of [2, 3]) {
    const results = [],
      g = createGame({ seed: 42, onFinish: (r) => results.push(r) });
    fly(g, misses);
    assert.equal(results.length, 1);
    assert.equal(results[0].won, misses === 2);
    assert.equal(results[0].lives, 3 - misses);
    assert.deepEqual(rules.validate(results[0]), []);
    assert.equal(results[0].handled, misses === 2 ? 12 : 3);
  }
});
test('invalid time is ignored, delayed frames preserve crossings, fresh game repeats seed', () => {
  const a = createGame({ seed: 42 }),
    b = createGame({ seed: 42 });
  for (const dt of [NaN, Infinity, -1, 0]) a.update(dt);
  assert.equal(a.getState().elapsed, 0);
  a.update(3);
  tick(b, 3);
  assert.ok(Math.abs(a.getState().elapsed - b.getState().elapsed) < 1e-7);
  for (let i = 0; i < 12; i++) {
    assert.ok(Math.abs(a.getState().rings[i].x - b.getState().rings[i].x) < 1e-7);
    assert.ok(Math.abs(a.getState().rings[i].y - b.getState().rings[i].y) < 1e-7);
  }
  a.input('primary-down', { x: 100, y: 100 });
  a.destroy();
  a.update(1);
  const fresh = createGame({ seed: 42 });
  assert.equal(fresh.getState().y, 240);
  assert.equal(fresh.getState().elapsed, 0);
  assert.deepEqual(fresh.getState().rings, createGame({ seed: 42 }).getState().rings);
});
test('ranked policy rejects forged counters, impossible early finish and score or life mismatch', () => {
  const good = { score: 1200, elapsed: 34, won: true, passed: 12, handled: 12, lives: 3 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1100 },
    { ...good, won: false },
    { ...good, elapsed: 1 },
    { ...good, lives: 2 },
    { ...good, passed: 13 },
    { ...good, handled: 11 },
    { ...good, handled: 12.5 },
    { ...good, elapsed: 61 },
    { ...good, score: 1150 },
    { ...good, passed: 0, score: 0, handled: 0, won: false },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, privateField: 'drop' }), good);
  assert.equal(rules.compare(good, { ...good, score: 1100 }), true);
  assert.equal(rules.stored(good), true);
});
