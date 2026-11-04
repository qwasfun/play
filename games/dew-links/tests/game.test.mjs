import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, DEW_LINKS, generatePuzzles } from '../src/index.js';
import { rules } from '../src/rules.js';

const point = ({ row, column }) => ({ x: 150 + column * 60 + 30, y: 82 + row * 60 + 30 });

function trace(game, cells, step = 0.01) {
  game.input('primary-down', point(cells[0]));
  for (const cell of cells.slice(1)) {
    game.update(step);
    game.input('primary-move', point(cell));
  }
  game.input('primary-up', point(cells.at(-1)));
}

function solvePointer(game, seed) {
  for (const [round, puzzle] of generatePuzzles(seed).entries()) {
    for (const route of puzzle.routes) trace(game, route.cells);
    if (round < DEW_LINKS.rounds - 1) game.update(0.8);
  }
}

function moveCursor(game, target) {
  let cursor = game.getState().cursor;
  while (cursor.row < target.row) {
    game.input('key-down', { key: 'ArrowDown' });
    cursor = game.getState().cursor;
  }
  while (cursor.row > target.row) {
    game.input('key-down', { key: 'ArrowUp' });
    cursor = game.getState().cursor;
  }
  while (cursor.column < target.column) {
    game.input('key-down', { key: 'ArrowRight' });
    cursor = game.getState().cursor;
  }
  while (cursor.column > target.column) {
    game.input('key-down', { key: 'ArrowLeft' });
    cursor = game.getState().cursor;
  }
}

function solveKeyboard(game, seed) {
  for (const [round, puzzle] of generatePuzzles(seed).entries()) {
    for (const route of puzzle.routes) {
      moveCursor(game, route.cells[0]);
      game.input('key-down', { key: ' ' });
      for (let index = 1; index < route.cells.length; index++) {
        const previous = route.cells[index - 1];
        const current = route.cells[index];
        const key =
          current.row < previous.row
            ? 'w'
            : current.row > previous.row
              ? 's'
              : current.column < previous.column
                ? 'a'
                : 'd';
        game.update(0.01);
        game.input('key-down', { key });
      }
    }
    if (round < DEW_LINKS.rounds - 1) game.update(0.8);
  }
}

test('seeded flower beds are deterministic, varied and contain four disjoint covering paths', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const puzzles = generatePuzzles(seed);
    assert.deepEqual(puzzles, generatePuzzles(seed));
    assert.equal(puzzles.length, DEW_LINKS.rounds);
    for (const puzzle of puzzles) {
      assert.equal(puzzle.routes.length, DEW_LINKS.pairs);
      const cells = puzzle.routes.flatMap((route) => route.cells);
      assert.equal(cells.length, DEW_LINKS.size ** 2);
      assert.equal(new Set(cells.map((cell) => `${cell.row}:${cell.column}`)).size, cells.length);
      for (const route of puzzle.routes) {
        assert.ok(route.cells.length >= 5);
        assert.deepEqual(puzzle.endpoints[route.label], [route.cells[0], route.cells.at(-1)]);
        for (let index = 1; index < route.cells.length; index++)
          assert.equal(
            Math.abs(route.cells[index].row - route.cells[index - 1].row) +
              Math.abs(route.cells[index].column - route.cells[index - 1].column),
            1,
          );
      }
      signatures.add(
        puzzle.routes
          .map((route) =>
            [route.label, ...route.cells.map((cell) => `${cell.row}:${cell.column}`)].join(','),
          )
          .join('|'),
      );
    }
  }
  assert.ok(signatures.size > 20);
  assert.notDeepEqual(generatePuzzles(42), generatePuzzles(43));
});

test('real pointer paths fill three beds once and produce a valid ranked result', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  solvePointer(game, 42);
  assert.equal(results.length, 1);
  assert.equal(results[0].score, 1200);
  assert.equal(results[0].won, true);
  assert.equal(results[0].paths, 12);
  assert.equal(results[0].rounds, 3);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.update(999);
  game.input('primary-down', point({ row: 0, column: 0 }));
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('keyboard selection and drawing also complete every puzzle', () => {
  const results = [];
  const game = createGame({ seed: 17, onFinish: (result) => results.push(result) });
  solveKeyboard(game, 17);
  assert.equal(results.length, 1);
  assert.deepEqual(
    { ...results[0], elapsed: Number(results[0].elapsed.toFixed(2)) },
    { score: 1200, elapsed: 2.23, won: true, paths: 12, rounds: 3 },
  );
  assert.deepEqual(rules.validate(results[0]), []);
});

test('cancel, invalid points, repeated keys and non-adjacent jumps never create a path', () => {
  const game = createGame({ seed: 42 });
  const route = generatePuzzles(42)[0].routes[0];
  game.input('primary-down', point(route.cells[0]));
  game.input('primary-cancel');
  game.input('primary-move', point(route.cells[1]));
  game.input('primary-up', point(route.cells[1]));
  for (const invalid of [{}, { x: NaN, y: 100 }, { x: 10, y: 10 }]) {
    game.input('primary-down', invalid);
    game.input('primary-up', invalid);
  }
  game.input('primary-down', point(route.cells[0]));
  game.input('primary-move', point(route.cells[2]));
  game.input('primary-up', point(route.cells[2]));
  game.input('key-down', { key: 'ArrowRight', repeat: true });
  assert.equal(game.getState().filled, 1);
  assert.equal(game.getState().rounds, 0);
});

test('backtracking, occupied cells, continuation and clearing preserve honest paths', () => {
  const game = createGame({ seed: 9 });
  const [first, second] = generatePuzzles(9)[0].routes;
  trace(game, first.cells.slice(0, 4));
  assert.equal(game.getState().paths[first.label].length, 4);
  game.input('primary-down', point(first.cells[3]));
  game.input('primary-move', point(first.cells[2]));
  game.input('primary-up', point(first.cells[2]));
  assert.equal(game.getState().paths[first.label].length, 3);
  trace(game, first.cells.slice(2));
  assert.equal(game.getState().paths[first.label].length, first.cells.length);
  game.input('primary-down', point(second.cells[0]));
  game.input('primary-move', point(first.cells.at(-1)));
  game.input('primary-up', point(first.cells.at(-1)));
  assert.equal(game.getState().paths[second.label].length, 1);
  moveCursor(game, first.cells[1]);
  game.input('key-down', { key: 'z' });
  assert.equal(game.getState().paths[first.label].length, 0);
});

test('four connected pairs do not score unless they fill the whole flower bed', () => {
  const game = createGame({ seed: 31 });
  const puzzle = generatePuzzles(31)[0];
  for (const route of puzzle.routes) {
    const shortcut = [route.cells[0], route.cells.at(-1)];
    trace(game, shortcut);
  }
  assert.equal(game.getState().rounds, 0);
  assert.equal(game.getState().score, 0);
  assert.equal(game.getState().finished, false);
});

test('timeout clamps at 150 seconds, partial beds do not score and destroy stays silent', () => {
  const results = [];
  const game = createGame({ seed: 5, onFinish: (result) => results.push(result) });
  trace(game, generatePuzzles(5)[0].routes[0].cells);
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  game.update(999);
  game.update(1);
  assert.deepEqual(results[0], { score: 0, elapsed: 150, won: false, paths: 0, rounds: 0 });
  assert.deepEqual(rules.validate(results[0]), []);

  const quiet = [];
  const destroyed = createGame({ seed: 8, onFinish: (result) => quiet.push(result) });
  destroyed.destroy();
  destroyed.update(999);
  assert.equal(quiet.length, 0);
});

test('snapshots are isolated and result rules reject forged scores, counters and early losses', () => {
  const game = createGame({ seed: 42 });
  const route = generatePuzzles(42)[0].routes[0];
  trace(game, route.cells.slice(0, 3));
  const state = game.getState();
  state.paths[route.label][0].row = 99;
  state.cursor.row = 99;
  assert.notEqual(game.getState().paths[route.label][0].row, 99);
  assert.notEqual(game.getState().cursor.row, 99);

  const good = { score: 800, elapsed: 150, won: false, paths: 8, rounds: 2 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 400 },
    { ...good, score: 850 },
    { ...good, paths: 7 },
    { ...good, rounds: 3 },
    { ...good, won: true },
    { ...good, elapsed: 149 },
    { score: 1200, elapsed: 151, won: true, paths: 12, rounds: 3 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, solution: 'drop' }), good);
});
