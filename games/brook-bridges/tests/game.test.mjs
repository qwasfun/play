import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bridgePoint,
  BROOK_BRIDGES,
  countSolutions,
  createGame,
  evaluateBridges,
  generatePuzzles,
  islandPoint,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function tap(game, point) {
  game.input('primary-down', point);
  game.input('primary-up', point);
}

function solveRound(game, puzzle) {
  puzzle.edges.forEach((edge, index) => {
    for (let count = 0; count < puzzle.solution[index]; count++)
      tap(game, bridgePoint(puzzle, edge));
  });
}

function solve(game, seed) {
  generatePuzzles(seed).forEach((puzzle, round) => {
    solveRound(game, puzzle);
    if (round < BROOK_BRIDGES.rounds - 1) game.update(0.7);
  });
}

test('seeded brook puzzles are deterministic, varied, valid and uniquely solvable', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 80; seed++) {
    const puzzles = generatePuzzles(seed);
    assert.deepEqual(puzzles, generatePuzzles(seed));
    assert.equal(puzzles.length, BROOK_BRIDGES.rounds);
    assert.equal(new Set(puzzles.map(({ name }) => name)).size, BROOK_BRIDGES.rounds);
    for (const puzzle of puzzles) {
      assert.equal(countSolutions(puzzle, 2), 1, puzzle.name);
      assert.equal(evaluateBridges(puzzle, puzzle.solution).solved, true);
      assert.equal(
        evaluateBridges(
          puzzle,
          puzzle.edges.map(() => 0),
        ).solved,
        false,
      );
      assert.ok(puzzle.islands.length >= 7);
      assert.ok(puzzle.solution.some((count) => count === 2));
    }
    signatures.add(
      puzzles
        .map(
          (puzzle) =>
            `${puzzle.name}:${puzzle.variant}:${puzzle.islands.map(({ id }) => id).join('')}`,
        )
        .join('|'),
    );
  }
  assert.ok(signatures.size >= 60);
  assert.notDeepEqual(generatePuzzles(42), generatePuzzles(43));
});

test('real pointer bridge taps solve all three brooks and produce a ranked result', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  solve(game, 42);
  assert.deepEqual(results, [{ score: 1200, elapsed: 1.4, won: true, rounds: 3 }]);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.update(999);
  tap(game, bridgePoint(end.puzzle, end.puzzle.edges[0]));
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('keyboard selects a stone, moves the cursor and ignores repeated connect keys', () => {
  const game = createGame({ seed: 7 });
  game.input('key-down', { key: 'Enter' });
  assert.equal(game.getState().selected, game.getState().puzzle.islands[0].id);
  const original = game.getState().cursor;
  for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
    game.input('key-down', { key });
    if (game.getState().cursor !== original) break;
  }
  assert.notEqual(game.getState().cursor, original);
  const selected = game.getState().selected;
  game.input('key-down', { key: ' ', repeat: true });
  assert.equal(game.getState().selected, selected);
});

test('undo restores bridge counts and invalid pointer input stays inert', () => {
  const game = createGame({ seed: 19 });
  const puzzle = game.getState().puzzle;
  const point = bridgePoint(puzzle, puzzle.edges[0]);
  tap(game, point);
  assert.equal(game.getState().counts[0], 1);
  game.input('key-down', { key: 'z' });
  assert.equal(game.getState().counts[0], 0);
  for (const payload of [{}, { x: NaN, y: 120 }, { x: Infinity, y: 120 }, { x: 5, y: 5 }]) {
    game.input('primary-down', payload);
    game.input('primary-up', payload);
  }
  game.input('primary-down', point);
  game.input('primary-cancel');
  game.input('primary-up', point);
  assert.equal(game.getState().moves, 0);
});

test('crossing and excess-degree bridges are refused with specific guidance', () => {
  const game = createGame({ seed: 42 });
  const puzzle = game.getState().puzzle;
  let crossingPair;
  for (let first = 0; first < puzzle.edges.length; first++) {
    for (let second = first + 1; second < puzzle.edges.length; second++) {
      const trial = puzzle.edges.map(() => 0);
      trial[first] = 1;
      trial[second] = 1;
      if (evaluateBridges(puzzle, trial).crossing) crossingPair = [first, second];
    }
  }
  assert.ok(crossingPair, '测试关卡应包含可交叉的候选桥');
  tap(game, bridgePoint(puzzle, puzzle.edges[crossingPair[0]]));
  const islands = Object.fromEntries(puzzle.islands.map((island) => [island.id, island]));
  const crossingEdge = puzzle.edges[crossingPair[1]];
  tap(game, islandPoint(islands[crossingEdge.from]));
  tap(game, islandPoint(islands[crossingEdge.to]));
  assert.equal(game.getState().counts[crossingPair[1]], 0);
  assert.match(game.getState().hint, /交叉/);

  const tiny = puzzle.islands.find((island) => island.target === 1);
  if (tiny) {
    const edgeIndex = puzzle.edges.findIndex(
      (edge) => edge.from === tiny.id || edge.to === tiny.id,
    );
    const fresh = createGame({ seed: 42 });
    tap(fresh, bridgePoint(puzzle, puzzle.edges[edgeIndex]));
    tap(fresh, bridgePoint(puzzle, puzzle.edges[edgeIndex]));
    assert.equal(fresh.getState().counts[edgeIndex], 1);
    assert.match(fresh.getState().hint, /桥太多/);
  }
});

test('a solved brook locks input during transition then opens the next seeded board', () => {
  const game = createGame({ seed: 23 });
  const puzzles = generatePuzzles(23);
  solveRound(game, puzzles[0]);
  assert.equal(game.getState().phase, 'transition');
  const completed = game.getState().counts;
  tap(game, bridgePoint(puzzles[0], puzzles[0].edges[0]));
  assert.deepEqual(game.getState().counts, completed);
  game.update(0.7);
  assert.equal(game.getState().phase, 'play');
  assert.equal(game.getState().round, 1);
  assert.deepEqual(
    game.getState().counts,
    puzzles[1].edges.map(() => 0),
  );
});

test('timeout clamps, preserves completed brooks and destroy stays silent', () => {
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
  state.counts[0] = 2;
  state.degrees.a = 9;
  state.puzzle.islands[0].row = 9;
  state.puzzle.solution[0] = 9;
  assert.notEqual(game.getState().counts[0], 2);
  assert.notEqual(game.getState().degrees.a, 9);
  assert.notEqual(game.getState().puzzle.islands[0].row, 9);
  assert.notEqual(game.getState().puzzle.solution[0], 9);

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
