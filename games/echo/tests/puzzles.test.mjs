import test from 'node:test';
import assert from 'node:assert/strict';
import { createEchoSequence, createGame as createEcho } from '../src/index.js';

const keys = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];

function advanceUntil(game, predicate, limit = 12000) {
  for (let i = 0; i < limit; i++) {
    if (predicate(game.getState())) return;
    game.update(1 / 60);
  }
  assert.fail('Game did not reach expected state');
}

test('echo full sequence is deterministic with twelve valid pads', () => {
  const sequence = createEchoSequence('forest');
  assert.equal(sequence.length, 12);
  assert.deepEqual(createEchoSequence('forest'), sequence);
  assert.ok(sequence.every(value => Number.isInteger(value) && value >= 0 && value < 4));
  assert.notDeepEqual(createEchoSequence('another-forest'), sequence);
});

test('echo ignores playback and between-round input, tracks completed rounds', () => {
  const seed = 'playback';
  const game = createEcho({ seed });
  for (const key of keys) game.input('key-down', { key });
  assert.equal(game.getState().finished, false);
  assert.equal(game.getState().inputIndex, 0);
  advanceUntil(game, state => state.phase === 'input');
  const first = createEchoSequence(seed)[0];
  game.input('key-down', { key: keys[first] });
  assert.equal(game.getState().rounds, 1);
  assert.equal(game.getState().phase, 'between');
  game.input('key-down', { key: keys[(first + 1) % 4] });
  assert.equal(game.getState().finished, false);
  assert.equal(game.getState().rounds, 1);
});

test('echo wrong answer ends once, repeated keys are ignored', () => {
  const seed = 'wrong';
  const results = [];
  const game = createEcho({ seed, onFinish: result => results.push(result) });
  advanceUntil(game, state => state.phase === 'input');
  const wrong = (createEchoSequence(seed)[0] + 1) % 4;
  game.input('key-down', { key: keys[wrong], repeat: true });
  assert.equal(game.getState().finished, false);
  game.input('key-down', { key: keys[wrong] });
  game.input('key-down', { key: keys[wrong] });
  game.update(200);
  assert.equal(results.length, 1);
  assert.equal(results[0].reason, 'wrong');
  assert.equal(results[0].rounds, 0);
});

test('echo full twelve rounds can be completed and timeout is bounded', () => {
  const seed = 'complete';
  const sequence = createEchoSequence(seed);
  const results = [];
  const game = createEcho({ seed, onFinish: result => results.push(result) });
  for (let round = 1; round <= 12; round++) {
    advanceUntil(game, state => state.phase === 'input');
    for (const pad of sequence.slice(0, round)) game.input('key-down', { key: keys[pad] });
  }
  assert.equal(results.length, 1);
  assert.equal(results[0].won, true);
  assert.equal(results[0].rounds, 12);
  assert.ok(results[0].elapsed < 180);
  let timeout;
  const timed = createEcho({ seed, onFinish: result => { timeout = result; } });
  timed.update(181);
  assert.equal(timeout.reason, 'time');
  assert.equal(timeout.elapsed, 180);
});
