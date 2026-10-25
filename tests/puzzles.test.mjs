import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLights, toggledBoard, createGame as createLights } from '../dist/games/lights.js';
import { createEchoSequence, createGame as createEcho } from '../dist/games/echo.js';

const cellPoint = index => ({ x: 113 + (index % 4) * 96 + 43, y: 48 + Math.floor(index / 4) * 96 + 43 });
const clickCell = (game, index) => {
  game.input('primary-down', cellPoint(index));
  game.input('primary-up', cellPoint(index));
};
const keys = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
function advanceUntil(game, predicate, limit = 12000) {
  for (let i = 0; i < limit; i++) {
    if (predicate(game.getState())) return;
    game.update(1 / 60);
  }
  assert.fail('Game did not reach expected state');
}

test('lights generated boards are deterministic, nonempty and solvable', () => {
  for (let i = 0; i < 300; i++) {
    const seed = `puzzle-${i}`;
    const { board, solution } = generateLights(seed);
    assert.deepEqual(generateLights(seed), { board, solution });
    assert.equal(board.length, 16);
    assert.ok(board.some(Boolean));
    const solved = solution.reduce((state, index) => toggledBoard(state, index), board);
    assert.ok(solved.every(value => value === 0));
  }
});

test('cross toggles respect row edges and applying same move twice restores board', () => {
  const board = Array(16).fill(0);
  assert.deepEqual(toggledBoard(board, 3).map((value, index) => value ? index : -1).filter(index => index >= 0), [2, 3, 7]);
  assert.deepEqual(toggledBoard(toggledBoard(board, 0), 0), board);
  assert.deepEqual(toggledBoard(board, -1), board);
});

test('lights undo restores board without refunding a move; cancelled pointer cannot toggle', () => {
  const game = createLights({ seed: 'undo' });
  const original = game.getState().board;
  clickCell(game, 7);
  assert.equal(game.getState().steps, 1);
  game.input('undo');
  assert.deepEqual(game.getState().board, original);
  assert.equal(game.getState().steps, 1);
  assert.equal(game.getState().canUndo, false);
  game.input('primary-down', cellPoint(3));
  game.input('primary-cancel');
  game.input('primary-up', cellPoint(3));
  assert.deepEqual(game.getState().board, original);
});

test('lights completion fires once and stops accepting moves', () => {
  const results = [];
  const seed = 'solve-completion';
  const game = createLights({ seed, onFinish: result => results.push(result) });
  for (const index of generateLights(seed).solution) clickCell(game, index);
  assert.equal(results.length, 1);
  assert.equal(results[0].won, true);
  const final = game.getState();
  clickCell(game, 0);
  game.update(200);
  game.input('undo');
  assert.deepEqual(game.getState(), final);
  assert.equal(results.length, 1);
});

test('lights keyboard wraps selection and timeout does not fire repeatedly', () => {
  const results = [];
  const game = createLights({ seed: 'keyboard', onFinish: result => results.push(result) });
  game.input('key-down', { key: 'ArrowLeft' });
  assert.equal(game.getState().selected, 3);
  game.input('key-down', { key: 'ArrowUp' });
  assert.equal(game.getState().selected, 15);
  game.input('key-down', { key: ' ', repeat: true });
  assert.equal(game.getState().steps, 0);
  game.input('key-down', { key: ' ' });
  assert.equal(game.getState().steps, 1);
  game.update(180);
  game.update(1);
  assert.equal(results.length, 1);
  assert.equal(results[0].reason, 'time');
  assert.equal(results[0].elapsed, 180);
});

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
