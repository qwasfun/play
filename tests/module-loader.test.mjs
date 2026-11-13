import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRouteModule } from '../apps/arcade/src/module-loader.js';

function clock() {
  let id = 0;
  const timers = new Map();
  return {
    timers,
    setTimeout(fn, ms) {
      timers.set(++id, { fn, ms });
      return id;
    },
    clearTimeout(key) {
      timers.delete(key);
    },
    async fire(ms) {
      await Promise.resolve();
      const item = [...timers].find(([, item]) => item.ms === ms);
      assert.ok(item, `missing timer ${ms}`);
      timers.delete(item[0]);
      item[1].fn();
      await Promise.resolve();
    },
  };
}
test('transport failures retry twice with bounded backoff and clean timers after success', async () => {
  const scope = clock();
  let calls = 0;
  const module = { createGame() {} };
  const pending = loadRouteModule(
    async () => {
      if (++calls < 3) throw Error('connection reset');
      return module;
    },
    { scope },
  );
  await scope.fire(500);
  await scope.fire(1000);
  assert.equal(await pending, module);
  assert.equal(calls, 3);
  assert.equal(scope.timers.size, 0);
});
test('permanent failure exposes an actionable resource message after three attempts', async () => {
  const scope = clock();
  let calls = 0;
  const pending = loadRouteModule(
    async () => {
      calls++;
      throw Error('network');
    },
    { scope },
  );
  const rejected = assert.rejects(
    pending,
    (error) => error.code === 'module_unavailable' && /游戏资源.*重试加载/.test(error.message),
  );
  await scope.fire(500);
  await scope.fire(1000);
  await rejected;
  assert.equal(calls, 3);
  assert.equal(scope.timers.size, 0);
});
test('hung import times out once and a late resolution cannot resurrect the caller', async () => {
  const scope = clock();
  let resolve;
  const pending = loadRouteModule(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
    { scope },
  );
  const rejected = assert.rejects(
    pending,
    (error) => error.code === 'module_timeout' && /加载超时/.test(error.message),
  );
  await scope.fire(12000);
  await rejected;
  resolve({ createGame() {} });
  await Promise.resolve();
  assert.equal(scope.timers.size, 0);
});
test('leaving the route cancels retries and clears all caller timers', async () => {
  const scope = clock(),
    controller = new AbortController();
  let calls = 0;
  const pending = loadRouteModule(
    async () => {
      calls++;
      throw Error('network');
    },
    { scope, signal: controller.signal },
  );
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  await Promise.resolve();
  controller.abort();
  await rejected;
  assert.equal(calls, 1);
  assert.equal(scope.timers.size, 0);
});
test('already cancelled routes never invoke the loader', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(
    loadRouteModule(
      () => {
        calls++;
      },
      { signal: controller.signal },
    ),
    { name: 'AbortError' },
  );
  assert.equal(calls, 0);
});
