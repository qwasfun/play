import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame as createStar, generateStarSchedule } from '../dist/games/star.js';
import { createGame as createBridge, evaluateBridge, generateIslands } from '../dist/games/bridge.js';

function advance(game, seconds) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) game.update(1 / 60);
}

test('star schedules reproduce exactly, are spaced and end inside one minute', () => {
  const a = generateStarSchedule('daily:2026-10-26');
  assert.deepEqual(a, generateStarSchedule('daily:2026-10-26'));
  assert.notDeepEqual(a, generateStarSchedule('daily:2026-10-27'));
  const times = [...new Set(a.map(e => e.time))];
  assert.ok(times.length > 30);
  assert.ok(times.every((t, i) => t < 60 && (!i || t - times[i - 1] >= 1.25)));
  for (const t of times) {
    const events = a.filter(e => e.time === t);
    assert.ok(events.some(e => e.type === 'mail'));
    assert.ok(events.length <= 2);
    if (events.length === 2) assert.notEqual(events[0].lane, events[1].lane);
  }
});

test('star lane changes ignore repeat and mail collision awards ten points', () => {
  const seed = 'first-mail';
  const game = createStar({ seed });
  const mail = generateStarSchedule(seed)[0];
  if (game.getState().lane !== mail.lane) game.input('key-down', { key: ' ' });
  const lane = game.getState().lane;
  game.input('key-down', { key: ' ', repeat: true });
  assert.equal(game.getState().lane, lane);
  advance(game, mail.time + 0.02);
  assert.equal(game.getState().score, 10);
  assert.equal(game.getState().lives, 3);
});

test('star three rocks finish once and no later updates change results', () => {
  const seed = 'rocks';
  let finishes = 0;
  const game = createStar({ seed, onFinish: () => { finishes++; } });
  for (const event of generateStarSchedule(seed)) {
    if (event.type !== 'rock') continue;
    if (game.getState().done) break;
    if (game.getState().lane !== event.lane) game.input('primary-down');
    while (game.getState().elapsed < event.time && !game.getState().done) game.update(1 / 60);
  }
  assert.equal(game.getState().lives, 0);
  assert.equal(finishes, 1);
  const state = game.getState(); advance(game, 70);
  assert.deepEqual(game.getState(), state);
  assert.equal(finishes, 1);
});

test('star readable advance schedule permits a complete sixty-second perfect run', () => {
  for (const seed of ['easy-route', 'daily:2026-10-26', 'daily:2026-10-27']) {
    let final, finishes = 0;
    const mails = generateStarSchedule(seed).filter(event => event.type === 'mail');
    const game = createStar({ seed, onFinish: result => { final = result; finishes++; } });
    let mailIndex = 0;
    for (let frame = 0; frame < 3602 && !final; frame++) {
      const state = game.getState();
      const mail = mails[mailIndex];
      if (mail && state.elapsed >= mail.time - 0.2) {
        if (state.lane !== mail.lane) game.input('primary-down');
        mailIndex++;
      }
      game.update(1 / 60);
    }
    assert.equal(final.elapsed, 60);
    assert.equal(final.reason, 'time');
    assert.equal(final.lives, 3);
    assert.equal(final.score, mails.length * 10);
    assert.equal(finishes, 1);
  }
});

test('bridge generation and endpoint boundaries are deterministic and inclusive', () => {
  assert.deepEqual(generateIslands('same'), generateIslands('same'));
  assert.notDeepEqual(generateIslands('same'), generateIslands('different'));
  const island = { gap: 150, width: 80 };
  assert.equal(evaluateBridge(149.99, island).success, false);
  assert.equal(evaluateBridge(150, island).success, true);
  assert.equal(evaluateBridge(230, island).success, true);
  assert.equal(evaluateBridge(230.01, island).success, false);
  assert.equal(evaluateBridge(190, island).points, 150);
});

test('cancelled bridge hold neither drops nor consumes a life', () => {
  const game = createBridge({ seed: 'cancel' });
  game.input('primary-down'); advance(game, 0.4);
  assert.ok(game.getState().length > 0);
  game.input('primary-cancel'); game.input('primary-up'); advance(game, 1);
  assert.equal(game.getState().length, 0);
  assert.equal(game.getState().phase, 'idle');
  assert.equal(game.getState().lives, 3);
});

test('bridge can complete twelve islands and never reads beyond final segment', () => {
  let final;
  const game = createBridge({ seed: 'perfect', onFinish: result => { final = result; } });
  for (let i = 0; i < 12; i++) {
    const target = game.getState().target;
    const center = target.gap + target.width / 2;
    game.input('primary-down');
    while (game.getState().length < center) game.update(1 / 60);
    game.input('primary-up'); advance(game, 1.4);
  }
  assert.equal(final.won, true);
  assert.equal(final.progress, 12);
  assert.equal(final.score, 1800);
  assert.equal(game.getState().lives, 3);
  advance(game, 2);
  assert.equal(game.getState().progress, 12);
});

test('bridge three misses and timeout each finish exactly once', () => {
  let finishes = 0;
  const game = createBridge({ seed: 'misses', onFinish: () => { finishes++; } });
  for (let i = 0; i < 3; i++) {
    game.input('key-down', { key: ' ' }); advance(game, 0.1);
    game.input('key-up', { key: ' ' }); advance(game, 1.4);
  }
  assert.equal(finishes, 1);
  assert.equal(game.getState().lives, 0);
  let timeout;
  const idle = createBridge({ seed: 'timeout', onFinish: result => { timeout = result; } });
  advance(idle, 121);
  assert.equal(timeout.reason, 'time');
  assert.equal(timeout.elapsed, 120);
});
