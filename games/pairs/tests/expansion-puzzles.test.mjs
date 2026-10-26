import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePairs, createGame as createPairs } from '../src/index.js';

const cardPoint = index => ({ x: 150 + index % 4 * 100, y: 124 + Math.floor(index / 4) * 116 });

const clickCard = (game, index) => {
  game.input('primary-down', cardPoint(index));
  game.input('primary-up', cardPoint(index));
};

test('pairs generates twelve deterministic cards containing six pairs', () => {
  const board = generatePairs('garden');
  assert.deepEqual(generatePairs('garden'), board);
  assert.equal(board.length, 12);
  for (let id = 0; id < 6; id++) assert.equal(board.filter(value => value === id).length, 2);
  assert.notDeepEqual(generatePairs('other-garden'), board);
});

test('pairs matches lock two cards and count only effective flips', () => {
  const game = createPairs({ seed: 'match' });
  const board = game.getState().board;
  const second = board.findIndex((value, index) => index > 0 && value === board[0]);
  clickCard(game, 0);
  clickCard(game, 0);
  clickCard(game, second);
  assert.equal(game.getState().pairs, 1);
  assert.equal(game.getState().score, 100);
  assert.equal(game.getState().steps, 2);
  assert.equal(game.getState().matched[0], true);
  assert.deepEqual(game.getState().faceUp, []);
  clickCard(game, second);
  assert.equal(game.getState().steps, 2);
});

test('pairs mismatches are visible for 0.7s and cannot accept more flips', () => {
  const game = createPairs({ seed: 'mismatch' });
  const board = game.getState().board;
  const second = board.findIndex(value => value !== board[0]);
  const third = board.findIndex((_, index) => index !== 0 && index !== second);
  clickCard(game, 0);
  clickCard(game, second);
  assert.equal(game.getState().locked, true);
  clickCard(game, third);
  game.input('key-down', { key: ' ' });
  assert.equal(game.getState().steps, 2);
  assert.deepEqual(game.getState().faceUp, [0, second]);
  game.update(.69);
  assert.equal(game.getState().locked, true);
  game.update(.02);
  assert.equal(game.getState().locked, false);
  assert.deepEqual(game.getState().faceUp, []);
  clickCard(game, third);
  assert.equal(game.getState().steps, 3);
});

test('pairs pointer cancel and different release cell never flip; keyboard selects and flips', () => {
  const game = createPairs({ seed: 'cancel' });
  game.input('primary-down', cardPoint(0));
  game.input('primary-cancel');
  game.input('primary-up', cardPoint(0));
  game.input('primary-down', cardPoint(0));
  game.input('primary-up', cardPoint(1));
  assert.equal(game.getState().steps, 0);
  game.input('key-down', { key: 'ArrowLeft' });
  assert.equal(game.getState().selected, 3);
  game.input('key-down', { key: 'ArrowUp' });
  assert.equal(game.getState().selected, 11);
  game.input('key-down', { key: ' ', repeat: true });
  assert.equal(game.getState().steps, 0);
  game.input('key-down', { key: 'Enter' });
  assert.deepEqual(game.getState().faceUp, [11]);
});

test('pairs full garden finishes once and gives the exact completion bonus', () => {
  const results = [];
  const game = createPairs({ seed: 'complete', onFinish: result => results.push(result) });
  const board = game.getState().board;
  for (let id = 0; id < 6; id++) board.forEach((value, index) => { if (value === id) clickCard(game, index); });
  assert.equal(results.length, 1);
  assert.equal(results[0].won, true);
  assert.equal(results[0].steps, 12);
  assert.equal(results[0].score, 684);
  clickCard(game, 0);
  game.update(121);
  assert.equal(results.length, 1);
  assert.equal(game.getState().matched.filter(Boolean).length, 12);
});

test('pairs timeout clamps to 120 seconds and reports once', () => {
  const results = [];
  const game = createPairs({ seed: 'time', onFinish: result => results.push(result) });
  game.update(121);
  game.update(1);
  assert.deepEqual(results, [{ score: 0, elapsed: 120, won: false, steps: 0, reason: 'time' }]);
});
