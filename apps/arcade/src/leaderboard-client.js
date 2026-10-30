import { siteConfig } from './site-config.js';
import { RULE_VERSION } from '@playground/game-registry/core';

export class LeaderboardError extends Error {
  constructor(message, { status = 0, errors = [], retryAfter = 0 } = {}) {
    super(message);
    Object.assign(this, { status, errors, retryAfter });
  }
}

export function createLeaderboardClient({
  baseUrl = siteConfig.leaderboardApi,
  fetcher = globalThis.fetch?.bind(globalThis),
  online = () => globalThis.navigator?.onLine !== false,
  timeout = 2500,
} = {}) {
  const base = baseUrl.replace(/\/$/, '');
  let identityRequest = null;
  async function request(path, { method = 'GET', body } = {}) {
    if (!base) throw new LeaderboardError('休闲榜尚未开放，成绩继续保存在本机');
    if (!online())
      throw new LeaderboardError('当前离线，成绩仅保存在本机；联网后可参加新的上榜对局');
    try {
      const response = await fetcher(base + path, {
        method,
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.timeout(timeout),
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new LeaderboardError('排行榜：服务响应异常，请稍后重试');
      }
      if (!response.ok) {
        const errors = Array.isArray(data.errors)
          ? data.errors.filter((x) => typeof x?.message === 'string')
          : [];
        throw new LeaderboardError(
          errors.map((x) => x.message).join('；') || '排行榜：暂时无法完成操作，请稍后重试',
          {
            status: response.status,
            errors,
            retryAfter: Number(response.headers.get('Retry-After')) || 0,
          },
        );
      }
      return data;
    } catch (error) {
      if (error instanceof LeaderboardError) throw error;
      throw new LeaderboardError('排行榜：连接暂时不可用，成绩已保存在本机，可稍后重试');
    }
  }
  function ensureGuest() {
    if (!identityRequest)
      identityRequest = request('/v1/guests', { method: 'POST', body: {} })
        .then((x) => x.player)
        .finally(() => {
          identityRequest = null;
        });
    return identityRequest;
  }
  return {
    enabled: !!base,
    ensureGuest,
    async start({ gameId, date = '', restartOf }) {
      await ensureGuest();
      const data = await request('/v1/runs', {
        method: 'POST',
        body: {
          gameId,
          mode: date ? 'daily' : 'normal',
          date,
          ruleVersion: RULE_VERSION,
          ...(restartOf ? { restartOf } : {}),
        },
      });
      return data.run;
    },
    submit: (run, result) => request(`/v1/runs/${run.id}/result`, { method: 'POST', body: result }),
    async board({ gameId, mode, date = '' }) {
      await ensureGuest();
      return request(
        '/v1/leaderboards?' +
          new URLSearchParams({ gameId, mode, date, ruleVersion: RULE_VERSION }),
      );
    },
    async me() {
      await ensureGuest();
      return (await request('/v1/me')).player;
    },
    async rename(nickname) {
      return (await request('/v1/me', { method: 'PATCH', body: { nickname } })).player;
    },
  };
}
