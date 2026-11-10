import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chimePoint,
  CHIME_ORDER,
  createGame,
  generatePuzzles,
  isPermutation,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function solveOrder(game, target) {
  const order = game.getState().order;
  for (let index = 0; index < target.length; index++) {
    if (order[index] === target[index]) continue;
    const other = order.indexOf(target[index], index + 1);
    game.input('primary-down', chimePoint(index));
    game.input('primary-down', chimePoint(other));
    [order[index], order[other]] = [order[other], order[index]];
  }
}

function solve(game, seed) {
  for (const [round, puzzle] of generatePuzzles(seed).entries()) {
    solveOrder(game, puzzle.target);
    if (round < CHIME_ORDER.rounds - 1) game.update(0.8);
  }
}

test('seeded melodies are deterministic, varied and start meaningfully scrambled', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 200; seed++) {
    const puzzles = generatePuzzles(seed);
    assert.deepEqual(puzzles, generatePuzzles(seed));
    assert.equal(puzzles.length, CHIME_ORDER.rounds);
    for (const puzzle of puzzles) {
      assert.equal(isPermutation(puzzle.target), true);
      assert.equal(isPermutation(puzzle.initial), true);
      assert.notDeepEqual(puzzle.initial, puzzle.target);
      assert.equal(puzzle.intervals.length, CHIME_ORDER.size - 1);
      assert.deepEqual(
        puzzle.intervals,
        puzzle.target.slice(1).map((value, index) => value - puzzle.target[index]),
      );
      signatures.add(puzzle.target.join(''));
    }
  }
  assert.ok(signatures.size >= 100);
  assert.notDeepEqual(generatePuzzles(42), generatePuzzles(43));
  assert.equal(isPermutation([1, 2, 3]), false);
  assert.equal(isPermutation([1, 2, 3, 4, 5, 5]), false);
});

test('real pointer swaps solve all three melodies and produce a valid ranked result', () => {
  const results = [];
  const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
  solve(game, 42);
  assert.deepEqual(results, [{ score: 1200, elapsed: 1.6, won: true, rounds: 3 }]);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.update(999);
  game.input('primary-down', chimePoint(0));
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('keyboard selection, swapping, cancellation and undo are consistent', () => {
  const game = createGame({ seed: 7 });
  const initial = game.getState().order;
  game.input('key-down', { key: ' ', repeat: true });
  assert.equal(game.getState().heldIndex, -1);
  game.input('key-down', { key: ' ' });
  assert.equal(game.getState().heldIndex, 0);
  game.input('key-down', { key: 'ArrowRight' });
  game.input('key-down', { key: 'Enter' });
  assert.deepEqual(game.getState().order.slice(0, 2), [initial[1], initial[0]]);
  assert.equal(game.getState().moves, 1);
  game.input('key-down', { key: 'z' });
  assert.deepEqual(game.getState().order, initial);
  assert.equal(game.getState().moves, 0);
  game.input('key-down', { key: 'a' });
  assert.equal(game.getState().selectedIndex, 0);
  game.input('key-down', { key: 'a' });
  assert.equal(game.getState().selectedIndex, CHIME_ORDER.size - 1);
  game.input('key-down', { key: ' ' });
  game.input('key-down', { key: 'Escape' });
  assert.equal(game.getState().heldIndex, -1);
});

test('pointer selection can cancel and invalid input cannot move a chime', () => {
  const game = createGame({ seed: 5 });
  const initial = game.getState().order;
  game.input('primary-down', chimePoint(2));
  assert.equal(game.getState().heldIndex, 2);
  game.input('primary-down', chimePoint(2));
  assert.equal(game.getState().heldIndex, -1);
  for (const payload of [{}, { x: NaN, y: 170 }, { x: 20, y: 20 }, { x: Infinity, y: 170 }])
    game.input('primary-down', payload);
  game.input('primary-move', chimePoint(0));
  game.input('primary-up', chimePoint(1));
  game.input('key-down', { key: 'q' });
  assert.deepEqual(game.getState().order, initial);
});

test('transition locks input and opens the next seeded melody', () => {
  const game = createGame({ seed: 19 });
  const puzzles = generatePuzzles(19);
  solveOrder(game, puzzles[0].target);
  assert.equal(game.getState().phase, 'transition');
  game.input('primary-down', chimePoint(0));
  assert.equal(game.getState().heldIndex, -1);
  game.update(0.8);
  assert.equal(game.getState().phase, 'play');
  assert.deepEqual(game.getState().order, puzzles[1].initial);
});

test('timeout clamps at 150 seconds, keeps completed melodies and destroy stays silent', () => {
  const results = [];
  const game = createGame({ seed: 12, onFinish: (result) => results.push(result) });
  solveOrder(game, generatePuzzles(12)[0].target);
  game.update(0.8);
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  game.update(999);
  assert.deepEqual(results, [{ score: 400, elapsed: 150, won: false, rounds: 1 }]);
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
  state.order[0] = 99;
  state.target[0] = 99;
  assert.notEqual(game.getState().order[0], 99);
  assert.notEqual(game.getState().target[0], 99);

  const good = { score: 800, elapsed: 150, won: false, rounds: 2 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 400 },
    { ...good, score: 850 },
    { ...good, rounds: 3 },
    { ...good, won: true },
    { ...good, elapsed: 149 },
    { score: 1200, elapsed: 151, won: true, rounds: 3 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'drop' }), good);
});
