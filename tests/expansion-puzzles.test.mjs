import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePairs, createGame as createPairs } from '../dist/games/pairs.js';
import { generateMergeBoard, moveBoard, spawnTile, hasMoves, createGame as createMerge } from '../dist/games/merge.js';

const cardPoint = index => ({ x: 150 + index % 4 * 100, y: 124 + Math.floor(index / 4) * 116 });
const clickCard = (game, index) => {
  game.input('primary-down', cardPoint(index));
  game.input('primary-up', cardPoint(index));
};
const swipe = (game, dx, dy) => {
  game.input('primary-down', { x: 300, y: 240 });
  game.input('primary-up', { x: 300 + dx, y: 240 + dy });
};
const padded = values => [...values, ...Array(16 - values.length).fill(0)];

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

test('merge compresses in all four directions without mutating the source', () => {
  const board = padded([0, 2, 0, 4]);
  assert.deepEqual(moveBoard(board, 'left').board.slice(0, 4), [2, 4, 0, 0]);
  assert.deepEqual(moveBoard(board, 'right').board.slice(0, 4), [0, 0, 2, 4]);
  assert.deepEqual(board.slice(0, 4), [0, 2, 0, 4]);
  const column = Array(16).fill(0); column[4] = 2; column[12] = 2;
  const up = moveBoard(column, 'up');
  assert.equal(up.board[0], 4);
  assert.equal(up.score, 4);
  const down = moveBoard(column, 'down');
  assert.equal(down.board[12], 4);
  assert.equal(down.board[0], 0);
});

test('merge each tile combines at most once in a move and score sums merged values', () => {
  let result = moveBoard(padded([2, 2, 4, 0]), 'left');
  assert.deepEqual(result.board.slice(0, 4), [4, 4, 0, 0]);
  assert.equal(result.score, 4);
  result = moveBoard(padded([2, 2, 2, 2]), 'left');
  assert.deepEqual(result.board.slice(0, 4), [4, 4, 0, 0]);
  assert.equal(result.score, 8);
  result = moveBoard(padded([2, 2, 2, 2]), 'right');
  assert.deepEqual(result.board.slice(0, 4), [0, 0, 4, 4]);
  assert.equal(result.score, 8);
});

test('merge spawn chooses empty cells, uses 90/10 2-or-4 probability, and full board consumes no RNG', () => {
  let calls = 0;
  const sequence = [0, .8999, .9999, .9];
  const random = () => { calls++; return sequence.shift(); };
  const first = spawnTile(Array(16).fill(0), random);
  assert.equal(first.index, 0);
  assert.equal(first.value, 2);
  const second = spawnTile(first.board, random);
  assert.equal(second.index, 15);
  assert.equal(second.value, 4);
  spawnTile(Array(16).fill(2), random);
  assert.equal(calls, 4);
});

test('merge seeds reproduce initial two tiles and subsequent move sequences', () => {
  const first = createMerge({ seed: 'numbers' });
  const second = createMerge({ seed: 'numbers' });
  assert.deepEqual(first.getState().board, generateMergeBoard('numbers'));
  assert.equal(first.getState().board.filter(Boolean).length, 2);
  for (const key of ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'a', 's']) {
    first.input('key-down', { key }); second.input('key-down', { key });
    assert.deepEqual(first.getState().board, second.getState().board);
    assert.equal(first.getState().score, second.getState().score);
  }
});

test('merge invalid moves do not spawn or consume RNG', () => {
  const initialBoard = padded([2]);
  const first = createMerge({ seed: 'invalid', initialBoard });
  const second = createMerge({ seed: 'invalid', initialBoard });
  first.input('key-down', { key: 'ArrowLeft' });
  assert.deepEqual(first.getState().board, initialBoard);
  assert.equal(first.getState().moves, 0);
  first.input('key-down', { key: 'ArrowRight' });
  second.input('key-down', { key: 'ArrowRight' });
  assert.deepEqual(first.getState().board, second.getState().board);
});

test('merge swipe threshold, dominant axis and cancel protect against accidental moves', () => {
  const initialBoard = padded([2]);
  const game = createMerge({ seed: 'swipe', initialBoard });
  swipe(game, 23, 0);
  assert.equal(game.getState().moves, 0);
  game.input('primary-down', { x: 300, y: 240 });
  game.input('primary-cancel');
  game.input('primary-up', { x: 500, y: 240 });
  assert.equal(game.getState().moves, 0);
  swipe(game, 25, 70);
  assert.equal(game.getState().moves, 1);
  assert.equal(game.getState().board[12], 2);
  assert.equal(game.getState().swiping, false);
});

test('merge full immovable board ends once while a full board with neighbours can move', () => {
  const blocked = [2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2];
  assert.equal(hasMoves(blocked), false);
  assert.equal(hasMoves([2,2,...blocked.slice(2)]), true);
  const results = [];
  const game = createMerge({ seed: 'blocked', initialBoard: blocked, onFinish: result => results.push(result) });
  game.update(1 / 60);
  game.update(1);
  game.input('key-down', { key: 'ArrowLeft' });
  assert.deepEqual(results, [{ score: 0, elapsed: 0, won: false, reason: 'blocked' }]);
});

test('merge combining to 128 wins once and preserves merge score', () => {
  const results = [];
  const game = createMerge({ seed: 'win', initialBoard: padded([64, 64]), onFinish: result => results.push(result) });
  game.input('key-down', { key: 'ArrowLeft' });
  assert.equal(results.length, 1);
  assert.equal(results[0].won, true);
  assert.equal(results[0].score, 128);
  assert.equal(game.getState().extra, '最大 128');
  const before = game.getState().board;
  game.input('key-down', { key: 'ArrowRight' });
  game.update(200);
  assert.deepEqual(game.getState().board, before);
  assert.equal(results.length, 1);
});

test('merge timeout clamps elapsed and ignored repeats cannot create moves', () => {
  const results = [];
  const game = createMerge({ seed: 'timer', onFinish: result => results.push(result) });
  game.input('key-down', { key: 'ArrowLeft', repeat: true });
  assert.equal(game.getState().moves, 0);
  game.update(181);
  assert.equal(results.length, 1);
  assert.equal(results[0].elapsed, 180);
  assert.equal(results[0].reason, 'time');
});
