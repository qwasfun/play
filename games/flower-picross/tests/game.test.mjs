import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cellPoint,
  countSolutions,
  createGame,
  FLOWER_PICROSS,
  generatePuzzles,
  lineClues,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function tap(game, index) {
  const point = cellPoint(index);
  game.input('primary-down', point);
  game.input('primary-up', point);
}

function fillPuzzle(game, puzzle) {
  puzzle.solution.forEach((filled, index) => {
    if (filled) tap(game, index);
  });
}

function solve(game, seed) {
  for (const [round, puzzle] of generatePuzzles(seed).entries()) {
    fillPuzzle(game, puzzle);
    if (round < FLOWER_PICROSS.rounds - 1) game.update(0.75);
  }
}

test('seeded flower windows are deterministic, varied, clue-correct and uniquely solvable', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 180; seed++) {
    const puzzles = generatePuzzles(seed);
    assert.deepEqual(puzzles, generatePuzzles(seed));
    assert.equal(puzzles.length, FLOWER_PICROSS.rounds);
    assert.equal(new Set(puzzles.map(({ name }) => name)).size, FLOWER_PICROSS.rounds);
    for (const puzzle of puzzles) {
      assert.equal(puzzle.solution.length, 25);
      assert.equal(countSolutions(puzzle), 1, puzzle.name);
      for (let row = 0; row < 5; row++)
        assert.deepEqual(
          puzzle.rowClues[row],
          lineClues(puzzle.solution.slice(row * 5, row * 5 + 5)),
        );
      for (let column = 0; column < 5; column++)
        assert.deepEqual(
          puzzle.columnClues[column],
          lineClues(Array.from({ length: 5 }, (_, row) => puzzle.solution[row * 5 + column])),
        );
    }
    signatures.add(puzzles.map(({ name }) => name).join('|'));
  }
  assert.ok(signatures.size >= 80);
  assert.notDeepEqual(generatePuzzles(42), generatePuzzles(43));
  assert.deepEqual(lineClues([false, false, false]), [0]);
  assert.deepEqual(lineClues([true, true, false, true]), [2, 1]);
});

test('real pointer taps solve three windows once and produce a valid ranked result', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  solve(game, 42);
  assert.deepEqual(results, [{ score: 1200, elapsed: 1.5, won: true, rounds: 3 }]);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.update(999);
  tap(game, 0);
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('keyboard wraps the cursor, toggles cells and undo restores the prior board', () => {
  const game = createGame({ seed: 7 });
  game.input('key-down', { key: 'ArrowLeft' });
  assert.equal(game.getState().cursor, 4);
  game.input('key-down', { key: 'ArrowUp' });
  assert.equal(game.getState().cursor, 24);
  game.input('key-down', { key: ' ', repeat: true });
  assert.equal(game.getState().moves, 0);
  game.input('key-down', { key: 'Enter' });
  assert.equal(game.getState().board[24], true);
  assert.equal(game.getState().moves, 1);
  game.input('key-down', { key: 'z' });
  assert.equal(game.getState().board[24], false);
  assert.equal(game.getState().moves, 0);
  game.input('key-down', { key: 's' });
  assert.equal(game.getState().cursor, 4);
});

test('an incorrect flower cannot complete a window and can be corrected normally', () => {
  const game = createGame({ seed: 19 });
  const puzzle = generatePuzzles(19)[0];
  const wrong = puzzle.solution.findIndex((filled) => !filled);
  tap(game, wrong);
  fillPuzzle(game, puzzle);
  assert.equal(game.getState().rounds, 0);
  assert.equal(game.getState().phase, 'play');
  tap(game, wrong);
  assert.equal(game.getState().rounds, 1);
  assert.equal(game.getState().phase, 'transition');
});

test('cancelled, mismatched, invalid and unrelated input never changes a cell', () => {
  const game = createGame({ seed: 5 });
  game.input('primary-down', cellPoint(0));
  game.input('primary-cancel');
  game.input('primary-up', cellPoint(0));
  game.input('primary-down', cellPoint(0));
  game.input('primary-up', cellPoint(1));
  for (const payload of [{}, { x: NaN, y: 140 }, { x: 20, y: 20 }, { x: Infinity, y: 140 }]) {
    game.input('primary-down', payload);
    game.input('primary-up', payload);
  }
  game.input('key-down', { key: 'q' });
  assert.equal(game.getState().moves, 0);
  assert.ok(game.getState().board.every((filled) => !filled));
});

test('transition locks input and opens the next seeded window empty', () => {
  const game = createGame({ seed: 23 });
  fillPuzzle(game, generatePuzzles(23)[0]);
  assert.equal(game.getState().phase, 'transition');
  tap(game, 0);
  assert.equal(game.getState().rounds, 1);
  game.update(0.75);
  assert.equal(game.getState().phase, 'play');
  assert.equal(game.getState().round, 1);
  assert.ok(game.getState().board.every((filled) => !filled));
});

test('timeout clamps, preserves completed windows and destroy stays silent', () => {
  const results = [];
  const game = createGame({ seed: 12, onFinish: (result) => results.push(result) });
  fillPuzzle(game, generatePuzzles(12)[0]);
  game.update(0.75);
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  game.update(999);
  assert.deepEqual(results, [{ score: 400, elapsed: 180, won: false, rounds: 1 }]);
  assert.deepEqual(rules.validate(results[0]), []);

  const quiet = [];
  const destroyed = createGame({ seed: 8, onFinish: (result) => quiet.push(result) });
  destroyed.destroy();
  destroyed.update(999);
  assert.equal(quiet.length, 0);
});

test('snapshots are isolated and result rules reject forged scores and early losses', () => {
  const game = createGame({ seed: 42 });
  const state = game.getState();
  state.board[0] = true;
  state.puzzle.solution[0] = !state.puzzle.solution[0];
  state.puzzle.rowClues[0][0] = 99;
  assert.equal(game.getState().board[0], false);
  assert.notEqual(game.getState().puzzle.rowClues[0][0], 99);

  const good = { score: 800, elapsed: 180, won: false, rounds: 2 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 400 },
    { ...good, score: 850 },
    { ...good, rounds: 3 },
    { ...good, won: true },
    { ...good, elapsed: 179 },
    { score: 1200, elapsed: 181, won: true, rounds: 3 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'drop' }), good);
});
