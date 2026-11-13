import { siteConfig } from './site-config.js';
import { RULE_VERSION } from '@playground/game-registry/core';

export class LeaderboardError extends Error {
  constructor(message, { status = 0, errors = [], retryAfter = 0, code } = {}) {
    super(message);
    Object.assign(this, { status, errors, retryAfter, code });
  }
}

export function createLeaderboardClient({
  baseUrl = siteConfig.leaderboardApi,
  fetcher = globalThis.fetch?.bind(globalThis),
  online = () => globalThis.navigator?.onLine !== false,
  timeout = 8000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const base = baseUrl.replace(/\/$/, '');
  let identityRequest = null,
    identity = null;
  async function attempt(path, { method = 'GET', body, signal } = {}) {
    if (!base) throw new LeaderboardError('休闲榜尚未开放，成绩继续保存在本机');
    if (!online())
      throw new LeaderboardError('当前离线，成绩仅保存在本机；联网后可参加新的上榜对局');
    try {
      const response = await fetcher(base + path, {
        method,
        credentials: 'include',
        cache: 'no-store',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(timeout)])
          : AbortSignal.timeout(timeout),
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      let data;
      try {
        data = await response.json();
      } catch (error) {
        if (error.name === 'TimeoutError' || signal?.aborted) throw error;
        throw new LeaderboardError('排行榜：服务响应异常，请稍后重试');
      }
      if (!response.ok) {
        if (response.status === 401) identity = null;
        const errors = Array.isArray(data.errors)
          ? data.errors.filter((x) => typeof x?.message === 'string')
          : [];
        throw new LeaderboardError(
          errors.map((x) => x.message).join('；') || '排行榜：暂时无法完成操作，请稍后重试',
          {
            status: response.status,
            errors,
            retryAfter: Math.max(
              0,
              Number(response.headers.get('Retry-After')) ||
                (Date.parse(response.headers.get('Retry-After')) - Date.now()) / 1000 ||
                0,
            ),
          },
        );
      }
      return data;
    } catch (error) {
      if (error instanceof LeaderboardError) throw error;
      if (signal?.aborted) throw error;
      if (error.name === 'TimeoutError')
        throw new LeaderboardError(
          `排行榜：${method === 'GET' ? '读取榜单' : '提交请求'}超时，请检查网络后重试`,
          { code: 'timeout' },
        );
      throw new LeaderboardError(
        method === 'GET'
          ? '排行榜：网络连接失败，请检查网络后重试'
          : '排行榜：连接暂时不可用，成绩已保存在本机，可稍后重试',
      );
    }
  }
  async function request(path, options = {}) {
    for (let tries = 0; ; tries++) {
      try {
        return await attempt(path, options);
      } catch (error) {
        if (
          options.signal?.aborted ||
          (options.method && options.method !== 'GET') ||
          tries >= 2 ||
          (error.status && ![408, 429].includes(error.status) && error.status < 500) ||
          error.retryAfter > 5 ||
          !online()
        )
          throw error;
        await sleep(Math.max(500 * 2 ** tries, 1000 * (error.retryAfter || 0)));
        options.signal?.throwIfAborted();
      }
    }
  }
  function ensureGuest() {
    if (identity) return Promise.resolve(identity);
    if (!identityRequest)
      identityRequest = request('/v1/guests', { method: 'POST', body: {} })
        .then((x) => (identity = x.player))
        .finally(() => {
          identityRequest = null;
        });
    return identityRequest;
  }
  return {
    enabled: !!base,
    ensureGuest,
    async start({ gameId, date = '', restartOf, level, campaignVersion }) {
      await ensureGuest();
      const data = await request('/v1/runs', {
        method: 'POST',
        body: {
          gameId,
          mode: level ? 'campaign' : date ? 'daily' : 'normal',
          date,
          ruleVersion: RULE_VERSION,
          ...(restartOf ? { restartOf } : {}),
          ...(level ? { level, campaignVersion } : {}),
        },
      });
      return data.run;
    },
    submit: (run, result) => request(`/v1/runs/${run.id}/result`, { method: 'POST', body: result }),
    async board({ gameId, mode, date = '', level, campaignVersion, signal }) {
      return request(
        '/v1/leaderboards?' +
          new URLSearchParams({
            gameId,
            mode,
            date,
            ruleVersion: RULE_VERSION,
            ...(mode === 'campaign' ? { level, campaignVersion } : {}),
          }),
        { signal },
      );
    },
    async me() {
      return (await request('/v1/me')).player;
    },
    async rename(nickname) {
      return (await request('/v1/me', { method: 'PATCH', body: { nickname } })).player;
    },
  };
}
