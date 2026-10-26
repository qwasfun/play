import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame as createRings, generateRings, segmentHitsRing, createRingState, applyRingInput, stepRings } from '../src/index.js';

function advance(game, seconds) { for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) game.update(1 / 60); }

test('ring targets are deterministic and generated from reachable throws', () => {
  const rings = generateRings('golden-day');
  assert.deepEqual(rings, generateRings('golden-day')); assert.notDeepEqual(rings, generateRings('next-day'));
  assert.equal(rings.length, 8);
  for (const { target, solution, wind } of rings) {
    assert.ok(target.x > 240 && target.x < 490); assert.ok(target.y > 140 && target.y < 300);
    assert.ok(Math.abs(target.x - (88 + solution.vx * solution.time + wind * solution.time ** 2 / 2)) < 1e-9);
    assert.ok(Math.abs(target.y - (390 + solution.vy * solution.time + 165 * solution.time ** 2)) < 1e-9);
    assert.ok(Math.atan2(-solution.vy, solution.vx) >= 0.55 && Math.atan2(-solution.vy, solution.vx) <= 1.27);
    assert.ok(Math.hypot(solution.vx, solution.vy) >= 300 && Math.hypot(solution.vx, solution.vy) <= 490);
  }
});

test('ring hit boundary is inclusive and swept path cannot tunnel through a ring', () => {
  const target = { x: 10, y: 10, radius: 5 };
  assert.equal(segmentHitsRing({ x: 0, y: 5 }, { x: 20, y: 5 }, target), true);
  assert.equal(segmentHitsRing({ x: 0, y: 4.99 }, { x: 20, y: 4.99 }, target), false);
  assert.equal(segmentHitsRing({ x: -20, y: 10 }, { x: 40, y: 10 }, target), true);
});

test('rings accept drag velocity, cancellation never shoots, and keys adjust manual aim', () => {
  const game = createRings({ seed: 'controls' }); const initial = game.getState().aim;
  game.input('primary-down', { x: 400, y: 200 }); game.input('primary-move', { x: 340, y: 290 });
  assert.equal(game.getState().dragging, true); assert.notEqual(game.getState().aim.angle, initial.angle);
  game.input('primary-cancel'); game.input('primary-up', { x: 340, y: 290 });
  assert.equal(game.getState().phase, 'aim'); assert.equal(game.getState().ball, null);
  game.input('key-down', { key: 'ArrowLeft' }); advance(game, 0.2); game.input('key-up', { key: 'ArrowLeft' });
  const angle = game.getState().aim.angle; advance(game, 0.1); assert.equal(game.getState().aim.angle, angle);
  game.input('key-down', { key: ' ' }); assert.equal(game.getState().phase, 'flight');
});

test('all eight rings can be completed through ordinary drag input and settle once', () => {
  const seed = 'eight-rings'; let final, finishes = 0;
  const game = createRings({ seed, onFinish: result => { final = result; finishes++; } });
  for (const ring of generateRings(seed)) {
    const start = { x: 400, y: 200 }, end = { x: 400 - ring.solution.vx / 3.7, y: 200 - ring.solution.vy / 3.7 };
    game.input('primary-down', start); game.input('primary-move', end); game.input('primary-up', end);
    for (let frame = 0; frame < 220 && game.getState().phase !== 'aim' && !final; frame++) game.update(1 / 60);
  }
  assert.equal(final.won, true); assert.equal(final.score, 800); assert.equal(final.lives, 3);
  assert.equal(final.progress, 8); assert.equal(finishes, 1); advance(game, 4); assert.equal(finishes, 1);
});

test('rings misses cost a single chance and third miss ends once', () => {
  const state = createRingState('misses'); let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    state.phase = 'flight'; state.ball = { x: 620, y: 450, vx: 200, vy: 200, flightTime: 1 };
    stepRings(state, 1 / 60); assert.equal(state.lives, 2 - attempt);
    for (let i = 0; i < 45; i++) result ||= stepRings(state, 1 / 60);
  }
  assert.equal(result.reason, 'lives'); assert.equal(result.won, false); assert.equal(stepRings(state, 1), null);
});

test('rings time limit and cancelled held keys do not continue changing aim', () => {
  const state = createRingState('timeout'); applyRingInput(state, 'key-down', { key: 'ArrowUp' });
  stepRings(state, 0.1); applyRingInput(state, 'primary-cancel'); const power = state.aim.power;
  stepRings(state, 0.1); assert.equal(state.aim.power, power);
  state.elapsed = 119.99; const result = stepRings(state, 1 / 60);
  assert.equal(result.reason, 'time'); assert.equal(result.elapsed, 120); assert.equal(stepRings(state, 1), null);
});
