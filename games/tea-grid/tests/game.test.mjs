import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, generatePuzzle, conflictCells, isSolved } from '../src/index.js';
import { rules } from '../src/rules.js';

function countSolutions(board, cap = 2) {
  const next = [...board];
  let count = 0;
  function allowed(index, value) {
    const row = Math.floor(index / 4),
      column = index % 4;
    for (let i = 0; i < 4; i++)
      if (next[row * 4 + i] === value || next[i * 4 + column] === value) return false;
    const top = Math.floor(row / 2) * 2,
      left = Math.floor(column / 2) * 2;
    for (let y = top; y < top + 2; y++)
      for (let x = left; x < left + 2; x++) if (next[y * 4 + x] === value) return false;
    return true;
  }
  function search() {
    const index = next.indexOf(0);
    if (index < 0) {
      count++;
      return;
    }
    for (let value = 1; value <= 4 && count < cap; value++)
      if (allowed(index, value)) {
        next[index] = value;
        search();
        next[index] = 0;
      }
  }
  search();
  return count;
}

const tap = (game, index, release = index) => {
  const point = (cell) => ({
    x: 148 + (cell % 4) * 76 + 38,
    y: 94 + Math.floor(cell / 4) * 76 + 38,
  });
  game.input('primary-down', point(index));
  game.input('primary-up', release < 0 ? { x: -1, y: -1 } : point(release));
};

function enterSolution(game, seed, round, keyboard = false) {
  const puzzle = generatePuzzle(seed, round);
  let cursor = game.getState().cursor;
  for (let index = 0; index < 16; index++) {
    if (puzzle.fixed[index]) continue;
    if (keyboard) {
      const rowSteps = (Math.floor(index / 4) - Math.floor(cursor / 4) + 4) % 4,
        columnSteps = ((index % 4) - (cursor % 4) + 4) % 4;
      for (let n = 0; n < rowSteps; n++) game.input('key-down', { key: 'ArrowDown' });
      for (let n = 0; n < columnSteps; n++) game.input('key-down', { key: 'ArrowRight' });
      for (let n = 0; n < puzzle.solution[index]; n++) game.input('key-down', { key: 'Enter' });
      cursor = index;
    } else for (let n = 0; n < puzzle.solution[index]; n++) tap(game, index);
  }
}

test('seeded tea tables are deterministic, valid, varied and uniquely solvable', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 240; seed++)
    for (let round = 0; round < 3; round++) {
      const puzzle = generatePuzzle(seed, round);
      assert.deepEqual(puzzle, generatePuzzle(seed, round));
      assert.equal(isSolved(puzzle.solution), true);
      assert.equal(countSolutions(puzzle.board), 1);
      assert.equal(puzzle.fixed.filter(Boolean).length, [10, 8, 7][round]);
      assert.ok(
        puzzle.board.every(
          (value, index) => value === (puzzle.fixed[index] ? puzzle.solution[index] : 0),
        ),
      );
      signatures.add(puzzle.board.join(''));
    }
  assert.ok(signatures.size > 100);
  for (const round of [-1, 3, 1.5]) assert.throws(() => generatePuzzle(42, round));
});

test('rows, columns and small tables report every duplicate without treating blanks as conflicts', () => {
  const valid = generatePuzzle(42).solution;
  assert.deepEqual([...conflictCells(valid)], []);
  assert.equal(isSolved(valid), true);
  for (const [a, b] of [
    [0, 1],
    [0, 4],
    [0, 5],
  ]) {
    const board = [...valid];
    board[b] = board[a];
    const conflicts = conflictCells(board);
    assert.ok(conflicts.has(a) && conflicts.has(b));
    assert.equal(isSolved(board), false);
  }
  const blank = [...valid];
  blank[0] = 0;
  blank[1] = 0;
  assert.equal(conflictCells(blank).has(0), false);
  assert.equal(isSolved(blank), false);
});

test('pointer cancel, drag out, fixed cells, repeated keys and invalid points never write', () => {
  const game = createGame({ seed: 42 }),
    initial = game.getState(),
    editable = initial.fixed.findIndex((value) => !value),
    fixed = initial.fixed.findIndex(Boolean);
  game.input('primary-down', {
    x: 148 + (editable % 4) * 76 + 38,
    y: 94 + Math.floor(editable / 4) * 76 + 38,
  });
  game.input('primary-cancel');
  game.input('primary-up', {
    x: 148 + (editable % 4) * 76 + 38,
    y: 94 + Math.floor(editable / 4) * 76 + 38,
  });
  tap(game, editable, -1);
  tap(game, fixed);
  for (const point of [{}, { x: NaN, y: 100 }, { x: 20, y: 20 }]) {
    game.input('primary-down', point);
    game.input('primary-up', point);
  }
  game.input('key-down', { key: 'Enter', repeat: true });
  assert.deepEqual(game.getState().board, initial.board);
  assert.equal(game.getState().steps, 0);
});

test('pointer and keyboard cycle values; undo restores the board but keeps steps and time', () => {
  const game = createGame({ seed: 42 }),
    editable = game.getState().fixed.findIndex((value) => !value),
    before = game.getState().board;
  tap(game, editable);
  tap(game, editable);
  assert.equal(game.getState().board[editable], 2);
  assert.equal(game.getState().steps, 2);
  game.update(2);
  game.input('undo');
  assert.equal(game.getState().board[editable], 1);
  game.input('key-down', { key: 'z' });
  assert.deepEqual(game.getState().board, before);
  assert.equal(game.getState().steps, 2);
  assert.equal(game.getState().elapsed, 2);
  const snapshot = game.getState();
  snapshot.board[editable] = 99;
  snapshot.fixed[editable] = true;
  assert.deepEqual(game.getState().board, before);
  assert.equal(game.getState().fixed[editable], false);
});

test('real keyboard and pointer inputs solve all three rounds and emit one valid ranked result', () => {
  const results = [],
    game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  enterSolution(game, 42, 0, true);
  assert.equal(game.getState().rounds, 1);
  enterSolution(game, 42, 1);
  assert.equal(game.getState().rounds, 2);
  enterSolution(game, 42, 2);
  assert.equal(game.getState().won, true);
  assert.equal(results.length, 1);
  assert.equal(results[0].score, 300);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  tap(game, 0);
  game.input('key-down', { key: 'Enter' });
  game.update(999);
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('timeout clamps elapsed and settles partial score once', () => {
  const results = [],
    game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  game.update(NaN);
  game.update(-1);
  assert.equal(game.getState().elapsed, 0);
  enterSolution(game, 42, 0);
  game.update(999);
  game.update(1);
  assert.equal(results.length, 1);
  assert.deepEqual(
    { ...results[0], steps: 0 },
    { score: 100, rounds: 1, steps: 0, elapsed: 180, won: false },
  );
  assert.deepEqual(rules.validate(results[0]), []);
});

test('result rules reject forged scores, wins, counters and impossible low-step completion', () => {
  const result = { score: 300, elapsed: 60, won: true, rounds: 3, steps: 23 };
  assert.deepEqual(rules.validate(result), []);
  for (const bad of [
    { ...result, score: 200 },
    { ...result, score: 250 },
    { ...result, won: false },
    { ...result, rounds: 2 },
    { ...result, rounds: 4 },
    { ...result, steps: 22 },
    { ...result, steps: 1.5 },
    { ...result, elapsed: 181 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...result, secret: 'drop' }), result);
});
