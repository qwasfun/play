import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/index.js';
import { rules } from '../src/rules.js';
const tap = (g, x, y) => {
  g.input('primary-down', { x, y });
  g.input('primary-up', { x, y });
};
const key = (g, key) => g.input('key-down', { key });
test('cancel, repeated key, invalid elapsed, timeout and terminal idempotence', () => {
  let results = [];
  const g = createGame({ seed: 42, onFinish: (r) => results.push(r) });
  const before = JSON.stringify(g.getState());
  g.update(NaN);
  g.update(-1);
  g.input('primary-down', { x: 300, y: 300 });
  g.input('primary-cancel');
  g.input('primary-up', { x: 300, y: 300 });
  g.input('key-down', { key: ' ', repeat: true });
  assert.equal(JSON.stringify(g.getState()), before);
  g.update(180);
  assert.equal(results.length, 1);
  assert.equal(results[0].won, false);
  assert.deepEqual(rules.validate(results[0]), []);
  key(g, ' ');
  g.update(180);
  assert.equal(results.length, 1);
});
test('all jug targets have reachable nontrivial solutions; input matches pouring rules', () => {
  let result;
  const g = createGame({ seed: 1, onFinish: (r) => (result = r) });
  for (const target of [4, 2, 1]) {
    const q = [[0, 0, []]],
      seen = new Set();
    let answer;
    while (q.length) {
      const [a, b, path] = q.shift();
      if (a === target || b === target) {
        answer = path;
        break;
      }
      if (seen.has(`${a},${b}`)) continue;
      seen.add(`${a},${b}`);
      const x = Math.min(a, 5 - b),
        y = Math.min(b, 3 - a);
      [
        [3, b],
        [a, 5],
        [0, b],
        [a, 0],
        [a - x, b + x],
        [a + y, b - y],
      ].forEach(([c, d], i) => q.push([c, d, [...path, i]]));
    }
    assert.ok(answer.length);
    for (const i of answer) tap(g, 160 + (i % 3) * 140, 303 + Math.floor(i / 3) * 90);
  }
  assert.equal(result.score, 300);
  assert.equal(result.won, true);
  assert.deepEqual(rules.validate(result), []);
  assert.ok(rules.validate({ ...result, score: 299 }).length);
});
