import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACORN_SHUFFLE,
  createGame,
  finalSlot,
  generateRounds,
  slotFromPoint,
  swapCount,
  swapDuration,
  validPoint,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function advanceToChoice(game, index) {
  const rounds = generateRounds(42);
  game.update(
    ACORN_SHUFFLE.revealTime +
      rounds[index].swaps.length * swapDuration(index) +
      (index === 0 ? 0.001 : 0),
  );
  assert.equal(game.getState().phase, 'choose');
}

function complete(game, rounds, input = 'key-down') {
  for (const round of rounds) {
    game.update(ACORN_SHUFFLE.revealTime + round.swaps.length * swapDuration(round.index) + 0.001);
    assert.equal(game.getState().phase, 'choose');
    if (input === 'primary-down') {
      game.input(input, { x: [150, 300, 450][round.finalSlot], y: 270 });
    } else {
      game.input(input, { key: String(round.finalSlot + 1), repeat: false });
    }
    if (!game.getState().finished) game.update(ACORN_SHUFFLE.feedbackTime + 0.001);
  }
}

test('seeded rounds are deterministic, varied and keep valid swap paths', () => {
  const signatures = new Set();
  const answers = new Set();
  for (let seed = 0; seed < 240; seed++) {
    const rounds = generateRounds(seed);
    assert.deepEqual(rounds, generateRounds(seed));
    assert.equal(rounds.length, ACORN_SHUFFLE.total);
    for (const round of rounds) {
      assert.equal(round.swaps.length, swapCount(round.index));
      assert.equal(round.finalSlot, finalSlot(round.targetSlot, round.swaps));
      assert.ok(round.swaps.every(([a, b]) => a >= 0 && b <= 2 && a !== b));
      assert.ok(
        round.swaps.every(
          (pair, index) => index === 0 || pair.join('') !== round.swaps[index - 1].join(''),
        ),
      );
      answers.add(round.finalSlot);
    }
    signatures.add(
      rounds.map(({ targetSlot, finalSlot: answer }) => `${targetSlot}${answer}`).join(''),
    );
  }
  assert.ok(signatures.size > 230);
  assert.deepEqual([...answers].sort(), [0, 1, 2]);
  assert.notDeepEqual(generateRounds(42), generateRounds(43));
});

test('rounds gain swaps and speed up without becoming unreadable', () => {
  assert.equal(swapCount(0), 3);
  assert.equal(swapCount(11), 6);
  assert.equal(swapDuration(0), 0.5);
  assert.ok(swapDuration(11) < swapDuration(0));
  assert.ok(swapDuration(11) >= 0.27);
});

test('keyboard selection, confirmation and number keys complete a run once', () => {
  const first = createGame({ seed: 42 });
  advanceToChoice(first, 0);
  first.input('key-down', { key: 'ArrowLeft', repeat: false });
  assert.equal(first.getState().selection, 0);
  first.input('key-down', { key: 'd', repeat: false });
  assert.equal(first.getState().selection, 1);
  first.input('key-down', { key: 'Enter', repeat: false });
  assert.equal(first.getState().attempts, 1);

  for (const key of ['Digit1', 'numpad2', '3']) {
    const keyed = createGame({ seed: 42 });
    advanceToChoice(keyed, 0);
    keyed.input('key-down', { key, repeat: false });
    assert.equal(keyed.getState().attempts, 1, key);
  }

  const results = [];
  const game = createGame({ seed: 17, onFinish: (result) => results.push(result) });
  const rounds = generateRounds(17);
  complete(game, rounds);
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 1200,
    elapsed: game.getState().elapsed,
    won: true,
    progress: 12,
    attempts: 12,
    lives: 3,
  });
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  game.input('key-down', { key: '1' });
  game.update(999);
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('pointer input can follow all twelve shuffled baskets', () => {
  const results = [];
  const game = createGame({ seed: 73, onFinish: (result) => results.push(result) });
  complete(game, generateRounds(73), 'primary-down');
  assert.equal(results[0].score, 1200);
  assert.equal(results[0].won, true);
  assert.deepEqual(rules.validate(results[0]), []);
});

test('wrong choices and unanswered rounds spend leaves and end safely', () => {
  const results = [];
  const game = createGame({ seed: 9, onFinish: (result) => results.push(result) });
  const rounds = generateRounds(9);
  for (let index = 0; index < 3; index++) {
    const round = rounds[index];
    game.update(ACORN_SHUFFLE.revealTime + round.swaps.length * swapDuration(index) + 0.001);
    if (index === 1) game.update(ACORN_SHUFFLE.chooseTime + 0.001);
    else game.input('key-down', { key: String(((round.finalSlot + 1) % 3) + 1), repeat: false });
    if (!game.getState().finished) game.update(ACORN_SHUFFLE.feedbackTime + 0.001);
  }
  assert.equal(results.length, 1);
  assert.equal(results[0].lives, 0);
  assert.equal(results[0].attempts, 3);
  assert.equal(results[0].progress, 0);
  assert.deepEqual(rules.validate(results[0]), []);
});

test('input is locked while revealing and shuffling, repeats and bad points are ignored', () => {
  const game = createGame({ seed: 42 });
  for (const input of [
    ['key-down', { key: '1', repeat: false }],
    ['primary-down', { x: 150, y: 270 }],
  ])
    game.input(...input);
  assert.equal(game.getState().attempts, 0);
  game.update(ACORN_SHUFFLE.revealTime + 0.1);
  game.input('key-down', { key: '2', repeat: false });
  assert.equal(game.getState().attempts, 0);
  game.update(generateRounds(42)[0].swaps.length * swapDuration(0));
  game.input('key-down', { key: '1', repeat: true });
  for (const point of [
    {},
    { x: NaN, y: 270 },
    { x: 59, y: 270 },
    { x: 541, y: 270 },
    { x: 150, y: 144 },
    { x: 150, y: 391 },
  ])
    game.input('primary-down', point);
  assert.equal(game.getState().attempts, 0);
  assert.equal(validPoint({ x: 60, y: 145 }), true);
  assert.equal(validPoint({ x: 540, y: 390 }), true);
  assert.equal(slotFromPoint({ x: 100, y: 270 }), 0);
  assert.equal(slotFromPoint({ x: 300, y: 270 }), 1);
  assert.equal(slotFromPoint({ x: 500, y: 270 }), 2);
});

test('invalid time is ignored, timeout is bounded and destroy stays silent', () => {
  const timed = [];
  const game = createGame({ seed: 4, onFinish: (result) => timed.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  game.update(999);
  assert.equal(timed.length, 1);
  assert.ok(timed[0].elapsed <= ACORN_SHUFFLE.limit);
  assert.equal(timed[0].won, false);
  assert.deepEqual(rules.validate(timed[0]), []);

  const destroyed = [];
  const quiet = createGame({ seed: 1, onFinish: (result) => destroyed.push(result) });
  quiet.destroy();
  quiet.update(999);
  quiet.input('key-down', { key: '1' });
  assert.equal(destroyed.length, 0);
});

test('ranked rules accept genuine results and reject forged counters', () => {
  const good = { score: 1200, elapsed: 32, won: true, progress: 12, attempts: 12, lives: 3 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1100 },
    { ...good, progress: 11 },
    { ...good, attempts: 11 },
    { ...good, lives: 2 },
    { ...good, won: false },
    { ...good, elapsed: 71 },
    { score: 100, elapsed: 3, won: false, progress: 1, attempts: 2, lives: 1 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'acorn' }), good);
});
