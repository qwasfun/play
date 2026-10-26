import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame as createCatch, generateHarvest, catchesAtRim } from '../src/index.js';

function advance(game, seconds) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) game.update(1 / 60);
}

test('orchard has a reproducible pre-generated schedule independent of player input', () => {
  const schedule = generateHarvest('orchard-day');
  assert.deepEqual(schedule, generateHarvest('orchard-day'));
  assert.notDeepEqual(schedule, generateHarvest('next-day'));
  assert.ok(schedule.length > 60);
  assert.ok(schedule.every(item => item.x >= 60 && item.x <= 540 && item.time < 57));
  const a = createCatch({ seed: 'orchard-day' }), b = createCatch({ seed: 'orchard-day' });
  for (let frame = 0; frame < 120; frame++) {
    a.input('primary-down', { x: frame % 2 ? 80 : 520 }); a.input('primary-up');
    a.update(1 / 60); b.update(1 / 60);
  }
  assert.deepEqual(a.getState().items, b.getState().items);
});

test('orchard catches each fruit once at the basket rim, and missed fruit costs no lives', () => {
  const seed = 'fruit-test', fruit = generateHarvest(seed)[0];
  const game = createCatch({ seed });
  game.input('primary-down', { x: fruit.x });
  const arrival = fruit.time + (405 + 24 - 15) / fruit.speed;
  advance(game, arrival + 0.03);
  assert.equal(game.getState().score, 10);
  assert.equal(game.getState().lives, 3);
  const state = game.getState(); advance(game, 0.2);
  assert.equal(game.getState().score, state.score);
  const miss = createCatch({ seed });
  miss.input('primary-down', { x: fruit.x < 300 ? 538 : 62 }); advance(miss, arrival + 0.03);
  assert.equal(miss.getState().score, 0);
  assert.equal(miss.getState().lives, 3);
  assert.equal(catchesAtRim({ type: 'fruit', x: 300, y: 410 }, 380, 300), true);
  assert.equal(catchesAtRim({ type: 'fruit', x: 480, y: 410 }, 380, 300), false);
});

test('orchard stone hit removes one life and three deliberate stone hits settle once', () => {
  const seed = 'stone-route'; let final, count = 0;
  const rocks = generateHarvest(seed).filter(item => item.type === 'rock').slice(0, 3);
  const game = createCatch({ seed, onFinish: value => { final = value; count++; } });
  for (const rock of rocks) {
    game.input('primary-down', { x: rock.x });
    const arrival = rock.time + (405 + 24 - 16) / rock.speed;
    while (game.getState().elapsed < arrival + 0.02 && !game.getState().done) game.update(1 / 60);
  }
  assert.equal(final.reason, 'lives');
  assert.equal(final.lives, 0); assert.equal(count, 1);
  advance(game, 60); assert.equal(count, 1);
});

test('orchard drag, keyboard and cancellation do not move without user input', () => {
  const game = createCatch({ seed: 'input' });
  game.input('primary-move', { x: 500 }); assert.equal(game.getState().basket.x, 300);
  game.input('primary-down', { x: 400 }); game.input('primary-move', { x: 510 });
  assert.equal(game.getState().basket.x, 510);
  game.input('primary-cancel'); game.input('primary-move', { x: 100 });
  assert.equal(game.getState().basket.x, 510);
  game.input('key-down', { key: 'ArrowLeft' }); advance(game, 0.2);
  const moved = game.getState().basket.x; assert.ok(moved < 510);
  game.input('primary-cancel'); advance(game, 0.2); assert.equal(game.getState().basket.x, moved);
});

test('orchard full minute can finish safely with manual input, exactly once', () => {
  const seed = 'safe-minute'; let final, finishes = 0;
  const game = createCatch({ seed, onFinish: value => { final = value; finishes++; } });
  const rocks = generateHarvest(seed).filter(item => item.type === 'rock').map(item => ({ ...item, arrival: item.time + (405 + 24 - 16) / item.speed }));
  for (let frame = 0; frame < 3602 && !final; frame++) {
    const next = rocks.find(rock => rock.arrival > game.getState().elapsed);
    if (next) game.input('primary-down', { x: next.x < 300 ? 538 : 62 });
    game.update(1 / 60);
  }
  assert.equal(final.elapsed, 60); assert.equal(final.reason, 'time'); assert.equal(final.lives, 3);
  assert.equal(finishes, 1); advance(game, 10); assert.equal(finishes, 1);
});
