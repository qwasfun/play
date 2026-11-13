import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, makeSchedule } from '../src/index.js';
import { rules } from '../src/rules.js';
const click = (g, i) => {
  const p = { x: 180 + (i % 3) * 120, y: 144 + Math.floor(i / 3) * 108 };
  g.input('primary-down', p);
  g.input('primary-up', p);
};
test('seeded lamps, full 24 rounds, one finish and valid score', () => {
  assert.deepEqual(makeSchedule(42), makeSchedule(42));
  let results = [];
  const g = createGame({ seed: 42, onFinish: (r) => results.push(r) });
  for (let i = 0; i < 24; i++) {
    g.update(0.61);
    click(g, makeSchedule(42)[i]);
    g.update(0.89);
  }
  assert.equal(results.length, 1);
  assert.equal(results[0].score, 600);
  assert.equal(results[0].won, true);
  assert.deepEqual(rules.validate(results[0]), []);
  g.update(100);
  assert.equal(results.length, 1);
});
test('cancelled taps and repeated keys do nothing; early taps lose and terminate', () => {
  let result;
  const g = createGame({ seed: 1, onFinish: (r) => (result = r) });
  g.input('primary-down', { x: 180, y: 144 });
  g.input('primary-cancel');
  g.input('primary-up', { x: 180, y: 144 });
  g.input('key-down', { key: ' ', repeat: true });
  assert.equal(g.getState().lives, 3);
  for (let i = 0; i < 3; i++) g.input('key-down', { key: ' ' });
  assert.equal(result.won, false);
  assert.deepEqual(rules.validate(result), []);
});
test('missed lamps end after three rounds, invalid dt never advances', () => {
  let result;
  const g = createGame({ seed: 1, onFinish: (r) => (result = r) });
  g.update(NaN);
  g.update(-1);
  assert.equal(g.getState().elapsed, 0);
  g.update(60);
  assert.equal(result.elapsed, 4.5);
  assert.deepEqual(rules.validate(result), []);
});
