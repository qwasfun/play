import { campaignView } from '@playground/game-sdk/level';
import { byId } from '@playground/game-registry';
import { campaignLoaders, loaders } from '@playground/game-registry/browser';
import { campaignLink, playLink } from '@playground/game-registry/core';
import { mountGame, gameSurface } from '@playground/game-runtime';
import { campaignResultText } from './campaign-storage.js';
import { mountLeaderboard, mountSubmission } from './leaderboard-ui.js';
import { recordLevel } from '@playground/game-sdk/level-proof';
import { loadRouteModule } from './module-loader.js';
const stages = ['初见 · 从简单开始', '熟练 · 找到诀窍', '进阶 · 多想一步', '挑战 · 认真解一题'];
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export function campaignEntryLink(game) {
  return game.campaign ? campaignLink(game.id) : playLink(game.id);
}
function message(root, text, href, label = '返回选关') {
  root.innerHTML = `<div class="page-container campaign-message" id="main-content"><h1>暂时无法进入关卡</h1><p role="alert">${escape(text)}</p><a class="button primary" href="${href}">${label}</a></div>`;
}
function loadFailure(root, text, href) {
  message(root, text, href);
  const actions = document.createElement('div');
  actions.className = 'campaign-actions';
  actions.innerHTML =
    '<button class="button primary" data-retry-module>重试加载</button><button class="button secondary" data-reload-module>刷新页面</button>';
  root.querySelector('.campaign-message').append(actions);
}
function loading(root) {
  root.innerHTML =
    '<div class="page-container campaign-message" id="main-content"><p role="status">正在打开关卡…</p></div>';
}
export async function renderLevels(root, route, { store, isCurrent, client, submissions, signal }) {
  loading(root);
  let campaign;
  try {
    ({ campaign } = await loadRouteModule(campaignLoaders[route.id], { signal }));
  } catch (error) {
    if (isCurrent() && !signal?.aborted) loadFailure(root, error.message, campaignLink(route.id));
    return;
  }
  if (!isCurrent()) return;
  const game = byId[route.id],
    progress = store.progress(game.id);
  root.innerHTML = `<div class="page-container levels-page" id="main-content"><a class="back-link" href="#/">← 返回游乐场</a><div class="game-heading"><p class="eyebrow">${game.english} / CHAPTERS</p><h1>${game.title}<span class="accent-dot">.</span></h1><p>20 个固定关卡，四段递进挑战。一关一关向前。</p></div><section class="campaign-summary"><div><strong>已完成 ${progress.completed} / 20 关</strong><progress value="${progress.completed}" max="20" aria-label="已完成关卡"></progress><small>进度保存在当前浏览器；未完成的棋盘不保存。</small></div><div class="campaign-actions"><a class="button primary" href="${campaignLink(game.id, progress.unlocked)}">${progress.completed === 20 ? '重玩最后一关' : `继续闯关 · 第 ${progress.unlocked} 关`} ↗</a><a class="button secondary" href="${playLink(game.id)}">随心一局</a></div></section>${stages
    .map(
      (title, stage) =>
        `<section class="campaign-chapter"><h2>${title}</h2><div class="level-grid">${campaign.levels
          .slice(stage * 5, stage * 5 + 5)
          .map((level) => {
            const locked = level.number > progress.unlocked,
              record = progress.best[level.number],
              content = `<span class="level-number">${String(level.number).padStart(2, '0')}</span><strong>${level.title}</strong><span>${record ? '✓ 已完成' : locked ? '尚未解锁' : '可以挑战'}</span><small>${record ? campaignResultText(game.id, record) : locked ? `先完成第 ${level.number - 1} 关` : level.objective}</small>`;
            return locked
              ? `<button class="level-tile locked" disabled aria-label="第 ${level.number} 关尚未解锁，请先完成第 ${level.number - 1} 关">${content}</button>`
              : `<a class="level-tile ${record ? 'completed' : ''}" href="${campaignLink(game.id, level.number)}" aria-label="第 ${level.number} 关，${record ? '已完成' : '可以挑战'}">${content}</a>`;
          })
          .join('')}</div></section>`,
    )
    .join('')}</div>`;
  const controller = new AbortController();
  mountLeaderboard(root.querySelector('.levels-page'), {
    client,
    gameId: game.id,
    level: 1,
    signal: controller.signal,
    submissions,
  });
  return { destroy: () => controller.abort() };
}
export async function renderCampaign(
  root,
  route,
  { store, isCurrent, sound, onToast, onRecent, client, submissions, signal },
) {
  const game = byId[route.id],
    progress = store.progress(route.id);
  if (route.level > progress.unlocked) {
    message(
      root,
      `第 ${route.level} 关尚未解锁：请先通过第 ${progress.unlocked} 关。`,
      campaignLink(game.id),
    );
    return;
  }
  loading(root);
  let campaign, createGame;
  try {
    [{ campaign }, { createGame }] = await loadRouteModule(
      () => Promise.all([campaignLoaders[game.id](), loaders[game.id]()]),
      { signal },
    );
  } catch (error) {
    if (isCurrent() && !signal?.aborted) loadFailure(root, error.message, campaignLink(game.id));
    return;
  }
  if (!isCurrent()) return;
  const level = campaign.levels[route.level - 1];
  if (!level || campaign.version !== route.version) {
    message(root, '关卡版本：暂不支持此内容，请从选关页重新进入。', campaignLink(game.id));
    return;
  }
  const sessionGame = campaignView(game, level);
  root.innerHTML = `<div class="page-container game-page campaign-page" id="main-content"><div class="game-topline"><a class="back-link" href="${campaignLink(game.id)}">← 返回选关</a><span class="daily-tag">闯关 · 第 ${level.number} / 20 关</span></div><div class="game-heading"><p class="eyebrow">${game.english} / ${level.title}</p><h1>${game.title} · 第 ${level.number} 关</h1><p>${level.objective}</p></div><div class="play-layout">${gameSurface(sessionGame, { backHref: campaignLink(game.id), backLabel: '← 选关' })}<aside class="game-sidebar"><div class="side-card"><p class="eyebrow">THIS LITTLE CHALLENGE</p><h3>本关目标</h3><p>${level.objective}</p><p>${sessionGame.controls}</p><small>不限时，暂停期间不计时。${game.undo ? '撤销会保留累计步数。' : ''}</small></div><div class="side-card"><p class="eyebrow">LEVEL BEST</p><h3>本关个人最佳</h3><p id="campaign-best">${campaignResultText(game.id, progress.best[level.number])}</p><small>通关后参加本关排行榜；本机进度仍自动保存。</small></div><div class="side-card"><a class="text-button" href="${campaignLink(game.id)}">查看全部 20 关 →</a><br><a class="text-button" href="${playLink(game.id)}">随心一局 →</a></div></aside></div></div>`;
  let rankedRun, reason, submissionController;
  return mountGame({
    root,
    game: sessionGame,
    createGame: (options) => recordLevel(createGame, options),
    seed: 0,
    level,
    sound,
    onToast,
    onMount(signal) {
      signal.addEventListener('abort', () => submissionController?.abort(), { once: true });
      mountLeaderboard(root.querySelector('.game-sidebar'), {
        client,
        gameId: game.id,
        level: level.number,
        signal,
        submissions,
      });
    },
    async onBeforeStart({ overlay }) {
      rankedRun = null;
      submissionController?.abort();
      overlay.innerHTML =
        '<div class="overlay-card"><p role="status">正在连接本关排行榜…</p><small>连接不可用时会自动进入本机闯关。</small></div>';
      try {
        rankedRun = await client.start({
          gameId: game.id,
          level: level.number,
          campaignVersion: campaign.version,
        });
        reason = '';
      } catch (error) {
        reason = error.message;
      }
      return 0;
    },
    readyHtml: `<div class="overlay-card"><p class="eyebrow">第 ${level.number} / 20 关 · ${level.title}</p><h2>准备好挑战了吗？</h2><p>${level.objective}</p><button class="button primary" data-action="start">开始这一关 ↗</button><small class="ready-note">不限时 · ${sessionGame.controls}</small></div>`,
    onStarted() {
      onRecent(game.id);
    },
    onFinish(result, { overlay }) {
      const improved = result.won && store.record(game.id, campaign.version, level.number, result);
      root.querySelector('#campaign-best').textContent = campaignResultText(
        game.id,
        store.progress(game.id).best[level.number],
      );
      overlay.hidden = false;
      overlay.innerHTML = `<div class="overlay-card result-card"><p class="result-kicker">第 ${level.number} / 20 关</p><h2>${result.won ? (level.number === 20 ? '漂亮，20 关全部完成！' : '这一关，完成了！') : '这次未完成，再试一次。'}</h2><div class="campaign-result">${campaignResultText(game.id, result)}</div><p>${result.won ? (improved ? '本关个人最佳已更新。' : '这一关已完成，可以继续向前。') : `失败原因：${{ mine: '翻到了地雷，请结合周围数字重新推理。', lives: '机会已用完，请留意障碍与落点。', wall: '碰到了边界或石块，请提前转弯。', self: '碰到了自己的身体，请安排绕行路线。', 'wrong-sequence': '回应顺序与微光序列不同，请重新观察。', 'no-moves': '棋盘已没有可以移动的方向，请调整合并顺序。', 'no-groups': '剩余气泡无法成组，请换一种消除顺序。', 'target-shortfall': '本轮序列已结束，完成数量未达到目标。' }[result.reason] || '本关目标尚未完成，请重试当前关。'}`}</p><div class="overlay-actions">${result.won && level.number < 20 ? `<a class="button primary" href="${campaignLink(game.id, level.number + 1)}">下一关 →</a>` : ''}<button class="button ${result.won && level.number < 20 ? 'secondary' : 'primary'}" data-action="again">重试本关 ↻</button><a class="button secondary" href="${campaignLink(game.id)}">返回选关</a></div><button class="text-button" data-action="share">分享这一关 ↗</button><div class="share-fallback" hidden></div></div>`;
      submissionController = new AbortController();
      mountSubmission(overlay.querySelector('.result-card'), {
        run: result.won ? rankedRun : null,
        gameId: game.id,
        result,
        reason: result.won ? reason : '本关尚未通关，进度已保存在本机；通关后即可参加逐关榜。',
        signal: submissionController.signal,
        submissions,
      });
    },
    async onShare(result, overlay) {
      const url = new URL(location.href);
      url.hash = campaignLink(game.id, level.number);
      const text = `玩呀 · ${game.title} · 第 ${level.number} 关\n${result.won ? '已完成' : '再次挑战'} · ${campaignResultText(game.id, result)}\n${url.href}`;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          onToast('关卡和成绩已复制');
          return;
        }
      } catch {}
      const fallback = overlay.querySelector('.share-fallback');
      fallback.hidden = false;
      fallback.innerHTML =
        '<label>复制以下关卡与成绩<textarea readonly aria-label="分享关卡与成绩"></textarea></label>';
      const area = fallback.querySelector('textarea');
      area.value = text;
      area.focus();
      area.select();
      onToast('请复制下方文字分享');
    },
  });
}
