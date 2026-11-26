import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bestMove,
  CAMELLIA_NIM,
  confirmPoint,
  createGame,
  generateGardens,
  pilePoint,
  positionValue,
  takePoint,
} from '../src/index.js';
import { rules } from '../src/rules.js';

function tap(game, point, release = point) {
  game.input('primary-down', point);
  game.input('primary-up', release);
}

function playMove(game, move, pointer = false) {
  if (pointer) {
    tap(game, pilePoint(move.pile));
    tap(game, takePoint(move.take));
    tap(game, confirmPoint());
    return;
  }
  game.input('key-down', { key: String(move.pile + 1) });
  for (let count = 1; count < move.take; count++) game.input('key-down', { key: 'ArrowUp' });
  game.input('key-down', { key: 'Space' });
}

test('seeded gardens are deterministic, varied and start as player-winning positions', () => {
  const signatures = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const gardens = generateGardens(seed);
    assert.deepEqual(gardens, generateGardens(seed));
    assert.equal(gardens.length, CAMELLIA_NIM.gardens);
    assert.equal(new Set(gardens.map((piles) => piles.join(','))).size, CAMELLIA_NIM.gardens);
    for (const piles of gardens) {
      assert.ok(piles.every((count) => Number.isInteger(count) && count >= 3 && count <= 7));
      assert.notEqual(positionValue(piles), 0);
      signatures.add(piles.join(','));
    }
  }
  assert.ok(signatures.size > 80);
  assert.notDeepEqual(generateGardens(11), generateGardens(12));
});

test('strategy finds a legal move to zero when one exists and a safe fallback otherwise', () => {
  for (let a = 0; a <= 8; a++)
    for (let b = 0; b <= 8; b++)
      for (let c = 0; c <= 8; c++) {
        const piles = [a, b, c];
        const move = bestMove(piles);
        if (!piles.some(Boolean)) {
          assert.equal(move, null);
          continue;
        }
        assert.ok(move.pile >= 0 && move.pile < 3);
        assert.ok(move.take >= 1 && move.take <= 3 && move.take <= piles[move.pile]);
        const next = [...piles];
        next[move.pile] -= move.take;
        if (positionValue(piles) !== 0) assert.equal(positionValue(next), 0);
      }
  assert.throws(() => positionValue([1, 2]), /三丛/);
  assert.throws(() => positionValue([1, -1, 2]), /非负整数/);
});

test('pointer cancellation, drag-out and unavailable choices never spend a turn', () => {
  const game = createGame({ seed: 21 });
  game.input('primary-down', pilePoint(1));
  game.input('primary-cancel');
  game.input('primary-up', pilePoint(1));
  tap(game, pilePoint(1), pilePoint(2));
  for (const point of [{}, { x: NaN, y: 200 }, { x: 20, y: 20 }]) tap(game, point);
  tap(game, takePoint(3));
  assert.equal(game.getState().turns, 0);
  assert.equal(game.getState().phase, 'player');
});

test('keyboard and pointer can play every optimal move and win all three gardens once', () => {
  for (const pointer of [false, true]) {
    const results = [];
    const game = createGame({ seed: 42, onFinish: (result) => results.push(result) });
    let guard = 0;
    while (!game.getState().finished && guard++ < 60) {
      const state = game.getState();
      if (state.phase === 'player') playMove(game, bestMove(state.piles), pointer);
      else game.update(1.5);
    }
    assert.equal(guard < 60, true);
    assert.equal(results.length, 1);
    assert.equal(results[0].score, 1200);
    assert.equal(results[0].won, true);
    assert.equal(results[0].gardens, 3);
    assert.equal(results[0].wins, 3);
    assert.ok(results[0].turns >= 3 && results[0].turns <= 36);
    assert.deepEqual(rules.validate(results[0]), []);
    const end = game.getState();
    playMove(game, { pile: 0, take: 1 }, pointer);
    game.update(999);
    assert.deepEqual(game.getState(), end);
    assert.equal(results.length, 1);
  }
});

test('hedgehog and transition phases lock input while repeat keys stay inert', () => {
  const game = createGame({ seed: 9 });
  const first = bestMove(game.getState().piles);
  playMove(game, first);
  assert.equal(game.getState().phase, 'hedgehog');
  const locked = game.getState();
  game.input('key-down', { key: 'Space', repeat: true });
  tap(game, confirmPoint());
  assert.deepEqual(game.getState(), locked);
  game.update(CAMELLIA_NIM.hedgehogDelay + 0.01);
  assert.equal(game.getState().phase, 'player');
});

test('invalid time is ignored, timeout clamps and destroy remains silent', () => {
  const results = [];
  const game = createGame({ seed: 5, onFinish: (result) => results.push(result) });
  for (const dt of [NaN, Infinity, -1, 0]) game.update(dt);
  assert.equal(game.getState().elapsed, 0);
  game.update(999);
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    score: 0,
    elapsed: CAMELLIA_NIM.limit,
    won: false,
    gardens: 0,
    wins: 0,
    turns: 0,
  });
  assert.deepEqual(rules.validate(results[0]), []);

  const quiet = [];
  const destroyed = createGame({ seed: 5, onFinish: (result) => quiet.push(result) });
  destroyed.destroy();
  destroyed.update(999);
  playMove(destroyed, { pile: 0, take: 1 });
  assert.equal(quiet.length, 0);
});

test('snapshots are isolated and rules reject forged scores or counters', () => {
  const game = createGame({ seed: 7 });
  const snapshot = game.getState();
  snapshot.piles[0] = 99;
  snapshot.course[0][0] = 99;
  assert.notEqual(game.getState().piles[0], 99);
  assert.notEqual(game.getState().course[0][0], 99);

  const good = { score: 1200, elapsed: 30, won: true, gardens: 3, wins: 3, turns: 10 };
  assert.deepEqual(rules.validate(good), []);
  for (const bad of [
    { ...good, score: 800 },
    { ...good, score: 1000 },
    { ...good, wins: 2 },
    { ...good, wins: 4 },
    { ...good, gardens: 2 },
    { ...good, turns: 37 },
    { ...good, won: false },
    { score: 400, elapsed: 20, won: false, gardens: 1, wins: 1, turns: 3 },
  ])
    assert.ok(rules.validate(bad).length, JSON.stringify(bad));
  assert.deepEqual(rules.clean({ ...good, secret: 'petal' }), good);
});
