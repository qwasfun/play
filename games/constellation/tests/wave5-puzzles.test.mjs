import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateConstellations,
  constellationNodeAt,
  validConstellationStep,
  createGame as constellation,
} from '../src/index.js';

const tap = (game, point) => {
  game.input('primary-down', point);
  game.input('primary-up', point);
};

const key = (game, value) => game.input('key-down', { key: value, repeat: false });

test('constellations are deterministic varied Euler puzzles with phone-sized node targets', () => {
  for (let seed = 0; seed < 220; seed++) {
    const puzzles = generateConstellations(seed);
    assert.deepEqual(puzzles, generateConstellations(seed));
    assert.equal(puzzles.length, 3);
    for (const puzzle of puzzles) {
      assert.ok(puzzle.nodes.length >= 5 && puzzle.nodes.length <= 7);
      assert.equal(puzzle.solution.length, puzzle.edges.length + 1);
      const path = [];
      for (const node of puzzle.solution) {
        assert.equal(validConstellationStep(puzzle, path, node), true);
        path.push(node);
      }
      assert.equal(
        new Set(puzzle.edges.map(([a, b]) => [a, b].sort().join(':'))).size,
        puzzle.edges.length,
      );
      for (let a = 0; a < puzzle.nodes.length; a++)
        for (let b = a + 1; b < puzzle.nodes.length; b++)
          assert.ok(
            Math.hypot(
              puzzle.nodes[a].x - puzzle.nodes[b].x,
              puzzle.nodes[a].y - puzzle.nodes[b].y,
            ) >= 96,
          );
    }
  }
  assert.notDeepEqual(generateConstellations(1), generateConstellations(2));
});

test('constellation touch taps complete all three stages and record every edge once', () => {
  for (let seed = 0; seed < 50; seed++) {
    const results = [],
      game = constellation({ seed, onFinish: (r) => results.push(r) }),
      puzzles = generateConstellations(seed);
    for (const puzzle of puzzles) {
      for (const node of puzzle.solution) tap(game, puzzle.nodes[node]);
      game.update(0.51);
    }
    assert.equal(results.length, 1);
    assert.equal(results[0].won, true);
    assert.equal(results[0].score, 700);
    assert.equal(results[0].steps, 20);
    const state = game.getState();
    game.update(400);
    tap(game, puzzles[2].nodes[0]);
    assert.deepEqual(game.getState(), state);
  }
});

test('a constellation drag can draw a whole graph and cancellation retains prior committed edges', () => {
  const game = constellation({ seed: 123 }),
    puzzle = generateConstellations(123)[0],
    first = puzzle.solution[0],
    second = puzzle.solution[1];
  tap(game, puzzle.nodes[first]);
  tap(game, puzzle.nodes[second]);
  const before = game.getState();
  game.input('primary-down', puzzle.nodes[second]);
  game.input('primary-move', puzzle.nodes[puzzle.solution[2]]);
  game.input('primary-cancel');
  game.input('primary-up', puzzle.nodes[puzzle.solution[2]]);
  assert.deepEqual(game.getState().path, before.path);
  assert.equal(game.getState().steps, before.steps);
  game.input('primary-down', puzzle.nodes[second]);
  for (const node of puzzle.solution.slice(2)) game.input('primary-move', puzzle.nodes[node]);
  game.input('primary-up', puzzle.nodes[puzzle.solution.at(-1)]);
  assert.equal(game.getState().score, 200);
  assert.equal(game.getState().transition, 0.5);
});

test('constellation invalid edges cannot skip nodes or reuse a line, and undo retains step count', () => {
  const game = constellation({ seed: 123 }),
    puzzle = generateConstellations(123)[0],
    a = puzzle.solution[0],
    b = puzzle.solution[1];
  tap(game, puzzle.nodes[a]);
  tap(game, puzzle.nodes[b]);
  tap(game, puzzle.nodes[a]);
  assert.deepEqual(game.getState().path, [a, b]);
  assert.equal(game.getState().steps, 1);
  game.input('undo');
  assert.deepEqual(game.getState().path, [a]);
  assert.equal(game.getState().steps, 1);
  assert.equal(game.getState().score, 0);
  tap(game, puzzle.nodes[b]);
  assert.equal(game.getState().steps, 2);
  assert.equal(game.getState().score, 20);
  assert.equal(validConstellationStep(puzzle, [a], -1), false);
  assert.equal(validConstellationStep(puzzle, [a], 100), false);
});

test('constellation keyboard selection confirms nodes and ignores repeats and cancelled tap', () => {
  const game = constellation({ seed: 4 }),
    puzzle = generateConstellations(4)[0];
  key(game, 'ArrowLeft');
  assert.equal(game.getState().selected, puzzle.nodes.length - 1);
  key(game, 'ArrowRight');
  assert.equal(game.getState().selected, 0);
  game.input('key-down', { key: ' ', repeat: true });
  assert.deepEqual(game.getState().path, []);
  game.input('primary-down', puzzle.nodes[0]);
  game.input('primary-cancel');
  game.input('primary-up', puzzle.nodes[0]);
  assert.deepEqual(game.getState().path, []);
  key(game, ' ');
  assert.deepEqual(game.getState().path, [0]);
  assert.equal(constellationNodeAt(puzzle.nodes, -5, -5), -1);
  assert.equal(constellationNodeAt(puzzle.nodes, NaN, 0), -1);
});

test('constellation timeout and destruction settle at most once', () => {
  const results = [],
    game = constellation({ seed: 6, onFinish: (r) => results.push(r) });
  game.update(300);
  game.update(1);
  game.input('undo');
  assert.equal(results.length, 1);
  assert.equal(results[0].elapsed, 180);
  assert.equal(results[0].won, false);
  assert.equal(results[0].reason, 'time');
  const silent = [];
  const other = constellation({ seed: 6, onFinish: (r) => silent.push(r) });
  other.destroy();
  other.update(300);
  assert.equal(silent.length, 0);
});
