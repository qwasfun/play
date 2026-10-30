import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubmissionQueue } from '../apps/arcade/src/leaderboard-submissions.js';

function fixture() {
  const values = new Map(),
    timers = new Map();
  let time = 1000,
    available = true,
    timerId = 0;
  const storage = {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i],
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const options = {
    storage,
    now: () => time,
    online: () => available,
    scope: {
      setTimeout(fn, ms) {
        timers.set(++timerId, { fn, ms });
        return timerId;
      },
      clearTimeout: (id) => timers.delete(id),
    },
  };
  return {
    options,
    values,
    timers,
    advance: (ms) => {
      time += ms;
    },
    offline: () => {
      available = false;
    },
    online: () => {
      available = true;
    },
  };
}
const run = { id: 'run-one', gameId: 'star', mode: 'normal', date: '', expiresAt: 100000 };
const result = { score: 10, elapsed: 10, won: false, lives: 0 };

test('failed submission survives reload and retries its original payload after Retry-After', async () => {
  const f = fixture(),
    calls = [];
  const client = {
    async submit(r, value) {
      calls.push({ r, value });
      if (calls.length === 1)
        throw Object.assign(Error('提交频率：请稍后重试'), { status: 429, retryAfter: 10 });
      return { accepted: 1, eligible: 1, rank: 1 };
    },
  };
  const first = createSubmissionQueue({ ...f.options, client });
  await first.add(run, result);
  assert.equal(f.values.size, 1);
  first.destroy();
  const restored = createSubmissionQueue({ ...f.options, client });
  const events = [];
  restored.subscribe((event) => events.push(event));
  await restored.retry();
  assert.equal(calls.length, 1);
  f.advance(10000);
  await restored.retry();
  assert.deepEqual(calls[1], calls[0]);
  assert.equal(f.values.size, 0);
  assert.equal(events.at(-1).type, 'accepted');
  restored.destroy();
});

test('offline results persist, expired and permanent failures stop retrying', async () => {
  const f = fixture();
  let calls = 0;
  const queue = createSubmissionQueue({
    ...f.options,
    client: {
      async submit() {
        calls++;
        throw Object.assign(Error('匿名身份：已失效，请重新开始'), { status: 401 });
      },
    },
  });
  f.offline();
  await queue.add(run, result);
  assert.equal(queue.count, 1);
  assert.equal(calls, 0);
  f.online();
  await queue.retry();
  assert.equal(queue.count, 0);
  assert.equal(queue.state(run.id).retryable, false);
  await queue.add({ ...run, id: 'expired', expiresAt: 900 }, result);
  assert.equal(calls, 1);
  assert.equal(queue.count, 0);
  queue.destroy();
});

test('concurrent attempts send once; a lost response replays the same run', async () => {
  const f = fixture();
  let calls = 0,
    release;
  const queue = createSubmissionQueue({
    ...f.options,
    client: {
      async submit() {
        calls++;
        if (calls === 1)
          await new Promise((resolve) => {
            release = resolve;
          });
        if (calls === 1) throw Error('response lost');
        return { accepted: 1, eligible: 1, rank: 1 };
      },
    },
  });
  const pending = queue.add(run, result);
  const repeated = queue.add(run, { ...result, score: 999 });
  release();
  await Promise.all([pending, repeated]);
  assert.equal(calls, 1);
  f.advance(2000);
  await queue.retry();
  assert.equal(queue.count, 0);
  assert.equal(calls, 2);
  queue.destroy();
});

test('unavailable storage retains in-memory retry and reports the limitation', async () => {
  const f = fixture();
  let warnings = 0;
  const queue = createSubmissionQueue({
    ...f.options,
    storage: null,
    onUnavailable: () => warnings++,
    client: {
      async submit() {
        throw Error('network');
      },
    },
  });
  await queue.add(run, result);
  assert.ok(warnings > 0);
  assert.equal(queue.count, 1);
  queue.destroy();
});
