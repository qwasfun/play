import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOWER_OVERLAP,
  combineLayers,
  createGame,
  generateRounds,
  layerPoint,
  rotateCell,
  rotateMask,
  solutionsFor,
} from '../src/index.js';
import { rules } from '../src/rules.js';

const clickLayer = (game, layer) => {
  const point = layerPoint(layer);
  game.input('primary-down', point);
  game.input('primary-up', point);
};

const solveRound = (game) => {
  const state = game.getState();
  state.puzzle.solution.forEach((goal, layer) => {
    const turns = (goal - state.rotations[layer] + 4) % 4;
    for (let turn = 0; turn < turns; turn++) clickLayer(game, layer);
  });
};

test('cell and mask rotation are clockwise, reversible, and bounds checked', () => {
  assert.equal(rotateCell(0, 1), 3);
  assert.equal(rotateCell(3, 1), 15);
  assert.equal(rotateCell(15, 2), 0);
  assert.equal(rotateCell(5, -1), 9);
  assert.deepEqual(rotateMask([0, 1, 4, 8], 4), [0, 1, 4, 8]);
  assert.throws(() => rotateCell(16), /超出/);
});

test('seeded rounds are deterministic and every target has exactly one solution', () => {
  assert.deepEqual(generateRounds('same'), generateRounds('same'));
  assert.notDeepEqual(generateRounds('same'), generateRounds('different'));
  const rounds = generateRounds('unique');
  assert.equal(rounds.length, FLOWER_OVERLAP.rounds);
  rounds.forEach((round) => {
    assert.deepEqual(solutionsFor(round.masks, round.target), [round.solution]);
    assert.notDeepEqual(combineLayers(round.masks, round.initial), round.target);
  });
});

test('pointer rotates only on a complete press and release inside one card', () => {
  const game = createGame({ seed: 'pointer' });
  const before = game.getState().rotations;
  game.input('primary-down', layerPoint(0));
  game.input('primary-cancel');
  game.input('primary-up', layerPoint(0));
  assert.deepEqual(game.getState().rotations, before);
  game.input('primary-down', layerPoint(0));
  game.input('primary-up', layerPoint(1));
  assert.deepEqual(game.getState().rotations, before);
  clickLayer(game, 2);
  assert.equal(game.getState().rotations[2], (before[2] + 1) % 4);
});

test('keyboard selects a layer, rotates it, and supports undo', () => {
  const game = createGame({ seed: 'keyboard' });
  const before = game.getState().rotations;
  game.input('key-down', { key: 'ArrowRight' });
  assert.equal(game.getState().selectedLayer, 1);
  game.input('key-down', { key: 'Enter' });
  assert.equal(game.getState().rotations[1], (before[1] + 1) % 4);
  game.input('key-down', { key: 'z' });
  assert.deepEqual(game.getState().rotations, before);
  assert.match(game.getState().hint, /撤销/);
});

test('four unique mosaics finish at 1200 through real layer input', () => {
  const results = [];
  const game = createGame({ seed: 'complete', onFinish: (result) => results.push(result) });
  for (let round = 0; round < FLOWER_OVERLAP.rounds; round++) {
    solveRound(game);
    if (round < FLOWER_OVERLAP.rounds - 1) game.update(FLOWER_OVERLAP.transition + 0.01);
  }
  assert.equal(results.length, 1);
  assert.equal(results[0].score, 1200);
  assert.equal(results[0].rounds, 4);
  assert.equal(results[0].won, true);
  assert.ok(results[0].turns >= 4);
  assert.deepEqual(rules.validate(results[0]), []);
});

test('transition locks rotation and state snapshots cannot mutate the game', () => {
  const game = createGame({ seed: 'transition' });
  const state = game.getState();
  state.rotations[0] = 99;
  state.puzzle.masks[0].push(99);
  assert.notEqual(game.getState().rotations[0], 99);
  assert.ok(!game.getState().puzzle.masks[0].includes(99));
  solveRound(game);
  const locked = game.getState().rotations;
  clickLayer(game, 0);
  game.input('key-down', { key: 'Space' });
  assert.deepEqual(game.getState().rotations, locked);
});

test('invalid time is ignored, timeout is bounded, and destroy stays silent', () => {
  const timed = [];
  const game = createGame({ seed: 'timeout', onFinish: (result) => timed.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  game.update(999);
  assert.equal(timed.length, 1);
  assert.deepEqual(timed[0], {
    score: 0,
    elapsed: FLOWER_OVERLAP.limit,
    won: false,
    rounds: 0,
    turns: 0,
  });
  assert.deepEqual(rules.validate(timed[0]), []);

  const destroyed = [];
  const quiet = createGame({ seed: 'quiet', onFinish: (result) => destroyed.push(result) });
  quiet.destroy();
  quiet.update(999);
  clickLayer(quiet, 0);
  assert.equal(destroyed.length, 0);
});

test('ranked rules accept genuine results and reject forged score or counters', () => {
  const good = { score: 1200, elapsed: 33, won: true, rounds: 4, turns: 15 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 900 },
    { ...good, rounds: 3 },
    { ...good, turns: 3 },
    { ...good, won: false },
    { ...good, score: 1500 },
    { score: 300, elapsed: 20, won: false, rounds: 1, turns: 1 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'petal' }), good);
});
