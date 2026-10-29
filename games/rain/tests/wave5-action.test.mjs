import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame as createRain, generateRainSchedule, rainBlocked } from '../src/index.js';

function until(game, time, step = 1 / 60) {
  let frames = 0;
  while (!game.getState().finished && game.getState().elapsed < time - 1e-9) {
    game.update(Math.min(step, time - game.getState().elapsed));
    assert.ok(frames++ < 20000);
  }
}

test('rain has twenty-four seeded, telegraphed and keyboard-reachable drops with six suns', () => {
  const drops = generateRainSchedule(123);
  assert.equal(drops.length, 24);
  assert.deepEqual(drops, generateRainSchedule(123));
  assert.notDeepEqual(drops, generateRainSchedule(124));
  assert.equal(drops.filter((drop) => drop.type === 'sun').length, 6);
  assert.ok(drops.at(-1).crossTime < 40);
  for (let i = 0; i < drops.length; i++) {
    const drop = drops[i];
    assert.ok(drop.x >= 101 && drop.x <= 499);
    assert.ok(Math.abs(-28 + drop.speed * (drop.crossTime - drop.time) - 330) < 1e-8);
    if (i) {
      assert.ok(drop.time - drops[i - 1].time >= 1.3 - 1e-8);
      assert.ok(Math.abs(drop.x - drops[i - 1].x) / 440 < drop.crossTime - drops[i - 1].crossTime);
    }
  }
});

test('rain interception includes both umbrella edges but excludes a missed drop', () => {
  assert.equal(rainBlocked(242, 300), true);
  assert.equal(rainBlocked(358, 300), true);
  assert.equal(rainBlocked(358.01, 300), false);
});

test('rain all ordinary drags can protect the whole flower and collect six hundred points', () => {
  for (let seed = 0; seed < 20; seed++) {
    let final,
      calls = 0;
    const game = createRain({
      seed,
      onFinish: (r) => {
        final = r;
        calls++;
      },
    });
    for (const drop of generateRainSchedule(seed)) {
      until(game, drop.crossTime - 0.2);
      game.input('primary-down', { x: drop.x - 20 });
      game.input('primary-move', { x: drop.x });
      game.input('primary-up', { x: drop.x });
      until(game, drop.crossTime + 0.01);
    }
    assert.equal(final?.score, 600);
    assert.equal(final?.caught, 24);
    assert.equal(final?.handled, 24);
    assert.equal(final?.lives, 3);
    assert.equal(final?.won, true);
    game.update(200);
    game.input('primary-down', { x: 0 });
    assert.equal(calls, 1);
  }
});

test('rain normal arrow-key holds can catch every seeded drop', () => {
  for (let seed = 0; seed < 8; seed++) {
    let final;
    const game = createRain({ seed, onFinish: (r) => (final = r) });
    for (const drop of generateRainSchedule(seed)) {
      const start = game.getState(),
        distance = drop.x - start.umbrella.x,
        key = distance < 0 ? 'ArrowLeft' : 'ArrowRight';
      game.input('key-down', { key });
      game.update(Math.abs(distance) / 440);
      game.input('key-up', { key });
      until(game, drop.crossTime + 0.01);
    }
    assert.equal(final?.score, 600);
    assert.equal(final?.lives, 3);
  }
});

test('rain arrow and letter keys move consistently, key-up and cancellation stop movement', () => {
  for (const key of ['ArrowRight', 'arrowright', 'd', 'D']) {
    const game = createRain({ seed: 1 });
    game.input('key-down', { key });
    game.update(0.2);
    assert.ok(Math.abs(game.getState().umbrella.x - 388) < 1e-7, key);
    game.input('key-up', { key });
    game.update(0.1);
    assert.ok(Math.abs(game.getState().umbrella.x - 388) < 1e-7, key);
  }
  for (const key of ['ArrowLeft', 'arrowleft', 'a', 'A']) {
    const game = createRain({ seed: 1 });
    game.input('key-down', { key });
    game.update(0.2);
    assert.ok(Math.abs(game.getState().umbrella.x - 212) < 1e-7, key);
    game.input('primary-cancel');
    game.update(0.1);
    assert.ok(Math.abs(game.getState().umbrella.x - 212) < 1e-7, key);
  }
  const game = createRain({ seed: 1 });
  game.input('key-down', { key: 'ArrowRight', repeat: true });
  game.update(0.2);
  assert.equal(game.getState().umbrella.x, 300);
});

test('rain cancelled drags reject late releases and nonfinite points, with bounded movement', () => {
  const game = createRain({ seed: 123 });
  game.input('primary-move', { x: 50 });
  assert.equal(game.getState().umbrella.x, 300);
  game.input('primary-down', { x: 1000 });
  assert.equal(game.getState().umbrella.x, 536);
  game.input('primary-move', { x: NaN });
  assert.equal(game.getState().umbrella.x, 536);
  game.input('primary-cancel');
  game.input('primary-up', { x: 64 });
  assert.equal(game.getState().umbrella.x, 536);
  assert.equal(game.getState().umbrella.dragging, false);
  game.input('primary-down', { x: -1000 });
  assert.equal(game.getState().umbrella.x, 64);
});

test('rain long updates cannot tunnel past droplets, missed events resolve once at the exact failure time', () => {
  let final,
    calls = 0;
  const game = createRain({
    seed: 7,
    onFinish: (r) => {
      final = r;
      calls++;
    },
  });
  game.input('primary-down', { x: 64 });
  game.input('primary-up', { x: 64 });
  const drops = generateRainSchedule(7);
  game.update(200);
  assert.equal(final?.lives, 0);
  assert.equal(final?.reason, 'lives');
  assert.equal(final?.handled, 3);
  assert.ok(Math.abs(final.elapsed - drops[2].crossTime) < 1e-8);
  assert.equal(calls, 1);
  game.update(200);
  game.input('primary-down', { x: 200 });
  assert.equal(calls, 1);
});

test('rain movement and miss resolution are independent of update frequency, destroyed games remain silent', () => {
  const a = createRain({ seed: 32 }),
    b = createRain({ seed: 32 });
  a.input('key-down', { key: 'ArrowLeft' });
  b.input('key-down', { key: 'ArrowLeft' });
  until(a, 3, 1 / 30);
  until(b, 3, 1 / 144);
  for (const field of ['score', 'lives', 'handled', 'caught'])
    assert.equal(a.getState()[field], b.getState()[field]);
  assert.ok(Math.abs(a.getState().umbrella.x - b.getState().umbrella.x) < 1e-7);
  let calls = 0;
  const destroyed = createRain({ seed: 32, onFinish: () => calls++ });
  destroyed.destroy();
  destroyed.update(200);
  destroyed.input('primary-down', { x: 100 });
  assert.equal(calls, 0);
});
