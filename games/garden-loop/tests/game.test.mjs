import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allEdges,
  createGame,
  edgeEnds,
  edgePoint,
  GARDEN_LOOP,
  generatePuzzles,
  isSingleLoop,
  satisfiesPuzzle,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function solve(game, seed) {
  for (const [round, puzzle] of generatePuzzles(seed).entries()) {
    for (const id of puzzle.solution) game.input('primary-down', edgePoint(id));
    if (round < GARDEN_LOOP.rounds - 1) game.update(0.8);
  }
}

test('seeded flower beds are deterministic, varied and carry valid single-loop solutions', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const puzzles = generatePuzzles(seed);
    assert.deepEqual(puzzles, generatePuzzles(seed));
    assert.equal(puzzles.length, GARDEN_LOOP.rounds);
    for (const puzzle of puzzles) {
      assert.deepEqual(
        puzzle.clues.map((row) => row.length),
        [4, 4, 4, 4],
      );
      assert.ok(
        puzzle.clues.flat().every((clue) => Number.isInteger(clue) && clue >= 0 && clue <= 3),
      );
      assert.equal(new Set(puzzle.solution).size, puzzle.solution.length);
      assert.ok(puzzle.solution.every((id) => allEdges.includes(id) && edgeEnds(id).length === 2));
      assert.equal(isSingleLoop(puzzle.solution), true);
      assert.equal(satisfiesPuzzle(puzzle, puzzle.solution), true);
      signatures.add(puzzle.solution.join(','));
    }
  }
  assert.ok(signatures.size >= 8);
  assert.notDeepEqual(generatePuzzles(42), generatePuzzles(43));
});

test('real pointer taps solve all three beds once and produce a valid ranked result', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  solve(game, 42);
  assert.deepEqual(results, [{ score: 1200, elapsed: 1.6, won: true, rounds: 3 }]);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.update(999);
  game.input('primary-down', edgePoint(generatePuzzles(42)[0].solution[0]));
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('keyboard navigation, toggling, repeated keys and undo behave consistently', () => {
  const game = createGame({ seed: 7 });
  const first = game.getState().selected;
  game.input('key-down', { key: ' ', repeat: true });
  assert.equal(game.getState().edges.length, 0);
  game.input('key-down', { key: ' ' });
  assert.deepEqual(game.getState().edges, [first]);
  game.input('key-down', { key: 'ArrowRight' });
  assert.notEqual(game.getState().selected, first);
  game.input('key-down', { key: 'Enter' });
  assert.equal(game.getState().edges.length, 2);
  game.input('key-down', { key: 'z' });
  assert.deepEqual(game.getState().edges, [first]);
  game.input('undo');
  assert.equal(game.getState().edges.length, 0);
});

test('keyboard traversal can reach and toggle every fence edge', () => {
  const game = createGame({ seed: 19 });
  const visited = new Set();
  for (let index = 0; index < allEdges.length; index++) {
    visited.add(game.getState().selected);
    game.input('key-down', { key: 'ArrowRight' });
  }
  assert.deepEqual(visited, new Set(allEdges));
  assert.equal(game.getState().selected, allEdges[0]);
  game.input('key-down', { key: 'ArrowUp' });
  assert.equal(game.getState().selected, allEdges.at(-GARDEN_LOOP.size));
});

test('invalid points and unrelated input cannot place a fence', () => {
  const game = createGame({ seed: 5 });
  for (const payload of [{}, { x: NaN, y: 80 }, { x: 20, y: 20 }, { x: Infinity, y: 80 }])
    game.input('primary-down', payload);
  game.input('primary-move', edgePoint(allEdges[0]));
  game.input('primary-up', edgePoint(allEdges[0]));
  game.input('key-down', { key: 'q' });
  assert.equal(game.getState().edges.length, 0);
});

test('loop validation rejects open paths, branches, disjoint loops and clue mismatches', () => {
  const puzzle = generatePuzzles(11)[0];
  assert.equal(isSingleLoop(puzzle.solution.slice(1)), false);
  assert.equal(isSingleLoop([...puzzle.solution, 'v:0:1']), false);
  const twoCells = ['h:0:0', 'v:0:1', 'h:1:0', 'v:0:0', 'h:2:2', 'v:2:3', 'h:3:2', 'v:2:2'];
  assert.equal(isSingleLoop(twoCells), false);
  assert.equal(satisfiesPuzzle(puzzle, twoCells), false);
  const altered = { ...puzzle, clues: puzzle.clues.map((row) => [...row]) };
  altered.clues[0][0] = (altered.clues[0][0] + 1) % 4;
  assert.equal(satisfiesPuzzle(altered, puzzle.solution), false);
});

test('timeout clamps at 180 seconds, keeps completed beds and destroy stays silent', () => {
  const results = [];
  const game = createGame({ seed: 12, onFinish: (result) => results.push(result) });
  for (const id of generatePuzzles(12)[0].solution) game.input('primary-down', edgePoint(id));
  game.update(0.8);
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
  game.input('primary-down', edgePoint(generatePuzzles(42)[0].solution[0]));
  const state = game.getState();
  state.edges.push('h:9:9');
  assert.equal(game.getState().edges.includes('h:9:9'), false);

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
