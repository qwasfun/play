import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  DIRECTIONS,
  SWIPE,
  generateDeck,
  responseWindow,
  swipeDirection,
} from '../src/index.js';
import { rules } from '../src/rules.js';

const keys = {
  up: 'ArrowUp',
  right: 'ArrowRight',
  down: 'ArrowDown',
  left: 'ArrowLeft',
};
const vectors = { up: [0, -90], right: [90, 0], down: [0, 90], left: [-90, 0] };

function key(game, direction, repeat = false) {
  game.input('key-down', { key: keys[direction], repeat });
}

function swipe(game, direction, distance = 90) {
  const vector = vectors[direction];
  game.input('primary-down', { x: 300, y: 230 });
  game.input('primary-move', {
    x: 300 + (vector[0] / 90) * distance,
    y: 230 + (vector[1] / 90) * distance,
  });
  game.input('primary-up', {
    x: 300 + (vector[0] / 90) * distance,
    y: 230 + (vector[1] / 90) * distance,
  });
}

function perfect(game, seed, mixed = false) {
  const deck = generateDeck(seed);
  for (let index = 0; index < deck.length; index++) {
    game.update(0.1);
    if (mixed && index % 2) swipe(game, deck[index]);
    else key(game, deck[index]);
  }
}

test('seeded decks are deterministic, balanced, varied and avoid boundary repeats', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 400; seed++) {
    const deck = generateDeck(seed);
    assert.deepEqual(deck, generateDeck(seed));
    assert.equal(deck.length, SWIPE.total);
    assert.deepEqual(
      Object.fromEntries(
        DIRECTIONS.map((direction) => [
          direction,
          deck.filter((value) => value === direction).length,
        ]),
      ),
      { up: 5, right: 5, down: 5, left: 5 },
    );
    for (let group = 0; group < 5; group++)
      assert.equal(new Set(deck.slice(group * 4, group * 4 + 4)).size, 4);
    for (let index = 1; index < deck.length; index++) assert.notEqual(deck[index], deck[index - 1]);
    signatures.add(deck.join(','));
  }
  assert.ok(signatures.size > 100);
  assert.notDeepEqual(generateDeck(42), generateDeck(43));
  assert.equal(responseWindow(0), 1.7);
  assert.ok(responseWindow(19) >= 1.05);
});

test('swipe geometry accepts four dominant directions and rejects short or invalid strokes', () => {
  assert.equal(swipeDirection({ x: 0, y: 0 }, { x: 50, y: 5 }), 'right');
  assert.equal(swipeDirection({ x: 0, y: 0 }, { x: -50, y: 5 }), 'left');
  assert.equal(swipeDirection({ x: 0, y: 0 }, { x: 5, y: 50 }), 'down');
  assert.equal(swipeDirection({ x: 0, y: 0 }, { x: 5, y: -50 }), 'up');
  assert.equal(swipeDirection({ x: 0, y: 0 }, { x: 20, y: 10 }), null);
  assert.equal(swipeDirection({}, { x: 50, y: 0 }), null);
  assert.equal(swipeDirection({ x: 0, y: 0 }, { x: NaN, y: 0 }), null);
});

test('keyboard handles one card per press, ignores repeats and charges a wrong direction once', () => {
  const game = createGame({ seed: 42 });
  const expected = generateDeck(42)[0];
  key(game, expected, true);
  assert.equal(game.getState().handled, 0);
  const wrong = DIRECTIONS.find((direction) => direction !== expected);
  key(game, wrong);
  assert.equal(game.getState().handled, 1);
  assert.equal(game.getState().correct, 0);
  assert.equal(game.getState().lives, 3);
  key(game, generateDeck(42)[1]);
  assert.equal(game.getState().handled, 2);
  assert.equal(game.getState().correct, 1);
});

test('pointer supports drag and release while short, cancelled and invalid gestures do not submit', () => {
  const game = createGame({ seed: 42 });
  const expected = generateDeck(42)[0];
  game.input('primary-down', { x: 300, y: 230 });
  game.input('primary-up', { x: 310, y: 235 });
  assert.equal(game.getState().handled, 0);
  game.input('primary-down', { x: 300, y: 230 });
  game.input('primary-move', { x: 390, y: 230 });
  assert.ok(game.getState().stroke);
  game.input('primary-cancel');
  game.input('primary-up', { x: 390, y: 230 });
  assert.equal(game.getState().handled, 0);
  for (const point of [{}, { x: NaN, y: 20 }]) {
    game.input('primary-down', point);
    game.input('primary-up', { x: 400, y: 230 });
  }
  assert.equal(game.getState().handled, 0);
  swipe(game, expected);
  assert.equal(game.getState().handled, 1);
  assert.equal(game.getState().correct, 1);
});

test('mixed real inputs finish all twenty cards once with a valid ranked result', () => {
  const results = [];
  const game = createGame({
    seed: 42,
    onFinish: (result) => results.push(result),
  });
  perfect(game, 42, true);
  assert.equal(results.length, 1);
  assert.equal(results[0].score, 2000);
  assert.equal(results[0].won, true);
  assert.equal(results[0].correct, 20);
  assert.equal(results[0].handled, 20);
  assert.equal(results[0].lives, 4);
  assert.ok(Math.abs(results[0].elapsed - 2) < 1e-9);
  assert.deepEqual(rules.validate(results[0]), []);
  const end = game.getState();
  key(game, 'up');
  swipe(game, 'right');
  game.update(999);
  assert.deepEqual(game.getState(), end);
  assert.equal(results.length, 1);
});

test('timeouts advance deterministically and four misses end the game without a forged win', () => {
  const aResults = [];
  const bResults = [];
  const a = createGame({
    seed: 17,
    onFinish: (result) => aResults.push(result),
  });
  const b = createGame({
    seed: 17,
    onFinish: (result) => bResults.push(result),
  });
  a.update(999);
  while (!b.getState().finished) b.update(1 / 60);
  assert.equal(aResults.length, 1);
  assert.ok(Math.abs(aResults[0].elapsed - bResults[0].elapsed) < 1e-9);
  assert.equal(aResults[0].won, false);
  assert.equal(aResults[0].handled, 4);
  assert.equal(aResults[0].correct, 0);
  assert.equal(aResults[0].lives, 0);
  assert.deepEqual(rules.validate(aResults[0]), []);
});

test('invalid time is ignored and destroyed games remain silent', () => {
  const results = [];
  const game = createGame({
    seed: 42,
    onFinish: (result) => results.push(result),
  });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  game.input('primary-down', { x: 300, y: 230 });
  game.destroy();
  game.input('primary-up', { x: 400, y: 230 });
  game.input('key-down', { key: 'ArrowUp' });
  game.update(100);
  assert.equal(results.length, 0);
});

test('ranked rules reject forged score, counters, lives, win state and impossible speed', () => {
  const good = {
    score: 2000,
    elapsed: 1.6,
    won: true,
    correct: 20,
    handled: 20,
    lives: 4,
  };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 1900 },
    { ...good, score: 1950 },
    { ...good, correct: 19 },
    { ...good, handled: 19 },
    { ...good, lives: 3 },
    { ...good, won: false },
    { ...good, elapsed: 1 },
    { ...good, handled: 20.5 },
    { ...good, correct: 21 },
    { ...good, elapsed: 61 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'drop' }), good);
  assert.equal(rules.compare(good, { ...good, score: 1900 }), true);
  assert.equal(rules.stored(good), true);
});
