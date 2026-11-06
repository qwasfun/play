import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, generatePuzzles, PETAL_PACKING, rotateCells } from '../src/index.js';
import { rules } from '../src/rules.js';

const trayPoint = (index) => ({ x: 430, y: 82 + index * 54 + 27 });
const rotatePoint = { x: 458, y: 392 };
const boardPoint = ({ row, column }) => ({ x: 54 + column * 56 + 28, y: 96 + row * 56 + 28 });

function click(game, point) {
  game.input('primary-down', point);
  game.input('primary-up', point);
}

function solvePointer(game, seed) {
  for (const [round, puzzle] of generatePuzzles(seed).entries()) {
    for (const [index, piece] of puzzle.pieces.entries()) {
      click(game, trayPoint(index));
      for (let turn = piece.initialRotation; turn % 4 !== 0; turn++) click(game, rotatePoint);
      click(game, boardPoint(piece.solution));
    }
    if (round < PETAL_PACKING.rounds - 1) game.update(0.8);
  }
}

function moveBoard(game, target) {
  let cursor = game.getState().boardCursor;
  while (cursor.row < target.row) {
    game.input('key-down', { key: 'ArrowDown' });
    cursor = game.getState().boardCursor;
  }
  while (cursor.row > target.row) {
    game.input('key-down', { key: 'ArrowUp' });
    cursor = game.getState().boardCursor;
  }
  while (cursor.column < target.column) {
    game.input('key-down', { key: 'ArrowRight' });
    cursor = game.getState().boardCursor;
  }
  while (cursor.column > target.column) {
    game.input('key-down', { key: 'ArrowLeft' });
    cursor = game.getState().boardCursor;
  }
}

function solveKeyboard(game, seed) {
  for (const [round, puzzle] of generatePuzzles(seed).entries()) {
    for (let index = 0; index < puzzle.pieces.length; index++) {
      while (game.getState().trayCursor !== index) game.input('key-down', { key: 'ArrowDown' });
      const piece = puzzle.pieces[index];
      game.input('key-down', { key: 'Enter' });
      while (game.getState().rotations[piece.id] !== 0) game.input('key-down', { key: 'r' });
      moveBoard(game, piece.solution);
      game.input('key-down', { key: ' ' });
    }
    if (round < PETAL_PACKING.rounds - 1) game.update(0.8);
  }
}

test('seeded flower boxes are deterministic, varied and made from five connected pentominoes', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const puzzles = generatePuzzles(seed);
    assert.deepEqual(puzzles, generatePuzzles(seed));
    assert.equal(puzzles.length, PETAL_PACKING.rounds);
    for (const puzzle of puzzles) {
      assert.equal(puzzle.pieces.length, PETAL_PACKING.pieces);
      const covered = new Set();
      for (const piece of puzzle.pieces) {
        assert.equal(piece.cells.length, 5);
        assert.equal(new Set(piece.cells.map((cell) => `${cell.row}:${cell.column}`)).size, 5);
        const reached = new Set(['0']);
        const queue = [piece.cells[0]];
        while (queue.length) {
          const cell = queue.shift();
          for (const [index, candidate] of piece.cells.entries())
            if (
              !reached.has(String(index)) &&
              Math.abs(candidate.row - cell.row) + Math.abs(candidate.column - cell.column) === 1
            ) {
              reached.add(String(index));
              queue.push(candidate);
            }
        }
        assert.equal(reached.size, 5);
        for (const offset of rotateCells(piece.cells, piece.solution.rotation)) {
          const row = piece.solution.row + offset.row;
          const column = piece.solution.column + offset.column;
          assert.ok(row >= 0 && row < 5 && column >= 0 && column < 5);
          covered.add(`${row}:${column}`);
        }
      }
      assert.equal(covered.size, 25);
      signatures.add(
        puzzle.pieces
          .map(
            (piece) =>
              `${piece.id}:${piece.cells.map((cell) => `${cell.row}${cell.column}`).join('')}`,
          )
          .join('|'),
      );
    }
  }
  assert.ok(signatures.size >= 8);
  assert.notDeepEqual(generatePuzzles(42), generatePuzzles(43));
});

test('real pointer selection, rotation and placement complete three boxes once', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  solvePointer(game, 42);
  assert.equal(results.length, 1);
  assert.equal(results[0].score, 1200);
  assert.equal(results[0].rounds, 3);
  assert.equal(results[0].won, true);
  assert.ok(results[0].steps >= 15);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.update(999);
  click(game, trayPoint(0));
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('keyboard navigation, rotation and placement also complete every box', () => {
  const results = [];
  const game = createGame({ seed: 17, onFinish: (result) => results.push(result) });
  solveKeyboard(game, 17);
  assert.equal(results.length, 1);
  assert.equal(results[0].score, 1200);
  assert.equal(results[0].won, true);
  assert.deepEqual(rules.validate(results[0]), []);
});

test('overlap, overflow, invalid points, cancel and key repeat never place a piece', () => {
  const game = createGame({ seed: 8 });
  click(game, { x: NaN, y: 100 });
  game.input('primary-down', trayPoint(0));
  game.input('primary-cancel');
  game.input('primary-up', trayPoint(0));
  game.input('key-down', { key: 'Enter', repeat: true });
  assert.equal(game.getState().selected, 0);

  click(game, trayPoint(0));
  click(game, boardPoint({ row: 4, column: 4 }));
  assert.equal(game.getState().occupied, 0);
  const first = generatePuzzles(8)[0].pieces[0];
  while (game.getState().rotations[first.id] !== 0) click(game, rotatePoint);
  click(game, boardPoint(first.solution));
  assert.equal(game.getState().occupied, 5);

  click(game, trayPoint(1));
  click(game, boardPoint(first.solution));
  assert.equal(game.getState().occupied, 5);
});

test('placed pieces can be picked up, moved and restored with undo without rewinding steps', () => {
  const game = createGame({ seed: 5 });
  const piece = generatePuzzles(5)[0].pieces[0];
  click(game, trayPoint(0));
  while (game.getState().rotations[piece.id] !== 0) click(game, rotatePoint);
  click(game, boardPoint(piece.solution));
  const placedSteps = game.getState().steps;
  click(game, boardPoint(piece.solution));
  assert.equal(game.getState().occupied, 0);
  assert.equal(game.getState().selected, piece.id);
  game.input('undo');
  assert.equal(game.getState().occupied, 5);
  assert.equal(game.getState().selected, 0);
  assert.ok(game.getState().steps > placedSteps);

  click(game, boardPoint(piece.solution));
  click(game, rotatePoint);
  const rotated = game.getState().rotations[piece.id];
  game.input('key-down', { key: 'z' });
  assert.notEqual(game.getState().rotations[piece.id], rotated);
});

test('timeout clamps at 180 seconds, completed boxes score and destroy stays silent', () => {
  const results = [];
  const game = createGame({ seed: 3, onFinish: (result) => results.push(result) });
  const firstPuzzle = generatePuzzles(3)[0];
  for (const [index, piece] of firstPuzzle.pieces.entries()) {
    click(game, trayPoint(index));
    while (game.getState().rotations[piece.id] !== 0) click(game, rotatePoint);
    click(game, boardPoint(piece.solution));
  }
  game.update(0.8);
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  game.update(999);
  game.update(1);
  assert.equal(results.length, 1);
  assert.deepEqual(
    { ...results[0], steps: undefined },
    { score: 400, elapsed: 180, won: false, rounds: 1, steps: undefined },
  );
  assert.deepEqual(rules.validate(results[0]), []);

  const quiet = [];
  const destroyed = createGame({ seed: 8, onFinish: (result) => quiet.push(result) });
  destroyed.destroy();
  destroyed.update(999);
  assert.equal(quiet.length, 0);
});

test('snapshots are isolated and result rules reject forged scores, counters and early losses', () => {
  const game = createGame({ seed: 9 });
  const state = game.getState();
  state.boardCursor.row = 99;
  state.placements[1] = { row: 99, column: 99, rotation: 0 };
  state.rotations[1] = 99;
  assert.notEqual(game.getState().boardCursor.row, 99);
  assert.notDeepEqual(game.getState().placements[1], state.placements[1]);
  assert.notEqual(game.getState().rotations[1], 99);

  const good = { score: 800, elapsed: 180, won: false, rounds: 2, steps: 20 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 400 },
    { ...good, score: 850 },
    { ...good, rounds: 3 },
    { ...good, won: true },
    { ...good, elapsed: 179 },
    { score: 1200, elapsed: 181, won: true, rounds: 3, steps: 15 },
    { score: 1200, elapsed: 80, won: true, rounds: 3, steps: 14 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, solution: 'drop' }), good);
});
