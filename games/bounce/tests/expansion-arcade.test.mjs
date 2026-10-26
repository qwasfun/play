import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame as createBounce, createBounceState, stepBounce, applyBounceInput } from '../src/index.js';

function advance(game, seconds) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) game.update(1 / 60);
}

test('bounce seeds reproduce brick decoration and all three launch velocities', () => {
  const a = createBounceState('seeded');
  assert.deepEqual(a, createBounceState('seeded'));
  assert.notDeepEqual(a.launches, createBounceState('other').launches);
  assert.equal(a.bricks.length, 24);
  assert.ok(a.launches.every(launch => Math.abs(Math.hypot(launch.vx, launch.vy) - 270) < 1e-8));
});

test('bounce paddle responds only to drag/keyboard and cancellation clears both', () => {
  const game = createBounce({ seed: 'paddle-input' });
  game.input('primary-move', { x: 500 }); assert.equal(game.getState().paddle.x, 300);
  game.input('primary-down', { x: 500 }); game.input('primary-move', { x: 90 });
  assert.equal(game.getState().paddle.x, 90);
  game.input('primary-up'); game.input('key-down', { key: 'ArrowRight' }); advance(game, 0.1);
  assert.ok(game.getState().paddle.x > 90);
  game.input('primary-cancel'); const position = game.getState().paddle.x; advance(game, 0.1);
  assert.equal(game.getState().paddle.x, position);
  game.input('primary-down', { x: -100 }); assert.equal(game.getState().paddle.x, 78);
  game.input('primary-move', { x: 999 }); assert.equal(game.getState().paddle.x, 522);
});

test('bounce reflects from walls, paddle and bricks without tunnelling', () => {
  const state = createBounceState('physics'); state.phase = 'playing';
  state.ball = { x: 31, y: 280, vx: -300, vy: 0, radius: 8 };
  stepBounce(state, 1 / 60); assert.ok(state.ball.vx > 0); assert.ok(state.ball.x >= 30);
  state.ball = { x: 300, y: 414, vx: 60, vy: 270, radius: 8 };
  stepBounce(state, 1 / 30); assert.ok(state.ball.vy < 0); assert.ok(state.ball.y < 426);
  const brick = state.bricks[18];
  state.ball = { x: brick.x + 38, y: brick.y + brick.height + 12, vx: 0, vy: -345, radius: 8 };
  stepBounce(state, 1 / 30);
  assert.equal(brick.alive, false); assert.equal(state.score, 10); assert.equal(state.remaining, 23);
  assert.ok(state.ball.vy > 0);
});

test('bounce falling out loses only one life, serves again, and settles on the third miss', () => {
  const state = createBounceState('three-misses');
  for (let lives = 3; lives > 0; lives--) {
    state.phase = 'playing'; state.ball = { x: 40, y: 486, vx: 0, vy: 270, radius: 8 };
    const result = stepBounce(state, 0.1);
    assert.equal(state.lives, lives - 1);
    if (lives > 1) { assert.equal(result, null); assert.equal(state.phase, 'serve'); }
    else { assert.equal(result.reason, 'lives'); assert.equal(result.won, false); }
  }
  assert.equal(stepBounce(state, 0.1), null); assert.equal(state.lives, 0);
});

test('bounce countdown is controlled by update and launches from the chosen paddle position', () => {
  const state = createBounceState('serve');
  applyBounceInput(state, 'primary-down', { x: 410 });
  stepBounce(state, 1); assert.equal(state.phase, 'serve'); assert.equal(state.ball.x, 410);
  stepBounce(state, 0.21); assert.equal(state.phase, 'playing');
  assert.equal(state.ball.vx, state.launches[0].vx); assert.equal(state.ball.vy, state.launches[0].vy);
});

test('bounce clearing last brick awards ten once and does not emit another completion', () => {
  const state = createBounceState('last-brick');
  for (let i = 0; i < 23; i++) state.bricks[i].alive = false;
  state.score = 230; state.remaining = 1; state.phase = 'playing';
  const brick = state.bricks[23];
  state.ball = { x: brick.x + 38, y: brick.y + brick.height + 10, vx: 0, vy: -300, radius: 8 };
  const final = stepBounce(state, 1 / 60);
  assert.equal(final.won, true); assert.equal(final.reason, 'clear'); assert.equal(final.score, 240);
  assert.equal(stepBounce(state, 1), null); assert.equal(state.score, 240);
});

test('bounce a controlled paddle can clear all twenty-four bricks within the round', () => {
  const state = createBounceState('serve'); let final;
  for (let frame = 0; frame < 7202 && !final; frame++) {
    if (state.phase === 'playing' && state.ball.vy > 0) {
      const nearest = state.bricks.filter(brick => brick.alive).reduce((best, brick) =>
        !best || Math.abs(brick.x + 38 - state.ball.x) < Math.abs(best.x + 38 - state.ball.x) ? brick : best, null);
      const offset = nearest ? Math.max(-30, Math.min(30, (state.ball.x - nearest.x - 38) * 0.25)) : 0;
      applyBounceInput(state, 'primary-down', { x: state.ball.x + offset });
    }
    final = stepBounce(state, 1 / 60);
  }
  assert.equal(final.reason, 'clear'); assert.equal(final.score, 240);
  assert.equal(state.remaining, 0); assert.ok(final.elapsed < 120);
});

test('bounce timeout settles at 120 seconds and public callbacks fire once on ordinary play', () => {
  const state = createBounceState('timeout'); state.elapsed = 119.99;
  const final = stepBounce(state, 1 / 60);
  assert.equal(final.elapsed, 120); assert.equal(final.reason, 'time'); assert.equal(stepBounce(state, 1), null);
  let finishes = 0; const game = createBounce({ seed: 'ordinary', onFinish: () => { finishes++; } });
  advance(game, 130); assert.equal(finishes, 1); assert.equal(game.getState().done, true);
});
