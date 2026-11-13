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
test('row/column solver completes seeded boards, accepts clue-equivalent solutions', () => {
  for (let seed = 0; seed < 40; seed++) {
    let result;
    const g = createGame({ seed, onFinish: (r) => (result = r) }),
      s = g.getState();
    const groups = (a) => {
      const out = [];
      let n = 0;
      for (const v of [...a, 0])
        if (v) n++;
        else if (n) {
          out.push(n);
          n = 0;
        }
      return out.length ? out : [0];
    };
    const choices = s.rows.map((r) =>
      Array.from({ length: 32 }, (_, m) =>
        Array.from({ length: 5 }, (_, c) => (m >> c) & 1),
      ).filter((a) => String(groups(a)) === String(r)),
    );
    let answer;
    function solve(rows) {
      if (rows.length === 5) {
        if (s.cols.every((c, j) => String(c) === String(groups(rows.map((r) => r[j])))))
          answer = rows.flat();
        return;
      }
      for (const a of choices[rows.length]) {
        solve([...rows, a]);
        if (answer) return;
      }
    }
    solve([]);
    assert.ok(answer);
    key(g, 'Enter');
    assert.equal(g.getState().finished, false);
    answer.forEach((v, i) => {
      if (v) tap(g, 230 + (i % 5) * 60, 120 + Math.floor(i / 5) * 60);
    });
    key(g, 'Enter');
    assert.equal(result.won, true);
    assert.deepEqual(rules.validate(result), []);
  }
});
