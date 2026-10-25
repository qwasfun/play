import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame as createRings, generateRings, segmentHitsRing, createRingState, applyRingInput, stepRings } from '../dist/games/rings.js';
import { createGame as createSnake, createSnakeState, generateFoodOrders, queueSnakeTurn, applySnakeInput, stepSnake } from '../dist/games/snake.js';

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

test('snake food ordering reproduces and first star is directly ahead', () => {
  assert.deepEqual(generateFoodOrders('forest'), generateFoodOrders('forest'));
  assert.notDeepEqual(generateFoodOrders('forest'), generateFoodOrders('other'));
  const a = createSnake({ seed: 'forest' }), b = createSnake({ seed: 'forest' });
  advance(a, 0.55); advance(b, 0.55);
  assert.equal(a.getState().score, 10); assert.equal(a.getState().body.length, 4);
  assert.deepEqual(a.getState(), b.getState());
  assert.equal(a.getState().body.some(cell => cell.x === a.getState().food.x && cell.y === a.getState().food.y), false);
});

test('snake refuses reverse and only commits one queued turn per movement tick', () => {
  const state = createSnakeState('turns');
  assert.equal(queueSnakeTurn(state, { x: -1, y: 0 }), false);
  assert.equal(queueSnakeTurn(state, { x: 0, y: -1 }), true);
  assert.equal(queueSnakeTurn(state, { x: -1, y: 0 }), false);
  stepSnake(state, 0.18); assert.deepEqual(state.body[0], { x: 4, y: 4 });
  assert.deepEqual(state.direction, { x: 0, y: -1 });
  assert.equal(queueSnakeTurn(state, { x: -1, y: 0 }), true);
  stepSnake(state, 0.18); assert.deepEqual(state.body[0], { x: 3, y: 4 });
});

test('snake swipe commits on release and cancelling an unfinished swipe changes no direction', () => {
  const state = createSnakeState('swipes');
  applySnakeInput(state, 'primary-down', { x: 300, y: 250 }); applySnakeInput(state, 'primary-move', { x: 300, y: 180 });
  assert.equal(state.queued, null); applySnakeInput(state, 'primary-cancel');
  applySnakeInput(state, 'primary-up', { x: 300, y: 180 }); assert.equal(state.queued, null);
  applySnakeInput(state, 'primary-down', { x: 300, y: 250 }); applySnakeInput(state, 'primary-up', { x: 300, y: 180 });
  assert.deepEqual(state.queued, { x: 0, y: -1 });
});

test('snake may enter the cell its tail vacates but colliding with an occupied body ends play', () => {
  const tail = createSnakeState('tail');
  tail.body = [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }];
  tail.direction = { x: 0, y: -1 }; tail.food = { x: 10, y: 8 };
  queueSnakeTurn(tail, { x: -1, y: 0 }); assert.equal(stepSnake(tail, 0.18), null);
  assert.deepEqual(tail.body[0], { x: 1, y: 2 }); assert.equal(tail.done, false);
  const self = createSnakeState('self');
  self.body = [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }];
  self.direction = { x: 0, y: -1 }; self.food = { x: 10, y: 8 };
  assert.equal(stepSnake(self, 0.18).reason, 'self');
});

test('snake wall, ten collected stars and timeout each settle once', () => {
  const wall = createSnakeState('wall'); wall.body = [{ x: 11, y: 3 }, { x: 10, y: 3 }, { x: 9, y: 3 }];
  assert.equal(stepSnake(wall, 0.18).reason, 'wall'); assert.equal(stepSnake(wall, 1), null);
  const full = createSnakeState('ten'); full.body = [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 1, y: 5 }]; let result;
  for (let star = 0; star < 10; star++) { full.food = { x: full.body[0].x + 1, y: 3 }; result = stepSnake(full, 0.18); }
  assert.equal(result.won, true); assert.equal(result.score, 100); assert.equal(result.reason, 'complete'); assert.equal(stepSnake(full, 1), null);
  const timed = createSnakeState('timed'); timed.elapsed = 89.99;
  assert.equal(stepSnake(timed, 0.02).reason, 'time'); assert.equal(timed.elapsed, 90);
  let finishes = 0; const game = createSnake({ seed: 'ordinary', onFinish: () => { finishes++; } });
  advance(game, 92); assert.equal(finishes, 1);
});

test('snake seeded food can all be collected using only ordinary direction input', () => {
  let final; const game = createSnake({ seed: 'forest-trail', onFinish: value => { final = value; } });
  const directions = [['ArrowRight', 1, 0], ['ArrowDown', 0, 1], ['ArrowLeft', -1, 0], ['ArrowUp', 0, -1]];
  for (let tick = 0; tick < 490 && !final; tick++) {
    const state = game.getState(), head = state.body[0];
    const blocked = new Set(state.body.slice(1, -1).map(cell => `${cell.x},${cell.y}`));
    const queue = [{ x: head.x, y: head.y, path: [] }], seen = new Set([`${head.x},${head.y}`]); let route;
    for (let index = 0; index < queue.length; index++) {
      const cell = queue[index];
      if (cell.x === state.food.x && cell.y === state.food.y) { route = cell.path; break; }
      for (const [key, dx, dy] of directions) {
        const x = cell.x + dx, y = cell.y + dy, id = `${x},${y}`;
        if (x < 0 || x >= 12 || y < 0 || y >= 10 || blocked.has(id) || seen.has(id)) continue;
        seen.add(id); queue.push({ x, y, path: [...cell.path, key] });
      }
    }
    assert.ok(route?.length, 'The seeded star should be reachable without changing game state');
    game.input('key-down', { key: route[0] }); game.update(0.18);
  }
  assert.equal(final?.won, true); assert.equal(final.score, 100); assert.ok(final.elapsed < 90);
});
