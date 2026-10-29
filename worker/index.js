import { byId, gameRules } from '@playground/game-registry';
import {
  RULE_VERSION,
  beijingDate,
  dailyGame,
  dailySeed,
  validDate,
} from '@playground/game-registry/core';
import { nicknameError, validateResult, cleanResult } from '@playground/game-registry/rules';

const MINUTE = 60000,
  SESSION_AGE = 365 * 86400000,
  RUN_AGE = 30 * MINUTE;
const boardWhere = 'game_id=? AND mode=? AND challenge_date=? AND rule_version=?';
const better =
  '(c.sort_score < b.sort_score OR (c.sort_score=b.sort_score AND c.elapsed_ms < b.elapsed_ms))';
class ApiError extends Error {
  constructor(status, field, message, code = 'invalid_field', retryAfter) {
    super(message);
    Object.assign(this, { status, errors: [{ field, code, message }], retryAfter });
  }
}
const fail = (status, field, message, code) => {
  throw new ApiError(status, field, message, code);
};
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
const hex = (bytes) => [...bytes].map((x) => x.toString(16).padStart(2, '0')).join('');
async function hash(value) {
  return hex(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
  );
}
const keys = (run) => [run.game_id, run.mode, run.challenge_date, run.rule_version];
const isLocal = (request, env) =>
  env.ENVIRONMENT === 'local' &&
  ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
const cookieName = (request, env) =>
  isLocal(request, env) ? 'arcade_guest_dev' : '__Host-arcade_guest';

async function body(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    fail(415, 'body', '提交内容：请使用 JSON 格式');
  const reader = request.body?.getReader();
  let size = 0;
  const chunks = [];
  if (reader)
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) {
        await reader.cancel();
        fail(413, 'body', '提交内容：最多允许 8 KiB，请减少提交内容');
      }
      chunks.push(value);
    }
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error();
    return value;
  } catch {
    fail(400, 'body', '提交内容：请输入有效的 JSON 对象');
  }
}

function board(input, now, { starting = false } = {}) {
  const gameId = input.gameId,
    mode = input.mode,
    version = Number(input.ruleVersion ?? RULE_VERSION);
  if (!Object.hasOwn(byId, gameId)) fail(400, 'gameId', '游戏：请选择已开放的游戏');
  if (!['normal', 'daily'].includes(mode)) fail(400, 'mode', '模式：请选择普通模式或每日挑战');
  if (
    !Number.isSafeInteger(version) ||
    version < 1 ||
    (starting && version !== RULE_VERSION) ||
    version > RULE_VERSION
  )
    fail(400, 'ruleVersion', '规则版本：请更新网站后重新开始游戏');
  const date = input.date ?? '';
  if (mode === 'normal' && date !== '') fail(400, 'date', '挑战日期：普通模式不能指定日期');
  if (mode === 'daily') {
    if (!validDate(date) || date > beijingDate(now))
      fail(400, 'date', '挑战日期：请选择今天或过去的有效日期');
    if (dailyGame(date) !== gameId)
      fail(400, 'gameId', '挑战游戏与日期：请从所选日期的每日挑战入口进入');
    if (starting && date !== beijingDate(now))
      fail(400, 'date', '挑战日期：该日期已停止接收新对局，请参加今天的挑战');
  }
  return { game_id: gameId, mode, challenge_date: date, rule_version: version };
}

async function session(request, env, now) {
  const token = (request.headers.get('cookie') || '')
    .split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(cookieName(request, env) + '='))
    ?.split('=')[1];
  if (!/^[a-f0-9]{64}$/.test(token || '')) return null;
  return env.DB.prepare(
    'SELECT p.id,p.nickname,s.expires_at FROM sessions s JOIN players p ON p.id=s.player_id WHERE s.token_hash=? AND s.expires_at>?',
  )
    .bind(await hash(token), now)
    .first();
}
async function requireSession(request, env, now) {
  const player = await session(request, env, now);
  if (!player)
    fail(401, 'session', '匿名身份：已失效，请重新连接排行榜后开始新对局', 'session_expired');
  return player;
}

async function limit(env, key, max, now) {
  const window = Math.floor(now / MINUTE),
    expires = (window + 1) * MINUTE;
  const row = await env.DB.prepare(
    'INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits',
  )
    .bind(`${key}:${window}`, expires)
    .first();
  if (row.hits > max)
    throw new ApiError(
      429,
      'requests',
      '提交频率：操作过于频繁，请稍后重试',
      'rate_limited',
      Math.max(1, Math.ceil((expires - now) / 1000)),
    );
}

function entry(row) {
  if (!row) return null;
  const result = { score: row.score, elapsed: row.elapsed_ms / 1000, won: !!row.won };
  if (row.steps !== null) result.steps = row.steps;
  if (row.rounds !== null) result.rounds = row.rounds;
  return {
    playerId: row.player_id,
    nickname: row.nickname,
    rank: row.rank,
    result,
    achievedAt: row.achieved_at,
  };
}
async function leaderboard(env, selection, player) {
  const args = keys(selection);
  const cte = `WITH ranked AS (SELECT b.*,p.nickname,RANK() OVER (ORDER BY sort_score,elapsed_ms) AS rank FROM best_entries b JOIN players p ON p.id=b.player_id WHERE ${boardWhere}) `;
  const results = await env.DB.batch([
    env.DB.prepare(
      cte + 'SELECT * FROM ranked ORDER BY sort_score,elapsed_ms,achieved_at,player_id LIMIT 100',
    ).bind(...args),
    env.DB.prepare(cte + 'SELECT * FROM ranked WHERE player_id=?').bind(...args, player?.id || ''),
    env.DB.prepare(`SELECT COUNT(*) AS total FROM best_entries WHERE ${boardWhere}`).bind(...args),
  ]);
  return {
    entries: results[0].results.map(entry),
    me: entry(results[1].results[0]),
    total: results[2].results[0].total,
  };
}

async function record(env, run, value, now) {
  const result = cleanResult(value, run.game_id),
    ms = Math.round(result.elapsed * 1000),
    policy = gameRules[run.game_id].ranking,
    sort = policy.sign * result[policy.field];
  const eligible = !policy.requiresWin || result.won;
  // Every statement uses the persisted first submission, never a later retry's payload.
  // D1 batch is a transaction; concurrent submissions cannot overwrite a better record.
  const updates = await env.DB.batch([
    env.DB.prepare(
      `UPDATE runs SET result_json=?,submitted_at=?,receipt_json=json_object(
      'accepted',1,'eligible',?,'improved',CASE WHEN ? AND NOT EXISTS(
        SELECT 1 FROM best_entries WHERE ${boardWhere} AND player_id=? AND
        (sort_score<? OR (sort_score=? AND elapsed_ms<=?))
      ) THEN 1 ELSE 0 END) WHERE id=? AND result_json IS NULL`,
    ).bind(
      JSON.stringify(result),
      now,
      +eligible,
      +eligible,
      ...keys(run),
      run.player_id,
      sort,
      sort,
      ms,
      run.id,
    ),
    env.DB.prepare(
      `INSERT INTO best_entries(game_id,mode,challenge_date,rule_version,player_id,run_id,score,elapsed_ms,steps,rounds,won,sort_score,achieved_at)
      SELECT game_id,mode,challenge_date,rule_version,player_id,id,
        json_extract(result_json,'$.score'),CAST(ROUND(json_extract(result_json,'$.elapsed')*1000) AS INTEGER),
        json_extract(result_json,'$.steps'),json_extract(result_json,'$.rounds'),json_extract(result_json,'$.won'),
        ?*json_extract(result_json,?),submitted_at
      FROM runs WHERE id=? AND json_extract(receipt_json,'$.eligible')=1
      ON CONFLICT(game_id,mode,challenge_date,rule_version,player_id) DO UPDATE SET
        run_id=excluded.run_id,score=excluded.score,elapsed_ms=excluded.elapsed_ms,steps=excluded.steps,rounds=excluded.rounds,
        won=excluded.won,sort_score=excluded.sort_score,achieved_at=excluded.achieved_at
      WHERE excluded.sort_score<best_entries.sort_score OR (excluded.sort_score=best_entries.sort_score AND excluded.elapsed_ms<best_entries.elapsed_ms)`,
    ).bind(policy.sign, '$.' + policy.field, run.id),
    env.DB.prepare(
      `UPDATE runs SET receipt_json=json_set(receipt_json,'$.rank',
      CASE WHEN json_extract(receipt_json,'$.eligible')=1 THEN (
        SELECT 1+(SELECT COUNT(*) FROM best_entries c WHERE c.game_id=b.game_id AND c.mode=b.mode AND c.challenge_date=b.challenge_date AND c.rule_version=b.rule_version AND ${better})
        FROM best_entries b WHERE ${boardWhere} AND player_id=?
      ) ELSE NULL END) WHERE id=? AND json_type(receipt_json,'$.rank') IS NULL`,
    ).bind(...keys(run), run.player_id, run.id),
    env.DB.prepare('SELECT receipt_json FROM runs WHERE id=?').bind(run.id),
  ]);
  return {
    receipt: JSON.parse(updates[3].results[0].receipt_json),
    first: updates[0].meta.changes === 1,
  };
}

export async function reportScore(env, run, result, origin) {
  if (!env.UMAMI_WEBSITE_ID) return;
  try {
    const response = await fetch(env.UMAMI_SEND_URL || 'https://gateway.umami.is/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'ThreeMinutePlayground/1.0' },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: env.UMAMI_WEBSITE_ID,
          hostname: new URL(origin).hostname,
          url: `/games/${run.game_id}`,
          name: 'score_accepted',
          data: {
            game_id: run.game_id,
            mode: run.mode,
            rules_version: run.rule_version,
            score: result.score,
            elapsed: result.elapsed,
            won: result.won,
          },
        },
      }),
    });
    if (!response.ok) throw Error();
  } catch {
    console.warn('Umami score_accepted delivery failed');
  }
}

export async function cleanupIfDue(env, now = Date.now()) {
  const key = 'maintenance:cleanup',
    until = now + 60 * MINUTE;
  // A D1 lease coordinates isolates without consuming an account cron slot.
  const lease = await env.DB.prepare(
    'INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET expires_at=excluded.expires_at WHERE rate_limits.expires_at<=? RETURNING key',
  )
    .bind(key, until, now)
    .first();
  if (!lease) return false;
  try {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(now),
      env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now),
      env.DB.prepare('DELETE FROM runs WHERE expires_at<?').bind(now - 30 * 86400000),
    ]);
    return true;
  } catch (error) {
    await env.DB.prepare('DELETE FROM rate_limits WHERE key=? AND expires_at=?')
      .bind(key, until)
      .run();
    throw error;
  }
}

export function createHandler({ now = () => Date.now(), sendEvent = reportScore } = {}) {
  let nextCleanupCheck = 0;
  return async (request, env, ctx = { waitUntil: () => {} }) => {
    const origin = request.headers.get('origin'),
      allowed = (env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    let response;
    try {
      if (origin && !allowed.includes(origin))
        fail(403, 'origin', '网站来源：请从已配置的游戏网站访问排行榜', 'origin_denied');
      const url = new URL(request.url),
        path = url.pathname,
        time = now(),
        method = request.method;
      if (method === 'OPTIONS') {
        if (!origin || !allowed.includes(origin))
          fail(403, 'origin', '网站来源：未获得排行榜访问许可');
        response = new Response(null, { status: 204 });
      } else if (path === '/healthz' && method === 'GET') response = json({ ok: true });
      else {
        if (!env.DB) fail(503, 'service', '排行榜：服务尚未配置，请稍后重试');
        if (!['GET', 'POST', 'PATCH'].includes(method))
          fail(405, 'method', '请求方式：请使用此接口支持的操作');
        if (method !== 'GET') {
          if (!origin || !allowed.includes(origin))
            fail(403, 'origin', '网站来源：请从已配置的游戏网站提交');
          if (!env.IP_HASH_SECRET && !isLocal(request, env))
            fail(503, 'service', '排行榜：服务尚未完成安全配置，请稍后重试');
          const ip = request.headers.get('CF-Connecting-IP') || 'local';
          await limit(
            env,
            'ip:' + (await hash(`${env.IP_HASH_SECRET || 'local-only'}:${ip}`)),
            120,
            time,
          );
        }
        if (path === '/v1/guests' && method === 'POST') {
          let player = await session(request, env, time),
            cookie;
          if (!player) {
            const id = crypto.randomUUID(),
              token = hex(crypto.getRandomValues(new Uint8Array(32))),
              expires = time + SESSION_AGE;
            player = { id, nickname: `游客·${id.slice(0, 6)}` };
            await env.DB.batch([
              env.DB.prepare('INSERT INTO players(id,nickname,created_at) VALUES(?,?,?)').bind(
                id,
                player.nickname,
                time,
              ),
              env.DB.prepare(
                'INSERT INTO sessions(token_hash,player_id,expires_at) VALUES(?,?,?)',
              ).bind(await hash(token), id, expires),
            ]);
            cookie = `${cookieName(request, env)}=${token}; Path=/; HttpOnly; Max-Age=${SESSION_AGE / 1000}; SameSite=${isLocal(request, env) ? 'Lax' : 'Strict'}${isLocal(request, env) ? '' : '; Secure'}`;
          }
          response = json(
            { player: { id: player.id, nickname: player.nickname } },
            200,
            cookie ? { 'Set-Cookie': cookie } : {},
          );
        } else if (path === '/v1/me' && ['GET', 'PATCH'].includes(method)) {
          const player = await requireSession(request, env, time);
          if (method === 'PATCH') {
            await limit(env, 'profile:' + player.id, 10, time);
            const value = await body(request),
              message = nicknameError(value.nickname);
            if (message) fail(400, 'nickname', message);
            player.nickname = value.nickname.trim();
            await env.DB.prepare('UPDATE players SET nickname=? WHERE id=?')
              .bind(player.nickname, player.id)
              .run();
          }
          response = json({ player: { id: player.id, nickname: player.nickname } });
        } else if (path === '/v1/runs' && method === 'POST') {
          const player = await requireSession(request, env, time);
          await limit(env, 'start:' + player.id, 10, time);
          const input = await body(request),
            selection = board(input, time, { starting: true });
          let seed =
            selection.mode === 'daily'
              ? dailySeed(selection.challenge_date, selection.game_id)
              : crypto.getRandomValues(new Uint32Array(1))[0];
          if (input.restartOf && selection.mode === 'normal') {
            const previous =
              typeof input.restartOf === 'string' && input.restartOf.length === 36
                ? await env.DB.prepare(
                    'SELECT seed FROM runs WHERE id=? AND player_id=? AND game_id=? AND mode=? AND rule_version=?',
                  )
                    .bind(
                      input.restartOf,
                      player.id,
                      selection.game_id,
                      'normal',
                      selection.rule_version,
                    )
                    .first()
                : null;
            if (!previous) fail(400, 'restartOf', '重开对局：原对局已失效，请重新进入游戏');
            seed = previous.seed;
          }
          const id = crypto.randomUUID();
          const close =
            selection.mode === 'daily'
              ? Date.parse(selection.challenge_date + 'T00:00:00+08:00') + 86400000 + 10 * MINUTE
              : Infinity;
          const expiresAt = Math.min(time + RUN_AGE, close);
          await env.DB.prepare(
            'INSERT INTO runs(id,player_id,game_id,mode,challenge_date,rule_version,seed,started_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)',
          )
            .bind(id, player.id, ...keys(selection), seed, time, expiresAt)
            .run();
          response = json(
            {
              run: {
                id,
                gameId: selection.game_id,
                mode: selection.mode,
                date: selection.challenge_date,
                ruleVersion: selection.rule_version,
                seed,
                expiresAt,
              },
            },
            201,
          );
        } else if (/^\/v1\/runs\/[a-f0-9-]{36}\/result$/.test(path) && method === 'POST') {
          const player = await requireSession(request, env, time);
          await limit(env, 'submit:' + player.id, 20, time);
          const id = path.split('/')[3],
            run = await env.DB.prepare('SELECT * FROM runs WHERE id=? AND player_id=?')
              .bind(id, player.id)
              .first();
          if (!run) fail(404, 'runId', '对局：不存在或不属于当前匿名身份，请重新开始');
          if (run.receipt_json) {
            response = json(JSON.parse(run.receipt_json));
          } else {
            if (time >= run.expires_at)
              fail(
                410,
                'runId',
                '对局：提交期限已过，成绩已保存在本机，请开始新对局',
                'run_expired',
              );
            const value = await body(request),
              errors = validateResult(run.game_id, value);
            if (errors.length) {
              const error = new ApiError(400, 'score', '');
              error.errors = errors;
              throw error;
            }
            const maxScore = gameRules[run.game_id].seedCap?.(run.seed) ?? Infinity;
            if (value.score > maxScore)
              fail(400, 'score', '得分：超过本局可获得的最高分，请重新游玩后提交');
            if (value.elapsed * 1000 > time - run.started_at + 1000)
              fail(400, 'elapsed', '用时：超过对局实际经过时间，请重新游玩后提交');
            const { receipt, first } = await record(env, run, value, time);
            if (first)
              ctx.waitUntil(
                Promise.resolve()
                  .then(() => sendEvent(env, run, cleanResult(value, run.game_id), origin))
                  .catch(() => console.warn('Score analytics unavailable')),
              );
            response = json(receipt);
          }
        } else if (path === '/v1/leaderboards' && method === 'GET') {
          const selection = board(Object.fromEntries(url.searchParams), time),
            player = await session(request, env, time);
          response = json({
            ...(await leaderboard(env, selection, player)),
            gameId: selection.game_id,
            mode: selection.mode,
            date: selection.challenge_date,
            ruleVersion: selection.rule_version,
          });
        } else fail(404, 'endpoint', '接口：不存在，请更新网站后重试');
      }
    } catch (error) {
      if (error instanceof ApiError)
        response = json(
          { errors: error.errors },
          error.status,
          error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {},
        );
      else {
        console.error('Leaderboard request failed');
        response = json(
          {
            errors: [
              {
                field: 'service',
                code: 'unavailable',
                message: '排行榜：服务暂时不可用，请稍后重试',
              },
            ],
          },
          503,
        );
      }
    }
    if (
      env.REQUEST_CLEANUP === 'true' &&
      env.DB &&
      response.status < 400 &&
      request.method !== 'OPTIONS' &&
      now() >= nextCleanupCheck
    ) {
      nextCleanupCheck = now() + 5 * MINUTE;
      ctx.waitUntil(
        cleanupIfDue(env, now()).catch(() => console.warn('Leaderboard cleanup deferred')),
      );
    }
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    headers.set('Vary', 'Origin');
    headers.set('X-Content-Type-Options', 'nosniff');
    if (origin && allowed.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      headers.set('Access-Control-Expose-Headers', 'Retry-After');
    }
    return new Response(response.body, { status: response.status, headers });
  };
}

export default {
  fetch: createHandler(),
  async scheduled(_event, env) {
    await cleanupIfDue(env);
  },
};
