import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1 } from './helpers/d1.mjs';
import worker, { createHandler, reportScore, cleanupIfDue } from '../worker/index.js';
import { dailyGame, dailySeed } from '@playground/game-registry/core';
import { games, leaderboardPolicy } from '@playground/game-registry';
import { generateLights, toggledBoard, createGame as createLights } from '@playground/game-lights';
import { validateResult } from '@playground/game-registry/rules';

function setup(iso = '2026-10-26T12:00:00+08:00') {
  const db = createD1(),
    env = {
      DB: db,
      ALLOWED_ORIGINS: 'https://play.example.test',
      IP_HASH_SECRET: 'test-only-secret',
    },
    events = [],
    pending = [];
  const clock = { time: Date.parse(iso) };
  const handler = createHandler({
    now: () => clock.time,
    sendEvent: async (...args) => events.push(args),
  });
  function visitor() {
    let cookie = '';
    return {
      get cookie() {
        return cookie;
      },
      set cookie(value) {
        cookie = value;
      },
      async call(
        path,
        {
          method = 'GET',
          body,
          origin = 'https://play.example.test',
          ip = '203.0.113.10',
          headers = {},
        } = {},
      ) {
        const request = new Request('https://api.example.test' + path, {
          method,
          headers: {
            ...(origin ? { Origin: origin } : {}),
            ...(cookie ? { Cookie: cookie } : {}),
            'CF-Connecting-IP': ip,
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...headers,
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        const response = await handler(request, env, { waitUntil: (p) => pending.push(p) });
        const set = response.headers.get('set-cookie');
        if (set) cookie = set.split(';')[0];
        return {
          status: response.status,
          headers: response.headers,
          data: response.status === 204 ? null : await response.json(),
        };
      },
    };
  }
  async function start(v, gameId = 'star', extra = {}) {
    const r = await v.call('/v1/runs', {
      method: 'POST',
      body: { gameId, mode: 'normal', ruleVersion: 1, ...extra },
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data.run;
  }
  async function submit(v, run, result = { score: 100, elapsed: 10, won: false, lives: 0 }) {
    clock.time += Math.max(10000, Number.isFinite(result.elapsed) ? result.elapsed * 1000 : 0);
    return v.call(`/v1/runs/${run.id}/result`, { method: 'POST', body: result });
  }
  const board = (v, gameId = 'star', query = '') =>
    v.call(`/v1/leaderboards?gameId=${gameId}&mode=normal&ruleVersion=1${query}`);
  return { db, env, clock, events, pending, visitor, start, submit, board };
}
async function guest(s) {
  const v = s.visitor();
  assert.equal((await v.call('/v1/guests', { method: 'POST', body: {} })).status, 200);
  return v;
}

test('anonymous sessions are random, hashed at rest, HttpOnly Secure, persistent and replaceable after expiry', async () => {
  const s = setup(),
    v = s.visitor();
  const first = await v.call('/v1/guests', { method: 'POST', body: {} });
  assert.match(first.headers.get('set-cookie'), /HttpOnly/);
  assert.match(first.headers.get('set-cookie'), /Secure/);
  assert.match(first.headers.get('set-cookie'), /SameSite=Strict/);
  assert.match(v.cookie, /^__Host-arcade_guest=[a-f0-9]{64}$/);
  assert.notEqual(
    s.db.db.prepare('SELECT token_hash FROM sessions').get().token_hash,
    v.cookie.split('=')[1],
  );
  const reloaded = s.visitor();
  reloaded.cookie = v.cookie;
  assert.equal(
    (await reloaded.call('/v1/guests', { method: 'POST', body: {} })).data.player.id,
    first.data.player.id,
  );
  s.clock.time += 366 * 86400000;
  assert.equal((await v.call('/v1/me')).status, 401);
  const renewed = await v.call('/v1/guests', { method: 'POST', body: {} });
  assert.notEqual(renewed.data.player.id, first.data.player.id);
});
test('a fresh browser gets another player and old public scores remain', async () => {
  const s = setup(),
    a = await guest(s);
  await s.submit(a, await s.start(a));
  const b = await guest(s);
  const result = await s.board(b);
  assert.equal(result.data.total, 1);
  assert.equal(result.data.me, null);
});
test('nickname validation reports concrete fields, permits duplicates and stores text without interpreting markup', async () => {
  const s = setup(),
    a = await guest(s),
    b = await guest(s);
  for (const nickname of ['', 'a', 'a'.repeat(13), 'ab\u202e']) {
    const r = await a.call('/v1/me', { method: 'PATCH', body: { nickname } });
    assert.equal(r.status, 400);
    assert.equal(r.data.errors[0].field, 'nickname');
    assert.match(r.data.errors[0].message, /昵称/);
  }
  for (const v of [a, b])
    assert.equal(
      (await v.call('/v1/me', { method: 'PATCH', body: { nickname: '<b>同名</b>' } })).status,
      200,
    );
  assert.equal((await a.call('/v1/me')).data.player.nickname, '<b>同名</b>');
});
test('CORS and CSRF deny unknown or absent write origins and expose no session token in errors', async () => {
  const s = setup(),
    v = s.visitor();
  for (const origin of ['https://evil.example', null]) {
    const r = await v.call('/v1/guests', { method: 'POST', origin, body: {} });
    assert.equal(r.status, 403);
    assert.equal(r.headers.get('access-control-allow-origin'), null);
  }
  const preflight = await v.call('/v1/runs', { method: 'OPTIONS' });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
  const ok = await v.call('/v1/guests', { method: 'POST', body: {} });
  assert.equal(ok.headers.get('cache-control'), 'no-store');
  v.cookie = '__Host-arcade_guest=' + '0'.repeat(64);
  const invalid = await v.call('/v1/me');
  assert.equal(invalid.status, 401);
  assert.ok(!JSON.stringify(invalid.data).includes('0'.repeat(64)));
});
test('local HTTP exception is restricted to explicit local environment and loopback', async () => {
  const s = setup();
  s.env.ENVIRONMENT = 'local';
  s.env.IP_HASH_SECRET = '';
  s.env.ALLOWED_ORIGINS = 'http://127.0.0.1:4175';
  const h = createHandler({ now: () => s.clock.time });
  const request = (url) =>
    new Request(url + '/v1/guests', {
      method: 'POST',
      headers: { Origin: 'http://127.0.0.1:4175', 'Content-Type': 'application/json' },
      body: '{}',
    });
  const local = await h(request('http://127.0.0.1:8787'), s.env);
  assert.equal(local.status, 200);
  assert.match(local.headers.get('set-cookie'), /HttpOnly/);
  assert.ok(!local.headers.get('set-cookie').includes('Secure'));
  assert.equal((await h(request('https://production.example'), s.env)).status, 503);
});
test('each player keeps only their best result, ties share competition ranks, and nickname changes update the board', async () => {
  const s = setup(),
    players = await Promise.all([guest(s), guest(s), guest(s)]);
  for (const [i, v] of players.entries())
    await s.submit(v, await s.start(v), {
      score: i === 2 ? 90 : 100,
      elapsed: 10,
      won: false,
      lives: 0,
    });
  let r = await s.board(players[0]);
  assert.deepEqual(
    r.data.entries.map((x) => x.rank),
    [1, 1, 3],
  );
  await s.submit(players[0], await s.start(players[0]), {
    score: 80,
    elapsed: 5,
    won: false,
    lives: 0,
  });
  assert.equal((await s.board(players[0])).data.me.result.score, 100);
  await s.submit(players[0], await s.start(players[0]), {
    score: 100,
    elapsed: 9,
    won: false,
    lives: 0,
  });
  await players[0].call('/v1/me', { method: 'PATCH', body: { nickname: '新的昵称' } });
  r = await s.board(players[0]);
  assert.equal(r.data.total, 3);
  assert.equal(r.data.entries[0].nickname, '新的昵称');
  assert.equal(r.data.me.result.elapsed, 9);
});
function lightsResult(seed, extra = '', elapsed = 10) {
  const proof =
    extra +
    generateLights(seed)
      .solution.map((i) => i.toString(16))
      .join('');
  let result;
  const game = createLights({
    seed,
    onFinish: (value) => {
      result = value;
    },
  });
  game.update(elapsed);
  for (const action of proof) {
    if (result) break;
    if (action === 'u') game.input('undo');
    else {
      const index = parseInt(action, 16);
      const point = { x: 156 + (index % 4) * 96, y: 91 + Math.floor(index / 4) * 96 };
      game.input('primary-down', point);
      game.input('primary-up', point);
    }
  }
  game.destroy();
  assert.ok(result?.won);
  return result;
}

function undoPrefix(seed, count = 1) {
  const { board } = generateLights(seed);
  const cell = Array.from({ length: 16 }, (_, i) => i).find((i) =>
    toggledBoard(board, i).some(Boolean),
  );
  return (cell.toString(16) + 'u').repeat(count);
}

test('lights replays its seed and undo history, then ranks by steps and elapsed', async () => {
  const s = setup(),
    a = await guest(s),
    b = await guest(s);
  const unfinished = await s.start(a, 'lights');
  assert.equal(
    (await s.submit(a, unfinished, { score: 0, steps: 0, elapsed: 1, won: false, proof: '' })).data
      .eligible,
    0,
  );
  const first = await s.start(a, 'lights'),
    second = await s.start(b, 'lights');
  // Same board, with b making and undoing an extra move.
  s.db.db.prepare('UPDATE runs SET seed=? WHERE id=?').run(first.seed, second.id);
  assert.equal((await s.submit(a, first, lightsResult(first.seed, '', 20))).status, 200);
  assert.equal(
    (await s.submit(b, second, lightsResult(first.seed, undoPrefix(first.seed), 10))).status,
    200,
  );
  assert.equal((await s.board(a, 'lights')).data.me.rank, 1);
});

test('forged lights wins, missing proofs and changed counters cannot consume a run', async () => {
  const s = setup(),
    v = await guest(s),
    run = await s.start(v, 'lights');
  const good = lightsResult(run.seed);
  for (const result of [
    { score: 0, steps: 0, elapsed: 0, won: true, proof: '' },
    { score: 1, steps: 1, elapsed: 0, won: true, proof: '' },
    { ...good, proof: undefined },
    { ...good, proof: 'u' + good.proof },
    { ...good, proof: good.proof + '0' },
    { ...good, proof: 'private-invalid-value' },
    { ...good, steps: good.steps + 1, score: good.score + 1 },
  ]) {
    const rejected = await s.submit(v, run, result);
    assert.equal(rejected.status, 400);
    assert.ok(rejected.data.errors[0].field);
    assert.ok(!JSON.stringify(rejected.data).includes('private-invalid-value'));
  }
  assert.equal((await s.board(v, 'lights')).data.total, 0);
  assert.equal((await s.submit(v, run, good)).status, 200);
});

test('the eight formerly local games accept normal results without opening daily boards or changing calendar mappings', async () => {
  const calendar = {
    lantern: '2027-01-11',
    sail: '2027-01-12',
    balance: '2027-01-13',
    pebble: '2027-01-14',
    windmill: '2027-02-08',
    courier: '2027-02-09',
    weave: '2027-02-10',
    jugs: '2027-02-11',
  };
  for (const [id, date] of Object.entries(calendar)) {
    assert.equal(dailyGame(date), id, 'existing calendar mapping: ' + date);
    const s = setup(date + 'T12:00:00+08:00'),
      v = await guest(s);
    const result = { elapsed: 10, won: false, ...samples[id] };
    const accepted = await s.submit(v, await s.start(v, id), result);
    assert.equal(accepted.status, 200, id);
    assert.equal(accepted.data.eligible, 1, id);
    assert.equal((await s.board(v, id)).data.me.rank, 1, id);
    assert.equal((await s.board(v, id)).data.total, 1, id);
    const disabled = await v.call('/v1/runs', {
      method: 'POST',
      body: { gameId: id, mode: 'daily', date },
    });
    assert.equal(disabled.status, 400, id);
    assert.equal(disabled.data.errors[0].field, 'mode');
    assert.equal(disabled.data.errors[0].code, 'ranking_disabled');
    assert.equal(
      (await v.call(`/v1/leaderboards?gameId=${id}&mode=daily&date=${date}`)).status,
      200,
    );
  }
});

test('proof payloads beyond 8 KiB remain valid, while oversized traces are rejected', async () => {
  const s = setup(),
    v = await guest(s),
    run = await s.start(v, 'lights');
  const result = lightsResult(run.seed, undoPrefix(run.seed, 5000));
  assert.ok(JSON.stringify(result).length > 8192);
  const oversized = await s.submit(v, run, { ...result, proof: '0'.repeat(100001) });
  assert.equal(oversized.status, 400);
  assert.equal(oversized.data.errors[0].field, 'proof');
  assert.equal((await s.submit(v, run, result)).status, 200);
});

test('retries return the original receipt, even after expiry or with changed payload, and emit analytics once', async () => {
  const s = setup(),
    v = await guest(s),
    run = await s.start(v);
  const first = await s.submit(v, run);
  s.clock.time += 31 * 60000;
  const again = await s.submit(v, run, { score: 999999, elapsed: 0, won: true });
  assert.deepEqual(again.data, first.data);
  assert.equal((await s.board(v)).data.total, 1);
  await Promise.all(s.pending);
  assert.equal(s.events.length, 1);
});
test('simultaneous same-run submissions and competing records are atomic', async () => {
  const s = setup(),
    v = await guest(s),
    run = await s.start(v);
  s.clock.time += 10000;
  const body = { score: 100, elapsed: 10, won: false, lives: 0 };
  const receipts = await Promise.all(
    Array.from({ length: 3 }, () => v.call(`/v1/runs/${run.id}/result`, { method: 'POST', body })),
  );
  assert.deepEqual(receipts[0].data, receipts[1].data);
  await Promise.all(s.pending);
  assert.equal(s.events.length, 1);
  const runs = await Promise.all([s.start(v), s.start(v)]);
  s.clock.time += 10000;
  await Promise.all(
    runs.map((r, i) =>
      v.call(`/v1/runs/${r.id}/result`, {
        method: 'POST',
        body: { ...body, score: i ? 200 : 150 },
      }),
    ),
  );
  assert.equal((await s.board(v)).data.me.result.score, 200);
});
test('a mid-transaction failure rolls back receipt and best record and can be retried', async () => {
  const s = setup(),
    v = await guest(s),
    run = await s.start(v);
  s.db.failNextBatchAt = 1;
  assert.equal((await s.submit(v, run)).status, 503);
  assert.equal(
    s.db.db.prepare('SELECT result_json FROM runs WHERE id=?').get(run.id).result_json,
    null,
  );
  assert.equal((await s.board(v)).data.total, 0);
  assert.equal((await s.submit(v, run)).status, 200);
});
test('runs bind the player, seed and rules; restarting preserves the original puzzle', async () => {
  const s = setup(),
    a = await guest(s),
    b = await guest(s),
    run = await s.start(a);
  assert.equal((await s.submit(b, run)).status, 404);
  assert.equal((await s.start(a, 'star', { restartOf: run.id })).seed, run.seed);
  assert.equal(
    (
      await b.call('/v1/runs', {
        method: 'POST',
        body: { gameId: 'star', mode: 'normal', restartOf: run.id },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await a.call('/v1/runs', {
        method: 'POST',
        body: { gameId: 'star', mode: 'normal', ruleVersion: 2 },
      })
    ).status,
    400,
  );
  assert.equal((await s.board(a, 'star', '&ruleVersion=2')).status, 400);
});
test('daily server date and seed are authoritative; historical browsing works and new old-day runs fail', async () => {
  const s = setup(),
    v = await guest(s),
    date = '2026-10-26',
    gameId = dailyGame(date);
  const run = await s.start(v, gameId, { mode: 'daily', date });
  assert.equal(run.seed, dailySeed(date, gameId));
  assert.equal(
    (
      await v.call('/v1/runs', {
        method: 'POST',
        body: { gameId: dailyGame('2026-10-25'), mode: 'daily', date: '2026-10-25' },
      })
    ).status,
    400,
  );
  const r = await v.call(`/v1/leaderboards?gameId=${gameId}&mode=daily&date=${date}`);
  assert.equal(r.status, 200);
  const future = await v.call(`/v1/leaderboards?gameId=${gameId}&mode=daily&date=2026-10-27`);
  assert.equal(future.status, 400);
});
test('daily runs straddling midnight accept until 00:10, and late normal runs expire at 30 minutes', async () => {
  const s = setup('2026-10-26T23:59:00+08:00'),
    v = await guest(s),
    date = '2026-10-26',
    id = dailyGame(date);
  const run = await s.start(v, id, { mode: 'daily', date });
  assert.equal(run.expiresAt, Date.parse('2026-10-27T00:10:00+08:00'));
  const late = await s.start(v, id, { mode: 'daily', date });
  s.clock.time = Date.parse('2026-10-27T00:09:00+08:00');
  const sample =
    id === 'star'
      ? { score: 0, elapsed: 60, lives: 3, won: true }
      : id === 'bridge'
        ? { score: 0, progress: 0, lives: 0, elapsed: 10, won: false }
        : id === 'echo'
          ? { score: 0, rounds: 0, elapsed: 10, won: false }
          : { score: 1, steps: 1, elapsed: 10, won: false };
  assert.equal(
    (await v.call(`/v1/runs/${run.id}/result`, { method: 'POST', body: sample })).status,
    200,
  );
  s.clock.time = Date.parse('2026-10-27T00:10:00+08:00');
  assert.equal(
    (await v.call(`/v1/runs/${late.id}/result`, { method: 'POST', body: sample })).status,
    410,
  );
  const normal = await s.start(v);
  s.clock.time += 30 * 60000;
  assert.equal(
    (await v.call(`/v1/runs/${normal.id}/result`, { method: 'POST', body: {} })).status,
    410,
  );
});
test('multi-field errors are concrete and malformed results cannot consume the run', async () => {
  const s = setup(),
    v = await guest(s),
    run = await s.start(v);
  const bad = await s.submit(v, run, { score: -1, elapsed: 'private-value', won: 'yes' });
  assert.equal(bad.status, 400);
  assert.ok(bad.data.errors.length >= 3);
  assert.ok(!JSON.stringify(bad.data).includes('private-value'));
  assert.equal((await s.submit(v, run)).status, 200);
  const instant = await s.start(v);
  assert.equal(
    (
      await v.call(`/v1/runs/${instant.id}/result`, {
        method: 'POST',
        body: { score: 100, elapsed: 50, won: false, lives: 0 },
      })
    ).status,
    400,
  );
});
test('per-player and per-IP rate limits return 429 and a retry delay', async () => {
  const s = setup(),
    v = await guest(s);
  for (let i = 0; i < 10; i++) await s.start(v);
  const r = await v.call('/v1/runs', { method: 'POST', body: { gameId: 'star', mode: 'normal' } });
  assert.equal(r.status, 429);
  assert.ok(Number(r.headers.get('Retry-After')) > 0);
  s.clock.time += 60000;
  assert.ok(await s.start(v));
  const visitor = s.visitor();
  let last;
  for (let i = 0; i < 121; i++)
    last = await visitor.call('/v1/guests', { method: 'POST', body: {}, ip: '203.0.113.99' });
  assert.equal(last.status, 429);
});
test('top 100 keeps the current player rank even when outside the visible rows and isolates rule versions', async () => {
  const s = setup(),
    v = await guest(s),
    p = (await v.call('/v1/me')).data.player;
  for (let i = 0; i < 102; i++) {
    const id = i === 101 ? p.id : 'p' + i;
    s.db.db
      .prepare('INSERT OR IGNORE INTO players VALUES(?,?,?)')
      .run(id, '玩家' + i, s.clock.time);
    s.db.db
      .prepare('INSERT INTO best_entries VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(
        'star',
        'normal',
        '',
        1,
        id,
        'r' + i,
        500 - i,
        10000,
        null,
        null,
        0,
        -(500 - i),
        s.clock.time + i,
      );
  }
  s.db.db
    .prepare('INSERT INTO best_entries VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run('star', 'normal', '', 2, p.id, 'future', 999, 1000, null, null, 0, -999, s.clock.time);
  const r = await s.board(v);
  assert.equal(r.data.entries.length, 100);
  assert.equal(r.data.total, 102);
  assert.equal(r.data.me.rank, 102);
});

const samples = {
  windmill: { score: 50, hits: 1, lives: 0 },
  courier: { score: 100, handled: 1, lives: 0 },
  weave: { score: 500, steps: 12, won: true },
  jugs: { score: 100, rounds: 1, steps: 6 },
  lantern: { score: 25, lives: 0, handled: 3, hits: 1 },
  sail: { score: 30, lives: 0, handled: 4, passed: 1 },
  balance: { score: 100, rounds: 1 },
  pebble: { score: 20, rounds: 0, cleared: 2 },
  star: { score: 10, lives: 0 },
  bridge: { score: 100, progress: 1, lives: 0 },
  lights: { score: 8, steps: 8, won: true },
  echo: { score: 2, rounds: 2 },
  catch: { score: 20, lives: 0 },
  bounce: { score: 20, lives: 0 },
  pairs: { score: 684, steps: 12, won: true },
  merge: { score: 760, won: true },
  rings: { score: 100, progress: 1, lives: 0 },
  snake: { score: 10, stars: 1 },
  boxes: { score: 420, steps: 10, won: true },
  pipes: { score: 400, steps: 10, won: true },
  jump: { score: 100, passed: 1, lives: 0 },
  bubbles: { score: 100, cleared: 2, round: 1 },
  slide: { score: 450, steps: 10, won: true },
  rhythm: { score: 150, hits: 2, perfects: 1, combo: 2, lives: 0 },
  constellation: { score: 700, steps: 20, won: true },
  tower: { score: 150, level: 1, lives: 0 },
  rain: { score: 40, caught: 1, handled: 4, lives: 0 },
  mines: { score: 470, opened: 13, won: true },
};
for (const game of games)
  test(`${game.id}: valid representative result reaches the board and invalid game metrics are rejected`, async () => {
    const s = setup(),
      v = await guest(s);
    let result;
    if (samples[game.id]) result = { score: 0, elapsed: 10, won: false, ...samples[game.id] };
    else {
      // Future game packages own their result schema; obtain a genuine timeout result.
      const { createGame } = await import(`@playground/game-${game.id}`);
      const instance = createGame({
        seed: 42,
        onFinish: (value) => {
          result = value;
        },
      });
      for (let tick = 0; tick <= Math.ceil(game.limit * 60) + 1 && !result; tick++)
        instance.update(1 / 60);
      instance.destroy?.();
      assert.ok(result, game.id + ' must settle a real run');
    }
    assert.deepEqual(validateResult(game.id, result), []);
    if (leaderboardPolicy(game.id).normal) {
      const run = await s.start(v, game.id);
      if (game.id === 'lights') result = lightsResult(run.seed);
      assert.equal((await s.submit(v, run, result)).status, 200);
      assert.equal((await s.board(v, game.id)).data.total, 1);
    }
    assert.ok(validateResult(game.id, { ...result, score: 1000000000 }).length);
  });

test('actual untouched games finish with results accepted by the shared validation', async () => {
  for (const game of games) {
    const module = await import(`@playground/game-${game.id}`);
    let result;
    const instance = module.createGame({
      seed: 123,
      onFinish: (r) => {
        result = r;
      },
    });
    for (let i = 0; i <= Math.ceil(game.limit * 60) + 1 && !result; i++) instance.update(1 / 60);
    assert.ok(result, game.id + ' should finish');
    assert.deepEqual(validateResult(game.id, result), [], game.id);
    instance.destroy?.();
  }
});
test('invalid body format and oversize requests have specific repair instructions', async () => {
  const s = setup(),
    v = await guest(s);
  const handler = createHandler({ now: () => s.clock.time });
  const request = (content, type = 'application/json') =>
    new Request('https://api.example.test/v1/runs', {
      method: 'POST',
      headers: { Origin: 'https://play.example.test', Cookie: v.cookie, 'Content-Type': type },
      body: content,
    });
  for (const [content, type, status] of [
    ['bad json', 'application/json', 400],
    ['{}', 'text/plain', 415],
    ['x'.repeat(8193), 'application/json', 413],
  ]) {
    const r = await handler(request(content, type), s.env);
    assert.equal(r.status, status);
    assert.equal((await r.json()).errors[0].field, 'body');
  }
});
test('scheduled retention keeps best records while removing old receipts and expired sessions', async () => {
  const s = setup(),
    v = await guest(s);
  await s.submit(v, await s.start(v));
  s.db.db.prepare('UPDATE runs SET expires_at=1').run();
  s.db.db.prepare('UPDATE sessions SET expires_at=1').run();
  await worker.scheduled({}, s.env);
  assert.equal(s.db.db.prepare('SELECT COUNT(*) AS n FROM runs').get().n, 0);
  assert.equal(s.db.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
  assert.equal((await s.board(v)).data.total, 1);
});
test('Umami payload excludes identity and failures are swallowed', async () => {
  const original = globalThis.fetch;
  let payload, headers;
  globalThis.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    headers = options.headers;
    return Response.json({});
  };
  try {
    await reportScore(
      { UMAMI_WEBSITE_ID: 'test-site' },
      { game_id: 'star', mode: 'normal', rule_version: 1, player_id: 'private' },
      { score: 10, elapsed: 10, won: false, nickname: 'private' },
      'https://play.example.test',
    );
    assert.equal(payload.payload.name, 'score_accepted');
    assert.ok(headers['User-Agent']);
    assert.ok(!JSON.stringify(payload).includes('private'));
    globalThis.fetch = async () => {
      throw Error('provider unavailable');
    };
    await assert.doesNotReject(
      reportScore(
        { UMAMI_WEBSITE_ID: 'test-site' },
        { game_id: 'star', mode: 'normal', rule_version: 1 },
        { score: 10, elapsed: 10, won: false },
        'https://play.example.test',
      ),
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('request-triggered retention runs at most once an hour across isolates', async () => {
  const s = setup();
  const results = await Promise.all([
    cleanupIfDue(s.env, s.clock.time),
    cleanupIfDue(s.env, s.clock.time),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(await cleanupIfDue(s.env, s.clock.time + 3599999), false);
  assert.equal(await cleanupIfDue(s.env, s.clock.time + 3600000), true);
});
test('retention failure rolls back deletion and releases the lease for retry', async () => {
  const s = setup();
  await guest(s);
  s.db.db.prepare('UPDATE sessions SET expires_at=1').run();
  s.db.failNextBatchAt = 1;
  await assert.rejects(cleanupIfDue(s.env, s.clock.time));
  assert.equal(s.db.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 1);
  assert.equal(await cleanupIfDue(s.env, s.clock.time), true);
  assert.equal(s.db.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
});
test('background retention failure does not fail the user request', async () => {
  const s = setup(),
    pending = [];
  s.env.REQUEST_CLEANUP = 'true';
  s.db.failNextBatchAt = 1;
  const handler = createHandler({ now: () => s.clock.time });
  const r = await handler(new Request('https://api.example.test/healthz'), s.env, {
    waitUntil: (p) => pending.push(p),
  });
  assert.equal(r.status, 200);
  await Promise.all(pending);
  assert.equal(
    s.db.db.prepare("SELECT COUNT(*) AS n FROM rate_limits WHERE key='maintenance:cleanup'").get()
      .n,
    0,
  );
});
