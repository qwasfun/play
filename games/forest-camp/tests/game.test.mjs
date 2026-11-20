import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cellPoint,
  countSolutions,
  createGame,
  evaluateCamp,
  FOREST_CAMP,
  generatePuzzles,
} from '../src/index.js';

const click = (game, index) => {
  const point = cellPoint(index);
  game.input('primary-down', point);
  game.input('primary-up', point);
};

test('all seeded camp maps retain exactly one solution', () => {
  for (const seed of ['pine', 'mist', 'warm-light', '2026-11-20']) {
    for (const puzzle of generatePuzzles(seed)) assert.equal(countSolutions(puzzle), 1);
  }
});

test('generation is deterministic while different seeds change presentation', () => {
  assert.deepEqual(generatePuzzles('same-seed'), generatePuzzles('same-seed'));
  assert.notDeepEqual(generatePuzzles('same-seed'), generatePuzzles('another-seed'));
});

test('published solutions satisfy every camp rule and clue', () => {
  for (const puzzle of generatePuzzles('rules')) {
    const board = Array(FOREST_CAMP.size ** 2).fill(0);
    puzzle.solution.forEach((index) => (board[index] = 1));
    const result = evaluateCamp(puzzle, board);
    assert.equal(result.solved, true);
    assert.equal(result.paired, true);
    assert.deepEqual(result.rows, puzzle.rows);
    assert.deepEqual(result.columns, puzzle.columns);
  }
});

test('touching tents and tents away from trees are rejected', () => {
  const puzzle = generatePuzzles('invalid')[0];
  const touchingBoard = Array(FOREST_CAMP.size ** 2).fill(0);
  touchingBoard[0] = 1;
  touchingBoard[1] = 1;
  assert.equal(evaluateCamp(puzzle, touchingBoard).separated, false);

  const awayBoard = Array(FOREST_CAMP.size ** 2).fill(0);
  const away = awayBoard.findIndex(
    (_, index) =>
      !puzzle.trees.includes(index) &&
      !puzzle.trees.some((tree) => {
        const row = Math.floor(index / FOREST_CAMP.size);
        const column = index % FOREST_CAMP.size;
        const treeRow = Math.floor(tree / FOREST_CAMP.size);
        const treeColumn = tree % FOREST_CAMP.size;
        return Math.abs(row - treeRow) + Math.abs(column - treeColumn) === 1;
      }),
  );
  awayBoard[away] = 1;
  assert.equal(evaluateCamp(puzzle, awayBoard).besideTree, false);
});

test('pointer cycles tent, grass mark, and empty without changing a tree', () => {
  const game = createGame({ seed: 'pointer' });
  const puzzle = game.getState().puzzle;
  const open = puzzle.solution[0];
  click(game, open);
  assert.equal(game.getState().board[open], 1);
  click(game, open);
  assert.equal(game.getState().board[open], 2);
  click(game, open);
  assert.equal(game.getState().board[open], 0);
  click(game, puzzle.trees[0]);
  assert.equal(game.getState().board[puzzle.trees[0]], 0);
  assert.match(game.getState().hint, /小树的位置/);
});

test('keyboard movement, placement, and undo are supported', () => {
  const game = createGame({ seed: 'keyboard' });
  game.input('key-down', { key: 'ArrowRight' });
  assert.equal(game.getState().cursor, 1);
  game.input('key-down', { key: 'Enter' });
  if (!game.getState().puzzle.trees.includes(1)) assert.equal(game.getState().board[1], 1);
  game.input('key-down', { key: 'z' });
  assert.equal(game.getState().board[1], 0);
});

test('three solved maps finish at 1200 points through real cell input', () => {
  let result;
  const game = createGame({ seed: 'complete', onFinish: (value) => (result = value) });
  for (let round = 0; round < FOREST_CAMP.rounds; round++) {
    const solution = game.getState().puzzle.solution;
    solution.forEach((index) => click(game, index));
    if (round < FOREST_CAMP.rounds - 1) game.update(0.8);
  }
  assert.deepEqual(result, { score: 1200, elapsed: 1.6, won: true, rounds: 3 });
  assert.equal(game.getState().finished, true);
});

test('the time limit ends an unfinished camp without forged progress', () => {
  let result;
  const game = createGame({ seed: 'timeout', onFinish: (value) => (result = value) });
  game.update(FOREST_CAMP.limit + 5);
  assert.deepEqual(result, { score: 0, elapsed: FOREST_CAMP.limit, won: false, rounds: 0 });
});
