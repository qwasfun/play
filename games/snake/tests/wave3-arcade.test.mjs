import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame as createSnake, createSnakeState, generateFoodOrders, queueSnakeTurn, applySnakeInput, stepSnake } from '../src/index.js';

function advance(game, seconds) { for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) game.update(1 / 60); }

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
