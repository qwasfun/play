import { bindGameInput, watchGameLayout } from './input.js';
import { bindGameFullscreen } from './fullscreen.js';
function lifeText(game, value = typeof game.lives === 'number' ? game.lives : 3) {
  const lives = Math.max(0, value);
  return typeof game.lives === 'number' ? `♥ ${lives}` : '♥ '.repeat(lives).trim() || '—';
}

export function gameSurface(game, { backHref = '#/', backLabel = '← 游乐场' } = {}) {
  return `<div class="play-main" style="--game-aspect:${game.canvas?.width || 600}/${game.canvas?.height || 480};--game-ratio:${(game.canvas?.width || 600) / (game.canvas?.height || 480)}"><div class="game-toolbar"><div class="stat"><span class="stat-label">${game.scoreLabel || '得分'}</span><strong class="stat-value" id="live-score">0</strong></div><div class="stat"><span class="stat-label">${game.limit === null ? '已用时间' : '剩余时间'}</span><strong class="stat-value" id="live-time">${game.limit ?? 0} <small>秒</small></strong></div><div class="stat"><span class="stat-label" id="third-label">${game.extraLabel || '目标'}</span><strong class="stat-value" id="live-extra">${game.lives ? lifeText(game) : game.targetText || '—'}</strong></div></div><div class="canvas-wrap"><canvas id="game-canvas" width="${game.canvas?.width || 600}" height="${game.canvas?.height || 480}" tabindex="0" aria-label="${game.title}游戏区域，${game.controls}"></canvas><div class="game-overlay" id="game-overlay"></div></div><div class="game-controls"><button class="button secondary" id="pause" disabled>Ⅱ 暂停</button><button class="button secondary" id="restart" disabled>↻ 重开</button>${game.undo ? '<button class="button secondary" id="undo" disabled>↶ 撤销</button>' : ''}<button class="button secondary" id="fullscreen-toggle" aria-label="全屏游戏" aria-pressed="false">⛶ 全屏</button><span class="controls-label">${game.controls}</span><a class="landscape-exit button secondary" href="${backHref}">${backLabel}</a></div><p class="game-help" id="game-hint" role="status">${game.controls}</p></div>`;
}
/**
 * Mount one game. Host callbacks own persistence, network runs and sharing.
 * onBeforeStart({signal,overlay}) may asynchronously return a replacement seed.
 * onMount receives the lifetime signal; onFinish receives result and {overlay,signal}.
 * The returned destroy() cancels animation, inputs and host work, including pending starts.
 */
export function mountGame({
  root,
  game,
  createGame,
  seed,
  level,
  sound = () => {},
  onMount = () => {},
  onBeforeStart = async () => undefined,
  onStarted = () => {},
  onFinish = () => {},
  onShare = () => {},
  onToast = () => {},
  readyHtml = '',
}) {
  const overlay = root.querySelector('#game-overlay');
  const canvas = root.querySelector('#game-canvas'),
    ctx = canvas.getContext('2d');
  if (!ctx) {
    overlay.innerHTML =
      '<div class="overlay-card"><h2>浏览器暂不支持游戏画布</h2><p>请使用较新版本的浏览器打开。</p><a class="button primary" href="#/">返回首页</a></div>';
    return { destroy() {} };
  }
  let engine,
    status = 'ready',
    last = 0,
    accumulator = 0,
    raf = 0,
    lastResult = null,
    inputControls,
    overlayPointerDown = false,
    startInterrupted = false;
  const listeners = new AbortController();
  onMount(listeners.signal);
  const pauseButton = root.querySelector('#pause'),
    restartButton = root.querySelector('#restart'),
    undoButton = root.querySelector('#undo');
  const scoreEl = root.querySelector('#live-score'),
    timeEl = root.querySelector('#live-time'),
    extraEl = root.querySelector('#live-extra'),
    hintEl = root.querySelector('#game-hint');
  const ui = () => {
    const state = engine.getState();
    scoreEl.textContent = state[game.scoreField || 'score'] || 0;
    timeEl.innerHTML = `${game.limit === null ? Math.floor(state.elapsed || 0) : Math.max(0, Math.ceil(game.limit - (state.elapsed || 0)))} <small>秒</small>`;
    extraEl.textContent = game.lives
      ? lifeText(game, state.lives)
      : (state.extra ?? game.targetText ?? '—');
    if (state.hint && hintEl.textContent !== state.hint) hintEl.textContent = state.hint;
  };
  function finish(result) {
    if (status !== 'running') return;
    status = 'finished';
    overlayPointerDown = false;
    lastResult = result;
    cancelInputs();
    pauseButton.disabled = true;
    if (undoButton) undoButton.disabled = true;
    onFinish(result, { overlay, signal: listeners.signal });
  }
  const make = () => {
    engine?.destroy?.();
    engine = createGame({ seed, level, onFinish: finish, sound });
    ui();
    engine.draw(ctx);
  };
  function cancelInputs() {
    inputControls?.cancel();
  }
  async function begin() {
    if (status === 'starting') return;
    overlayPointerDown = false;
    cancelInputs();
    status = 'starting';
    startInterrupted = false;
    pauseButton.disabled = true;
    restartButton.disabled = true;
    if (undoButton) undoButton.disabled = true;
    try {
      const nextSeed = await onBeforeStart({ signal: listeners.signal, overlay });
      if (listeners.signal.aborted) return;
      if (nextSeed !== undefined) seed = nextSeed;
    } catch (error) {
      if (listeners.signal.aborted) return;
      status = 'ready';
      overlay.hidden = false;
      overlay.innerHTML = readyHtml;
      onToast(error.message);
      return;
    }
    make();
    status = 'running';
    accumulator = 0;
    last = 0;
    overlay.hidden = true;
    pauseButton.disabled = false;
    restartButton.disabled = false;
    if (undoButton) undoButton.disabled = false;
    canvas.focus({ preventScroll: true });
    sound();
    onStarted();
    if (document.hidden || startInterrupted) pause();
  }
  function pause(reason) {
    if (status === 'starting') {
      startInterrupted = true;
      return;
    }
    if (status !== 'running') return;
    status = 'paused';
    overlayPointerDown = false;
    cancelInputs();
    accumulator = 0;
    last = 0;
    overlay.hidden = false;
    overlay.innerHTML = `<div class="overlay-card"><p class="eyebrow">TAKE YOUR TIME</p><h2>小世界暂停中</h2><p>${reason === 'layout' ? '屏幕尺寸已变化，准备好了再继续。' : '准备好了，再继续。'}</p><button class="button primary" data-action="resume">继续游戏 ▶</button></div>`;
    pauseButton.textContent = '▶ 继续';
  }
  function resume() {
    if (status !== 'paused') return;
    status = 'running';
    accumulator = 0;
    last = 0;
    overlay.hidden = true;
    pauseButton.textContent = 'Ⅱ 暂停';
    canvas.focus({ preventScroll: true });
  }
  function restartConfirm() {
    if (status === 'ready' || status === 'finished') {
      begin();
      return;
    }
    if (status === 'running') pause();
    overlay.innerHTML =
      '<div class="overlay-card"><h2>重新开始这一局？</h2><p>本局进度将重置，已保存的最佳成绩会保留。</p><div class="overlay-actions"><button class="button primary" data-action="again">重新开始</button><button class="button secondary" data-action="resume">继续当前游戏</button></div></div>';
  }
  pauseButton.addEventListener(
    'click',
    () => {
      if (status === 'running') pause();
      else if (status === 'paused') resume();
    },
    { signal: listeners.signal },
  );
  restartButton.addEventListener('click', restartConfirm, { signal: listeners.signal });
  undoButton?.addEventListener(
    'click',
    () => {
      if (status === 'running') {
        engine.input('undo');
        ui();
        canvas.focus({ preventScroll: true });
      }
    },
    { signal: listeners.signal },
  );
  overlay.addEventListener(
    'pointerdown',
    () => {
      overlayPointerDown = true;
    },
    { signal: listeners.signal },
  );
  overlay.addEventListener(
    'pointercancel',
    () => {
      overlayPointerDown = false;
    },
    { signal: listeners.signal },
  );
  overlay.addEventListener(
    'click',
    (event) => {
      if (event.detail > 0 && !overlayPointerDown) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      overlayPointerDown = false;
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'start' || action === 'again') {
        pauseButton.textContent = 'Ⅱ 暂停';
        begin();
      }
      if (action === 'resume') resume();
      if (action === 'share') share();
    },
    { signal: listeners.signal },
  );
  inputControls = bindGameInput(canvas, {
    isRunning: () => status === 'running',
    onInput: (type, payload) => engine?.input(type, payload),
    onUpdate: ui,
    onPause: pause,
    signal: listeners.signal,
  });
  bindGameFullscreen(root.querySelector('.play-main'), root.querySelector('#fullscreen-toggle'), {
    onChange: () => {
      cancelInputs();
      pause('layout');
    },
    onFallback: () => onToast('已铺满游戏页面，可用“退出全屏”返回'),
    signal: listeners.signal,
  });
  watchGameLayout(canvas, pause, listeners.signal);
  window.addEventListener('blur', pause, { signal: listeners.signal });
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) pause();
    },
    { signal: listeners.signal },
  );
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (status === 'running') {
      if (last === 0) last = now;
      const delta = (now - last) / 1000;
      last = now;
      if (delta > 0.5) {
        pause();
        return;
      }
      accumulator += Math.min(delta, 0.1);
      while (accumulator >= 1 / 60 && status === 'running') {
        engine.update(1 / 60);
        accumulator -= 1 / 60;
      }
      ui();
    } else last = 0;
    engine.draw(ctx);
  }
  async function share() {
    if (lastResult) await onShare(lastResult, overlay);
  }
  make();
  overlay.innerHTML = readyHtml;
  raf = requestAnimationFrame(frame);
  return {
    destroy() {
      status = 'destroyed';
      cancelAnimationFrame(raf);
      cancelInputs();
      listeners.abort();
      engine?.destroy?.();
    },
  };
}
