import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame as createBridge, evaluateBridge, generateIslands } from '../src/index.js';

function advance(game, seconds) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) game.update(1 / 60);
}

test('bridge generation and endpoint boundaries are deterministic and inclusive', () => {
  assert.deepEqual(generateIslands('same'), generateIslands('same'));
  assert.notDeepEqual(generateIslands('same'), generateIslands('different'));
  const island = { gap: 150, width: 80 };
  assert.equal(evaluateBridge(149.99, island).success, false);
  assert.equal(evaluateBridge(150, island).success, true);
  assert.equal(evaluateBridge(230, island).success, true);
  assert.equal(evaluateBridge(230.01, island).success, false);
  assert.equal(evaluateBridge(190, island).points, 150);
});

test('cancelled bridge hold neither drops nor consumes a life', () => {
  const game = createBridge({ seed: 'cancel' });
  game.input('primary-down'); advance(game, 0.4);
  assert.ok(game.getState().length > 0);
  game.input('primary-cancel'); game.input('primary-up'); advance(game, 1);
  assert.equal(game.getState().length, 0);
  assert.equal(game.getState().phase, 'idle');
  assert.equal(game.getState().lives, 3);
});

test('bridge can complete twelve islands and never reads beyond final segment', () => {
  let final;
  const game = createBridge({ seed: 'perfect', onFinish: result => { final = result; } });
  for (let i = 0; i < 12; i++) {
    const target = game.getState().target;
    const center = target.gap + target.width / 2;
    game.input('primary-down');
    while (game.getState().length < center) game.update(1 / 60);
    game.input('primary-up'); advance(game, 1.4);
  }
  assert.equal(final.won, true);
  assert.equal(final.progress, 12);
  assert.equal(final.score, 1800);
  assert.equal(game.getState().lives, 3);
  advance(game, 2);
  assert.equal(game.getState().progress, 12);
});

test('bridge three misses and timeout each finish exactly once', () => {
  let finishes = 0;
  const game = createBridge({ seed: 'misses', onFinish: () => { finishes++; } });
  for (let i = 0; i < 3; i++) {
    game.input('key-down', { key: ' ' }); advance(game, 0.1);
    game.input('key-up', { key: ' ' }); advance(game, 1.4);
  }
  assert.equal(finishes, 1);
  assert.equal(game.getState().lives, 0);
  let timeout;
  const idle = createBridge({ seed: 'timeout', onFinish: result => { timeout = result; } });
  advance(idle, 121);
  assert.equal(timeout.reason, 'time');
  assert.equal(timeout.elapsed, 120);
});
