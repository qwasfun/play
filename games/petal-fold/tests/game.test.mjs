import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cellPoint,
  createGame,
  foldPaper,
  generateRounds,
  initialPaper,
  PETAL_FOLD,
  unfoldPunch,
} from '../src/index.js';

const click = (game, index) => {
  const point = cellPoint(index);
  game.input('primary-down', point);
  game.input('primary-up', point);
};

test('folding preserves every original cell exactly once', () => {
  for (const operations of [
    ['left'],
    ['right'],
    ['top'],
    ['bottom'],
    ['left', 'top'],
    ['bottom', 'right'],
  ]) {
    let paper = initialPaper();
    for (const direction of operations) paper = foldPaper(paper, direction);
    assert.deepEqual(
      paper.cells.flat().sort((a, b) => a - b),
      Array.from({ length: 16 }, (_, index) => index),
    );
  }
});

test('one fold makes two mirrored holes and perpendicular folds make four', () => {
  assert.deepEqual(unfoldPunch(['left'], 0).solution, [1, 2]);
  assert.deepEqual(unfoldPunch(['right'], 0).solution, [0, 3]);
  assert.deepEqual(unfoldPunch(['top', 'left'], 0).solution, [5, 6, 9, 10]);
  assert.deepEqual(unfoldPunch(['bottom', 'right'], 0).solution, [0, 3, 12, 15]);
});

test('invalid folds and punch positions are rejected with specific errors', () => {
  assert.throws(() => foldPaper(initialPaper(3), 'left'), /偶数列/);
  assert.throws(() => foldPaper(initialPaper(), 'diagonal'), /未知折叠方向/);
  assert.throws(() => unfoldPunch(['left'], 8), /打孔位置超出/);
});

test('seeded rounds are deterministic, varied, and increase from one to two folds', () => {
  assert.deepEqual(generateRounds('same'), generateRounds('same'));
  assert.notDeepEqual(generateRounds('same'), generateRounds('different'));
  const rounds = generateRounds('shape');
  assert.equal(rounds.length, PETAL_FOLD.rounds);
  assert.deepEqual(
    rounds.map((round) => round.solution.length),
    [2, 2, 4, 4, 4, 4],
  );
});

test('pointer toggles a flower mark and can remove it', () => {
  const game = createGame({ seed: 'pointer' });
  click(game, 0);
  assert.deepEqual(game.getState().selected, [0]);
  click(game, 0);
  assert.deepEqual(game.getState().selected, []);
});

test('keyboard navigation, marking, and undo are supported', () => {
  const game = createGame({ seed: 'keyboard' });
  game.input('key-down', { key: 'ArrowRight' });
  assert.equal(game.getState().cursor, 1);
  game.input('key-down', { key: 'Enter' });
  assert.deepEqual(game.getState().selected, [1]);
  game.input('key-down', { key: 'z' });
  assert.deepEqual(game.getState().selected, []);
  assert.match(game.getState().hint, /撤销/);
});

test('six solved flower sheets finish at 1200 through real cell input', () => {
  let result;
  const game = createGame({ seed: 'complete', onFinish: (value) => (result = value) });
  for (let round = 0; round < PETAL_FOLD.rounds; round++) {
    game.getState().puzzle.solution.forEach((index) => click(game, index));
    if (round < PETAL_FOLD.rounds - 1) game.update(0.7);
  }
  assert.equal(result.score, 1200);
  assert.equal(result.rounds, 6);
  assert.equal(result.won, true);
  assert.equal(game.getState().finished, true);
});

test('time limit ends an unfinished flower sheet without invented progress', () => {
  let result;
  const game = createGame({ seed: 'timeout', onFinish: (value) => (result = value) });
  game.update(PETAL_FOLD.limit + 5);
  assert.deepEqual(result, {
    score: 0,
    elapsed: PETAL_FOLD.limit,
    won: false,
    rounds: 0,
    moves: 0,
  });
});
