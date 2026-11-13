import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, generateBoard, moveFruit, isSorted } from '../src/index.js';
import { rules } from '../src/rules.js';
import { solution } from '../qa/playthrough.mjs';
const tap = (g, i) => {
  g.input('primary-down', { x: 90 + i * 140, y: 220 });
  g.input('primary-up', { x: 90 + i * 140, y: 220 });
};
test('seeded boards preserve nine fruits, capacity, variation and solvability', () => {
  for (const seed of [0, 42, 12345])
    for (let round = 0; round < 3; round++) {
      const b = generateBoard(seed, round);
      assert.deepEqual(b, generateBoard(seed, round));
      assert.equal(isSorted(b), false);
      assert.ok(b.every((a) => a.length <= 3));
      assert.deepEqual(b.flat().sort(), [0, 0, 0, 1, 1, 1, 2, 2, 2]);
      for (const [a, c] of solution(b)) assert.equal(moveFruit(b, a, c), true);
      assert.equal(isSorted(b), true);
    }
  assert.notDeepEqual(generateBoard(42), generateBoard(43));
});
test('only top fruit moves; full, empty, same and invalid baskets reject without mutation', () => {
  const b = [[0, 1], [1, 2, 0], [], [2]];
  const before = structuredClone(b);
  for (const m of [
    [0, 1],
    [2, 0],
    [0, 0],
    [-1, 0],
    [0, 4],
    [0.2, 0],
  ])
    assert.equal(moveFruit(b, ...m), false);
  assert.deepEqual(b, before);
  assert.equal(moveFruit(b, 0, 2), true);
  assert.deepEqual(b, [[0], [1, 2, 0], [1], [2]]);
});
test('pointer cancellation, drag out, repeat keys, snapshot isolation and undo preserve progress', () => {
  const g = createGame({ seed: 42 });
  const b = g.getState().baskets;
  const [a, c] = solution(b)[0];
  g.input('primary-down', { x: 90 + a * 140, y: 220 });
  g.input('primary-cancel');
  g.input('primary-up', { x: 90 + a * 140, y: 220 });
  assert.equal(g.getState().selected, -1);
  g.input('primary-down', { x: 90 + a * 140, y: 220 });
  g.input('primary-up', { x: -1, y: 220 });
  assert.equal(g.getState().selected, -1);
  g.input('key-down', { key: 'Enter', repeat: true });
  assert.equal(g.getState().selected, -1);
  tap(g, a);
  tap(g, c);
  assert.equal(g.getState().steps, 1);
  g.update(2);
  g.input('key-down', { key: 'z' });
  assert.deepEqual(g.getState().baskets, b);
  assert.equal(g.getState().steps, 1);
  assert.equal(g.getState().elapsed, 2);
  const snapshot = g.getState();
  snapshot.baskets[0].push(99);
  assert.deepEqual(g.getState().baskets, b);
});
test('keyboard and pointer complete all rounds, emit one valid ranked result and lock after finish', () => {
  const results = [],
    g = createGame({ seed: 42, onFinish: (r) => results.push(r) });
  for (let round = 0; round < 3; round++)
    for (const [a, c] of solution(g.getState().baskets)) {
      if (round === 0) {
        for (const i of [a, c]) {
          while (g.getState().cursor !== i) g.input('key-down', { key: 'ArrowRight' });
          g.input('key-down', { key: 'Enter' });
        }
      } else {
        tap(g, a);
        tap(g, c);
      }
      g.update(0.1);
    }
  assert.equal(g.getState().won, true);
  assert.equal(results.length, 1);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = g.getState();
  tap(g, 0);
  g.update(200);
  g.input('key-down', { key: 'z' });
  assert.deepEqual(g.getState(), end);
  assert.equal(results.length, 1);
});
test('timeout ignores invalid dt, clamps time and settles partial score once', () => {
  const results = [],
    g = createGame({ seed: 42, onFinish: (r) => results.push(r) });
  g.update(NaN);
  g.update(-1);
  assert.equal(g.getState().elapsed, 0);
  for (const [a, c] of solution(g.getState().baskets)) {
    tap(g, a);
    tap(g, c);
  }
  g.update(999);
  g.update(10);
  assert.equal(results.length, 1);
  assert.deepEqual(
    { ...results[0], steps: 0 },
    { score: 100, rounds: 1, steps: 0, elapsed: 180, won: false },
  );
  assert.deepEqual(rules.validate(results[0]), []);
});
test('rule policy rejects score-progress mismatch, fake win and out of range counters', () => {
  const r = { score: 300, rounds: 3, steps: 12, elapsed: 30, won: true };
  assert.deepEqual(rules.validate(r), []);
  for (const bad of [
    { ...r, score: 200 },
    { ...r, won: false },
    { ...r, steps: 0 },
    { ...r, rounds: 4 },
    { ...r, elapsed: 181 },
    { ...r, steps: 1.5 },
  ])
    assert.ok(rules.validate(bad).length);
});
