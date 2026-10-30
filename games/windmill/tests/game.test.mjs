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
test('twelve timed hits win; three off-target hits lose', () => {
  for (const win of [true, false]) {
    let result;
    const g = createGame({ seed: 42, onFinish: (r) => (result = r) });
    if (win) {
      for (let i = 0; i < 12; i++) {
        const s = g.getState(),
          delta = (s.target - s.angle + Math.PI * 2) % (Math.PI * 2);
        g.update(delta / (1.5 + s.hits * 0.12));
        key(g, ' ');
      }
    } else {
      for (let i = 0; i < 3; i++) tap(g, 300, 250);
    }
    assert.equal(result.won, win);
    assert.deepEqual(rules.validate(result), []);
  }
});
