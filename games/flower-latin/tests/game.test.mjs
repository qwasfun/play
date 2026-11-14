import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cellPoint,
  countSolutions,
  createGame,
  FLOWER_LATIN,
  generatePuzzles,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function tap(game, index, times = 1) {
  const point = cellPoint(index);
  for (let count = 0; count < times; count++) {
    game.input('primary-down', point);
    game.input('primary-up', point);
  }
}

function fillPuzzle(game, puzzle) {
  puzzle.givens.forEach((given, index) => {
    if (!given) tap(game, index, puzzle.solution[index]);
  });
}

function solve(game, seed) {
  for (const [round, puzzle] of generatePuzzles(seed).entries()) {
    fillPuzzle(game, puzzle);
    if (round < FLOWER_LATIN.rounds - 1) game.update(0.7);
  }
}

test('seeded flower grids are deterministic, varied, valid and uniquely solvable', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 180; seed++) {
    const puzzles = generatePuzzles(seed);
    assert.deepEqual(puzzles, generatePuzzles(seed));
    assert.equal(puzzles.length, FLOWER_LATIN.rounds);
    assert.equal(new Set(puzzles.map(({ name }) => name)).size, FLOWER_LATIN.rounds);
    assert.equal(
      new Set(puzzles.map(({ solution }) => solution.join(''))).size,
      FLOWER_LATIN.rounds,
    );
    for (const puzzle of puzzles) {
      assert.equal(puzzle.givens.length, 16);
      assert.equal(puzzle.solution.length, 16);
      assert.ok(puzzle.givens.filter((value) => !value).length >= 8);
      assert.equal(countSolutions(puzzle.givens), 1, puzzle.name);
      puzzle.givens.forEach((value, index) => {
        if (value) assert.equal(value, puzzle.solution[index]);
      });
      for (let row = 0; row < 4; row++)
        assert.deepEqual(
          new Set(puzzle.solution.slice(row * 4, row * 4 + 4)),
          new Set([1, 2, 3, 4]),
        );
      for (let column = 0; column < 4; column++)
        assert.deepEqual(
          new Set(Array.from({ length: 4 }, (_, row) => puzzle.solution[row * 4 + column])),
          new Set([1, 2, 3, 4]),
        );
    }
    signatures.add(puzzles.map(({ solution }) => solution.join('')).join('|'));
  }
  assert.ok(signatures.size >= 150);
  assert.notDeepEqual(generatePuzzles(42), generatePuzzles(43));
});

test('real pointer taps solve three grids once and produce a valid ranked result', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  solve(game, 42);
  assert.deepEqual(results, [{ score: 1200, elapsed: 1.4, won: true, rounds: 3 }]);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.update(999);
  tap(game, 0);
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('keyboard wraps the cursor, cycles values and undo restores the prior board', () => {
  const game = createGame({ seed: 7 });
  const start = game.getState().cursor;
  game.input('key-down', { key: 'ArrowLeft' });
  assert.equal(game.getState().cursor % 4, ((start % 4) + 3) % 4);
  game.input('key-down', { key: 'ArrowUp' });
  assert.equal(Math.floor(game.getState().cursor / 4), (Math.floor(start / 4) + 3) % 4);
  while (game.getState().puzzle.givens[game.getState().cursor])
    game.input('key-down', { key: 'd' });
  const target = game.getState().cursor;
  game.input('key-down', { key: ' ', repeat: true });
  assert.equal(game.getState().board[target], 0);
  game.input('key-down', { key: 'Enter' });
  assert.equal(game.getState().board[target], 1);
  game.input('key-down', { key: 'z' });
  assert.equal(game.getState().board[target], 0);
});

test('fixed clues, cancelled taps, mismatched taps and invalid input never change the board', () => {
  const game = createGame({ seed: 5 });
  const original = game.getState().board;
  const fixed = original.findIndex(Boolean);
  tap(game, fixed);
  game.input('primary-down', cellPoint(game.getState().cursor));
  game.input('primary-cancel');
  game.input('primary-up', cellPoint(game.getState().cursor));
  game.input('primary-down', cellPoint(game.getState().cursor));
  game.input('primary-up', cellPoint((game.getState().cursor + 1) % 16));
  for (const payload of [{}, { x: NaN, y: 140 }, { x: 20, y: 20 }, { x: Infinity, y: 140 }]) {
    game.input('primary-down', payload);
    game.input('primary-up', payload);
  }
  game.input('key-down', { key: 'q' });
  assert.deepEqual(game.getState().board, original);
  assert.equal(game.getState().moves, 0);
});

test('an incorrect value blocks completion and cycling can correct it normally', () => {
  const game = createGame({ seed: 19 });
  const puzzle = generatePuzzles(19)[0];
  const blank = puzzle.givens.findIndex((value) => value === 0);
  const wrong = (puzzle.solution[blank] % 4) + 1;
  tap(game, blank, wrong);
  puzzle.givens.forEach((given, index) => {
    if (!given && index !== blank) tap(game, index, puzzle.solution[index]);
  });
  assert.equal(game.getState().rounds, 0);
  tap(game, blank, (puzzle.solution[blank] - wrong + 5) % 5);
  assert.equal(game.getState().rounds, 1);
  assert.equal(game.getState().phase, 'transition');
});

test('transition locks input and opens the next seeded grid with only its clues', () => {
  const game = createGame({ seed: 23 });
  fillPuzzle(game, generatePuzzles(23)[0]);
  assert.equal(game.getState().phase, 'transition');
  tap(game, 0);
  assert.equal(game.getState().rounds, 1);
  game.update(0.7);
  assert.equal(game.getState().phase, 'play');
  assert.equal(game.getState().round, 1);
  assert.deepEqual(game.getState().board, generatePuzzles(23)[1].givens);
});

test('timeout clamps, preserves completed grids and destroy stays silent', () => {
  const results = [];
  const game = createGame({ seed: 12, onFinish: (result) => results.push(result) });
  fillPuzzle(game, generatePuzzles(12)[0]);
  game.update(0.7);
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
  state.board[0] = 9;
  state.puzzle.givens[0] = 9;
  state.puzzle.solution[0] = 9;
  assert.notEqual(game.getState().board[0], 9);
  assert.notEqual(game.getState().puzzle.givens[0], 9);

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
