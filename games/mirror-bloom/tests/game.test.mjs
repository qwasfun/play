import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countSolutions,
  createGame,
  generatePuzzles,
  MIRROR_BLOOM,
  mirrorPoint,
  traceLight,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function tap(game, mirror) {
  const point = mirrorPoint(mirror);
  game.input('primary-down', point);
  game.input('primary-up', point);
}

function solveRound(game, puzzle) {
  puzzle.mirrors.forEach((mirror, index) => {
    if (puzzle.start[index] !== mirror.solution) tap(game, mirror);
  });
}

function solve(game, seed) {
  generatePuzzles(seed).forEach((puzzle, round) => {
    solveRound(game, puzzle);
    if (round < MIRROR_BLOOM.rounds - 1) game.update(0.7);
  });
}

test('seeded light gardens are deterministic, rotated, unsolved and uniquely solvable', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 120; seed++) {
    const puzzles = generatePuzzles(seed);
    assert.deepEqual(puzzles, generatePuzzles(seed));
    assert.equal(puzzles.length, MIRROR_BLOOM.rounds);
    assert.equal(new Set(puzzles.map(({ name }) => name)).size, MIRROR_BLOOM.rounds);
    for (const puzzle of puzzles) {
      assert.equal(countSolutions(puzzle), 1, puzzle.name);
      assert.equal(
        traceLight(
          puzzle,
          puzzle.mirrors.map(({ solution }) => solution),
        ).solved,
        true,
      );
      assert.equal(traceLight(puzzle, puzzle.start).solved, false);
      assert.ok(puzzle.flowers.length >= 4);
      assert.ok(puzzle.mirrors.length >= 3);
    }
    signatures.add(
      puzzles
        .map(
          (puzzle) =>
            `${puzzle.name}:${puzzle.entry.row}:${puzzle.entry.column}:${puzzle.start.join('')}`,
        )
        .join('|'),
    );
  }
  assert.ok(signatures.size >= 80);
  assert.notDeepEqual(generatePuzzles(42), generatePuzzles(43));
});

test('real pointer rotations solve all gardens once and produce a valid ranked result', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  solve(game, 42);
  assert.deepEqual(results, [{ score: 1200, elapsed: 1.4, won: true, rounds: 3 }]);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.update(999);
  tap(game, generatePuzzles(42)[2].mirrors[0]);
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('keyboard selects, rotates and undo restores the prior mirror', () => {
  const game = createGame({ seed: 7 });
  const start = game.getState();
  game.input('key-down', { key: 'ArrowRight' });
  const selected = game.getState().cursor;
  assert.notEqual(selected, start.cursor);
  game.input('key-down', { key: ' ', repeat: true });
  assert.deepEqual(game.getState().orientations, start.orientations);
  game.input('key-down', { key: 'Enter' });
  assert.equal(game.getState().orientations[selected], 1 - start.orientations[selected]);
  game.input('key-down', { key: 'z' });
  assert.deepEqual(game.getState().orientations, start.orientations);
});

test('cancelled, mismatched and invalid taps never rotate a mirror', () => {
  const game = createGame({ seed: 5 });
  const puzzle = game.getState().puzzle;
  const original = game.getState().orientations;
  const first = mirrorPoint(puzzle.mirrors[0]);
  const second = mirrorPoint(puzzle.mirrors[1]);
  game.input('primary-down', first);
  game.input('primary-cancel');
  game.input('primary-up', first);
  game.input('primary-down', first);
  game.input('primary-up', second);
  for (const payload of [{}, { x: NaN, y: 140 }, { x: 20, y: 20 }, { x: Infinity, y: 140 }]) {
    game.input('primary-down', payload);
    game.input('primary-up', payload);
  }
  game.input('key-down', { key: 'q' });
  assert.deepEqual(game.getState().orientations, original);
  assert.equal(game.getState().moves, 0);
});

test('wrong mirror combinations do not complete and a correction follows the live path', () => {
  const game = createGame({ seed: 19 });
  const puzzle = generatePuzzles(19)[0];
  const wrong = 0;
  if (puzzle.start[wrong] === puzzle.mirrors[wrong].solution) tap(game, puzzle.mirrors[wrong]);
  puzzle.mirrors.forEach((mirror, index) => {
    const current = game.getState().orientations[index];
    if (current !== mirror.solution && index !== wrong) tap(game, mirror);
  });
  assert.equal(game.getState().rounds, 0);
  tap(game, puzzle.mirrors[wrong]);
  assert.equal(game.getState().rounds, 1);
});

test('transition locks input and opens the next seeded garden', () => {
  const game = createGame({ seed: 23 });
  const puzzles = generatePuzzles(23);
  solveRound(game, puzzles[0]);
  assert.equal(game.getState().phase, 'transition');
  tap(game, puzzles[0].mirrors[0]);
  assert.equal(game.getState().rounds, 1);
  game.update(0.7);
  assert.equal(game.getState().phase, 'play');
  assert.equal(game.getState().round, 1);
  assert.deepEqual(game.getState().orientations, puzzles[1].start);
});

test('timeout clamps, preserves completed gardens and destroy stays silent', () => {
  const results = [];
  const game = createGame({ seed: 12, onFinish: (result) => results.push(result) });
  solveRound(game, generatePuzzles(12)[0]);
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
  state.orientations[0] = 9;
  state.path[0].row = 9;
  state.puzzle.mirrors[0].row = 9;
  assert.notEqual(game.getState().orientations[0], 9);
  assert.notEqual(game.getState().path[0].row, 9);
  assert.notEqual(game.getState().puzzle.mirrors[0].row, 9);

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
