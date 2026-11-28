import test from 'node:test';
import assert from 'node:assert/strict';
import { GARDEN_PLOTS, cellCenter, createGame, generateBoards, rectCells } from '../src/index.js';
import { rules } from '../src/rules.js';

function drag(game, rect, cancel = false) {
  const start = cellCenter({ r: rect.r, c: rect.c });
  const end = cellCenter({ r: rect.r + rect.h - 1, c: rect.c + rect.w - 1 });
  game.input('primary-down', start);
  game.input('primary-move', end);
  if (cancel) game.input('primary-cancel');
  else game.input('primary-up', end);
}

test('seeded flower plots are deterministic, varied and cover every cell exactly once', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 240; seed++) {
    const boards = generateBoards(seed);
    assert.deepEqual(boards, generateBoards(seed));
    assert.equal(boards.length, GARDEN_PLOTS.boards);
    for (const board of boards) {
      assert.equal(board.solution.length, GARDEN_PLOTS.plotsPerBoard);
      assert.equal(board.clues.length, GARDEN_PLOTS.plotsPerBoard);
      const covered = new Set();
      for (const [index, rect] of board.solution.entries()) {
        const cells = rectCells(rect);
        assert.equal(cells.length, board.clues[index].value);
        assert.ok(
          cells.some(({ r, c }) => r === board.clues[index].r && c === board.clues[index].c),
        );
        for (const cell of cells) {
          const key = `${cell.r}:${cell.c}`;
          assert.equal(covered.has(key), false);
          covered.add(key);
        }
      }
      assert.equal(covered.size, 25);
    }
    signatures.add(JSON.stringify(boards));
  }
  assert.ok(signatures.size > 180);
});

test('real pointer drags divide all three gardens and finish once', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  for (const [index, board] of generateBoards(42).entries()) {
    for (const rect of board.solution) drag(game, rect);
    if (index < GARDEN_PLOTS.boards - 1) game.update(1);
  }
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 1200,
    elapsed: results[0].elapsed,
    won: true,
    boards: 3,
    plots: 15,
  });
  assert.deepEqual(rules.validate(results[0]), []);
  game.update(999);
  assert.equal(results.length, 1);
});

test('keyboard corners complete every generated rectangle', () => {
  const game = createGame({ seed: 17 });
  for (const [index, board] of generateBoards(17).entries()) {
    let cursor = { r: 0, c: 0 };
    for (const rect of board.solution) {
      const start = { r: rect.r, c: rect.c };
      const end = { r: rect.r + rect.h - 1, c: rect.c + rect.w - 1 };
      while (cursor.r < start.r) (game.input('key-down', { key: 'ArrowDown' }), cursor.r++);
      while (cursor.r > start.r) (game.input('key-down', { key: 'ArrowUp' }), cursor.r--);
      while (cursor.c < start.c) (game.input('key-down', { key: 'ArrowRight' }), cursor.c++);
      while (cursor.c > start.c) (game.input('key-down', { key: 'ArrowLeft' }), cursor.c--);
      game.input('key-down', { key: 'Space' });
      while (cursor.r < end.r) (game.input('key-down', { key: 's' }), cursor.r++);
      while (cursor.c < end.c) (game.input('key-down', { key: 'd' }), cursor.c++);
      game.input('key-down', { key: 'Enter' });
    }
    if (index < GARDEN_PLOTS.boards - 1) game.update(1);
  }
  assert.equal(game.getState().score, 1200);
  assert.equal(game.getState().won, true);
});

test('wrong areas, missing clues and overlaps are refused with honest state', () => {
  const game = createGame({ seed: 9 });
  const board = generateBoards(9)[0];
  const clue = board.clues[0];
  drag(game, { r: clue.r, c: clue.c, h: 1, w: 1 });
  assert.equal(game.getState().rectangles.length, 0);
  const empty = Array.from({ length: 25 }, (_, index) => ({
    r: Math.floor(index / 5),
    c: index % 5,
  })).find((cell) => !board.clues.some((item) => item.r === cell.r && item.c === cell.c));
  drag(game, { ...empty, h: 1, w: 1 });
  assert.equal(game.getState().rectangles.length, 0);
  drag(game, board.solution[0]);
  drag(game, board.solution[0]);
  assert.equal(game.getState().rectangles.length, 1);
});

test('cancel, repeat, invalid points and undo never forge a plot', () => {
  const game = createGame({ seed: 5 });
  const rect = generateBoards(5)[0].solution[0];
  drag(game, rect, true);
  game.input('primary-down', { x: -20, y: -20 });
  game.input('primary-up', cellCenter({ r: 0, c: 0 }));
  game.input('key-down', { key: 'Space', repeat: true });
  assert.equal(game.getState().plots, 0);
  drag(game, rect);
  assert.equal(game.getState().plots, 1);
  game.input('key-down', { key: 'z' });
  assert.equal(game.getState().plots, 0);
});

test('transition locks input and opens the next board cleanly', () => {
  const game = createGame({ seed: 8 });
  for (const rect of generateBoards(8)[0].solution) drag(game, rect);
  assert.equal(game.getState().phase, 'transition');
  const locked = game.getState();
  game.input('key-down', { key: 'Space' });
  drag(game, generateBoards(8)[1].solution[0]);
  assert.equal(game.getState().plots, locked.plots);
  game.update(1);
  assert.equal(game.getState().boardIndex, 1);
  assert.equal(game.getState().rectangles.length, 0);
});

test('invalid time is ignored, timeout clamps, snapshots isolate and destroy stays silent', () => {
  const results = [];
  const game = createGame({ seed: 4, onFinish: (result) => results.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  const snapshot = game.getState();
  snapshot.board.clues[0].value = 99;
  snapshot.cursor.r = 99;
  assert.notEqual(game.getState().board.clues[0].value, 99);
  assert.notEqual(game.getState().cursor.r, 99);
  game.update(999);
  assert.equal(results[0].elapsed, GARDEN_PLOTS.limit);
  assert.deepEqual(rules.validate(results[0]), []);
  const quiet = [];
  const destroyed = createGame({ seed: 4, onFinish: (result) => quiet.push(result) });
  destroyed.destroy();
  destroyed.update(999);
  assert.equal(quiet.length, 0);
});

test('ranked rules reject forged scores, counters, wins and unfinished losses', () => {
  const good = { score: 1200, elapsed: 40, won: true, boards: 3, plots: 15 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 800 },
    { ...good, boards: 2 },
    { ...good, plots: 14 },
    { ...good, won: false },
    { score: 400, elapsed: 30, won: false, boards: 1, plots: 7 },
    { score: 0, elapsed: 30, won: false, boards: 0, plots: 2 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
});
