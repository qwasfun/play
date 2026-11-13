import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMines, mineNeighbors, revealMeadow, createGame as mines } from '../src/index.js';

const tap = (game, point) => {
  game.input('primary-down', point);
  game.input('primary-up', point);
};

const minePoint = (cell) => ({ x: 156 + (cell % 4) * 96, y: 96 + Math.floor(cell / 4) * 96 });

const key = (game, value) => game.input('key-down', { key: value, repeat: false });

test('mines create reproducible three-mine boards with a safe zero start across 250 seeds', () => {
  for (let seed = 0; seed < 250; seed++) {
    const puzzle = generateMines(seed);
    assert.deepEqual(puzzle, generateMines(seed));
    assert.equal(new Set(puzzle.mines).size, 3);
    assert.equal(puzzle.counts.length, 16);
    assert.equal(puzzle.counts[0], 0);
    for (const cell of [0, 1, 4, 5]) assert.equal(puzzle.mines.includes(cell), false);
    for (let cell = 0; cell < 16; cell++)
      assert.equal(
        puzzle.counts[cell],
        puzzle.mines.includes(cell)
          ? -1
          : mineNeighbors(cell).filter((n) => puzzle.mines.includes(n)).length,
      );
  }
  assert.notDeepEqual(generateMines(1), generateMines(2));
});

test('mine neighbors do not wrap or include themselves, and flood does not reveal flags or bombs', () => {
  assert.deepEqual(mineNeighbors(0), [1, 4, 5]);
  assert.equal(mineNeighbors(5).length, 8);
  assert.deepEqual(mineNeighbors(-1), []);
  assert.deepEqual(mineNeighbors(16), []);
  const { counts, mines: bombs } = generateMines(123),
    flags = Array(16).fill(false),
    original = Array(16).fill(false);
  flags[1] = true;
  const opened = revealMeadow(counts, original, flags, 0);
  assert.equal(opened[0], true);
  assert.equal(opened[1], false);
  for (const cell of bombs) assert.equal(opened[cell], false);
  assert.deepEqual(original, Array(16).fill(false));
});

test('mines normal touch input opens every safe cell and completes once over 220 seeds', () => {
  for (let seed = 0; seed < 220; seed++) {
    const results = [],
      game = mines({ seed, onFinish: (r) => results.push(r) }),
      puzzle = generateMines(seed);
    for (let cell = 0; cell < 16; cell++)
      if (!puzzle.mines.includes(cell)) tap(game, minePoint(cell));
    assert.equal(results.length, 1);
    assert.equal(results[0].won, true);
    assert.equal(results[0].score, 480);
    assert.equal(results[0].opened, 13);
    const before = game.getState();
    tap(game, minePoint(puzzle.mines[0]));
    game.update(500);
    assert.deepEqual(game.getState(), before);
  }
});

test('mines long holds toggle flags on release and cannot reveal the marked cell', () => {
  const game = mines({ seed: 123 }),
    cell = game.getState().mines[0];
  game.input('primary-down', minePoint(cell));
  game.update(0.45);
  assert.equal(game.getState().flags[cell], false);
  game.input('primary-up', minePoint(cell));
  assert.equal(game.getState().flags[cell], true);
  assert.equal(game.getState().finished, false);
  tap(game, minePoint(cell));
  assert.equal(game.getState().flags[cell], true);
  assert.equal(game.getState().finished, false);
  game.input('primary-down', minePoint(cell));
  game.update(0.5);
  game.input('primary-up', minePoint(cell));
  assert.equal(game.getState().flags[cell], false);
});

test('mines cancel, dragging outside a held cell and mismatched release never reveal or flag', () => {
  const game = mines({ seed: 123 }),
    point = minePoint(0);
  game.input('primary-down', point);
  game.update(0.6);
  game.input('primary-cancel');
  game.input('primary-up', point);
  game.input('primary-down', point);
  game.update(0.6);
  game.input('primary-move', minePoint(1));
  game.input('primary-move', point);
  game.input('primary-up', point);
  game.input('primary-down', point);
  game.input('primary-up', minePoint(1));
  assert.equal(game.getState().opened, 0);
  assert.equal(game.getState().flagCount, 0);
  assert.equal(game.getState().finished, false);
});

test('mines keyboard wraps selection, flags with Enter and reveals with Space', () => {
  const game = mines({ seed: 123 });
  key(game, 'ArrowLeft');
  assert.equal(game.getState().selected, 3);
  key(game, 'ArrowUp');
  assert.equal(game.getState().selected, 15);
  key(game, 'Enter');
  assert.equal(game.getState().flags[15], true);
  key(game, 'Enter');
  assert.equal(game.getState().flags[15], false);
  key(game, 'ArrowRight');
  key(game, 'ArrowDown');
  assert.equal(game.getState().selected, 0);
  game.input('key-down', { key: ' ', repeat: true });
  assert.equal(game.getState().opened, 0);
  key(game, ' ');
  assert.ok(game.getState().opened >= 4);
});

test('mines flag cap is three and an opened flower cannot be marked', () => {
  const game = mines({ seed: 9 });
  for (const cell of [2, 3, 6, 7]) {
    game.input('primary-down', minePoint(cell));
    game.update(0.5);
    game.input('primary-up', minePoint(cell));
  }
  assert.equal(game.getState().flagCount, 3);
  assert.equal(game.getState().flags[7], false);
  tap(game, minePoint(0));
  game.input('primary-down', minePoint(0));
  game.update(0.5);
  game.input('primary-up', minePoint(0));
  assert.equal(game.getState().flags[0], false);
});

test('mines bomb, timeout and destruction have bounded results and a single callback', () => {
  const results = [],
    game = mines({ seed: 123, onFinish: (r) => results.push(r) });
  tap(game, minePoint(game.getState().mines[0]));
  game.update(500);
  tap(game, minePoint(0));
  assert.equal(results.length, 1);
  assert.equal(results[0].reason, 'mine');
  assert.equal(results[0].won, false);
  const timed = [],
    other = mines({ seed: 4, onFinish: (r) => timed.push(r) });
  other.update(300);
  other.update(1);
  assert.equal(timed.length, 1);
  assert.equal(timed[0].elapsed, 180);
  assert.equal(timed[0].reason, 'time');
  const silent = [],
    destroyed = mines({ seed: 4, onFinish: (r) => silent.push(r) });
  destroyed.destroy();
  destroyed.update(400);
  assert.equal(silent.length, 0);
});
