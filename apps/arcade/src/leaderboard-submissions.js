import { cleanResult } from '@playground/game-registry/rules';
import { byId } from '@playground/game-registry';
import { cleanLevelResult, recordPolicy } from '@playground/game-sdk/level';

const PREFIX = 'tiny-break-arcade:pending-result:v1:';
const terminal = new Set([400, 401, 403, 404, 410, 413, 415, 422]);

// Persist before sending. Replays always use the original run and payload, so a
// lost response is safe to retry against the server's idempotent receipt.
export function createSubmissionQueue({
  client,
  storage,
  scope = globalThis,
  now = () => Date.now(),
  online = () => scope.navigator?.onLine !== false,
  onUnavailable = () => {},
} = {}) {
  const pending = new Map(),
    states = new Map(),
    listeners = new Set();
  let flushing = null,
    timer,
    stopped = false;
  const emit = (event) => {
    if (event.run) states.set(event.run.id, event);
    for (const listener of listeners) listener(event);
  };
  function persist(item) {
    try {
      if (!storage) throw Error();
      storage.setItem(PREFIX + item.run.id, JSON.stringify(item));
    } catch {
      onUnavailable();
    }
  }
  function remove(item) {
    pending.delete(item.run.id);
    try {
      storage?.removeItem(PREFIX + item.run.id);
    } catch {
      onUnavailable();
    }
  }
  try {
    for (let i = 0; i < (storage?.length || 0); i++) {
      const key = storage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      try {
        const item = JSON.parse(storage.getItem(key));
        if (
          item?.version === 1 &&
          typeof item.run?.id === 'string' &&
          key === PREFIX + item.run.id &&
          byId[item.run.gameId] &&
          Number.isFinite(item.run.expiresAt) &&
          Number.isFinite(item.nextAttempt) &&
          Number.isInteger(item.attempts) &&
          item.attempts >= 0 &&
          item.result &&
          typeof item.result === 'object'
        )
          pending.set(item.run.id, item);
      } catch {
        /* A damaged entry cannot block other pending results. */
      }
    }
  } catch {
    onUnavailable();
  }
  function schedule() {
    scope.clearTimeout(timer);
    if (stopped || !pending.size || !online()) return;
    const due = Math.min(
      ...[...pending.values()].map((item) => Math.min(item.nextAttempt, item.run.expiresAt)),
    );
    timer = scope.setTimeout(
      () => {
        void flush();
      },
      Math.max(0, due - now()),
    );
  }
  function flush() {
    if (flushing) return flushing;
    flushing = (async () => {
      for (const item of [...pending.values()]) {
        if (stopped) break;
        if (now() >= item.run.expiresAt) {
          remove(item);
          emit({
            type: 'failed',
            run: item.run,
            retryable: false,
            message: '对局：提交期限已过，成绩保留在本机，请开始新对局。',
          });
          continue;
        }
        if (!online()) {
          emit({
            type: 'failed',
            run: item.run,
            retryable: true,
            message: '当前离线：成绩已保留，请联网后重试',
          });
          continue;
        }
        if (now() < item.nextAttempt) continue;
        emit({ type: 'submitting', run: item.run });
        try {
          const receipt = await client.submit(item.run, item.result);
          remove(item);
          emit({ type: 'accepted', run: item.run, receipt });
        } catch (error) {
          const retryable = !terminal.has(error.status) && now() < item.run.expiresAt;
          if (retryable) {
            item.attempts++;
            item.nextAttempt =
              now() +
              Math.max(
                1000 * (error.retryAfter || 0),
                Math.min(60000, 2000 * 2 ** Math.min(item.attempts - 1, 5)),
              );
            item.blockedUntil = now() + 1000 * (error.retryAfter || 0);
            persist(item);
          } else remove(item);
          emit({ type: 'failed', run: item.run, retryable, message: error.message });
        }
      }
    })().finally(() => {
      flushing = null;
      schedule();
    });
    return flushing;
  }
  const wake = () => {
    if (scope.document?.visibilityState !== 'hidden') void flush();
  };
  scope.addEventListener?.('online', wake);
  scope.document?.addEventListener('visibilitychange', wake);
  schedule();
  return {
    get count() {
      return pending.size;
    },
    state: (id) => states.get(id),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    add(run, result) {
      if (!pending.has(run.id) && states.get(run.id)?.type !== 'accepted') {
        const item = {
          version: 1,
          run,
          result:
            run.mode === 'campaign'
              ? {
                  ...cleanLevelResult(result, recordPolicy(run.gameId, byId[run.gameId].campaign)),
                  levelProof: result.levelProof,
                }
              : cleanResult(result, run.gameId),
          attempts: 0,
          nextAttempt: now(),
        };
        pending.set(run.id, item);
        persist(item);
        emit({ type: 'queued', run });
      }
      // Finish an existing sweep before checking newly enqueued results.
      return flush().then(() => {
        if (pending.get(run.id)?.nextAttempt <= now()) return flush();
      });
    },
    retry(id) {
      for (const item of pending.values())
        if (!id || item.run.id === id) {
          item.nextAttempt = Math.max(now(), item.blockedUntil || 0);
          persist(item);
        }
      return flush().then(() => {
        if ([...pending.values()].some((item) => item.nextAttempt <= now())) return flush();
      });
    },
    destroy() {
      stopped = true;
      scope.clearTimeout(timer);
      scope.removeEventListener?.('online', wake);
      scope.document?.removeEventListener('visibilitychange', wake);
      listeners.clear();
    },
  };
}
