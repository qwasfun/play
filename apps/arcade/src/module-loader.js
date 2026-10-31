// A failed dynamic import can be retried after a transport failure. A hung import
// cannot be cancelled by the browser, so bound the caller and ignore late results.
export function loadRouteModule(load, { signal, timeout = 12000, scope = globalThis } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false,
      retryTimer,
      deadline;
    function finish(fn, value) {
      if (settled) return;
      settled = true;
      scope.clearTimeout(retryTimer);
      scope.clearTimeout(deadline);
      signal?.removeEventListener('abort', abort);
      fn(value);
    }
    const abort = () => finish(reject, new DOMException('Navigation cancelled', 'AbortError'));
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
    deadline = scope.setTimeout(
      () =>
        finish(
          reject,
          Object.assign(Error('游戏资源：加载超时，请检查网络后重试加载'), {
            code: 'module_timeout',
          }),
        ),
      timeout,
    );
    async function attempt(number) {
      try {
        const value = await load();
        finish(resolve, value);
      } catch {
        if (settled) return;
        if (number < 2)
          retryTimer = scope.setTimeout(
            () => {
              void attempt(number + 1);
            },
            500 * 2 ** number,
          );
        else
          finish(
            reject,
            Object.assign(Error('游戏资源：加载失败，请检查网络后重试加载'), {
              code: 'module_unavailable',
            }),
          );
      }
    }
    void attempt(0);
  });
}
