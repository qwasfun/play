import { games } from '@playground/game-registry';

export function setupPwa() {
  if (import.meta.env?.DEV) {
    const sync = () =>
      document.querySelectorAll('[data-offline-status]').forEach((node) => {
        node.textContent = '开发预览';
        node.dataset.state = 'development';
      });
    sync();
    return { sync };
  }
  const supported = window.isSecureContext && 'serviceWorker' in navigator && 'caches' in window;
  const displayMode = matchMedia('(display-mode: standalone)');
  let installed = displayMode.matches || navigator.standalone === true;
  let registration = null,
    installPrompt = null,
    state = supported ? 'preparing' : 'unsupported',
    waiting = false,
    busy = false,
    failure = '离线准备未完成，请联网重试';
  const watched = new WeakSet();
  const dialog = document.querySelector('#install-guide');
  const notice = document.querySelector('[data-pwa-update]');
  let updateVersion = null,
    dismissedVersion = null,
    applying = false,
    reloadFor = null,
    updateError = '';
  const dismissedKey = 'playground:pwa-dismissed:' + new URL('./', document.baseURI).pathname;
  try {
    dismissedVersion = sessionStorage.getItem(dismissedKey);
  } catch {}
  let updateProbe = 0;
  if (notice && 'ResizeObserver' in window)
    new ResizeObserver(() => {
      if (!notice.hidden)
        document.body.style.setProperty(
          '--pwa-update-height',
          `${notice.getBoundingClientRect().height}px`,
        );
    }).observe(notice);
  function syncUpdate() {
    if (!notice) return;
    notice.hidden = !waiting || !updateVersion || dismissedVersion === updateVersion;
    notice.querySelector('[data-update-description]').textContent =
      updateError || '更新将刷新当前页面，当前对局会重置；已保存记录保留。';
    const button = notice.querySelector('[data-update-app]');
    button.disabled = applying;
    button.textContent = applying ? '正在更新…' : '更新应用';
    notice.querySelector('[data-update-later]').disabled = applying;
    document.body.classList.toggle('has-pwa-update', !notice.hidden);
  }
  async function inspectUpdate() {
    const probe = ++updateProbe,
      worker = registration?.waiting;
    if (!worker) {
      waiting = false;
      updateVersion = null;
      syncUpdate();
      return;
    }
    try {
      const reply = await message(worker, 'OFFLINE_STATUS');
      if (probe !== updateProbe || registration?.waiting !== worker) return;
      if (updateVersion !== reply?.version) updateError = '';
      waiting = !!reply?.ready;
      updateVersion = reply?.ready ? reply.version : null;
      syncUpdate();
    } catch {
      /* A failed probe never interrupts the running page. */
    }
  }
  async function applyUpdate() {
    const worker = registration?.waiting;
    if (applying || !worker || !updateVersion) return;
    applying = true;
    reloadFor = worker;
    updateError = '';
    syncUpdate();
    try {
      const reply = await message(worker, 'APPLY_UPDATE');
      if (!reply?.accepted) throw new Error(reply?.error || '更新未能启动，请重试。');
    } catch (error) {
      if (reloadFor !== worker) return;
      reloadFor = null;
      applying = false;
      updateError =
        error.message === 'offline_status_timeout'
          ? '此版本暂不支持应用内更新，请关闭全部「玩呀」窗口后重新打开。'
          : error.message;
      syncUpdate();
    }
  }
  const statusText = () =>
    state === 'ready'
      ? navigator.onLine
        ? `${games.length} 款游戏 · 离线已就绪`
        : `当前离线 · ${games.length} 款照常玩`
      : state === 'unsupported'
        ? '当前浏览器暂不支持离线保存'
        : state === 'error'
          ? failure
          : navigator.onLine
            ? `正在准备 ${games.length} 款离线游戏…`
            : '当前离线，联网后可准备离线游戏';
  function failed(error = '') {
    state = 'error';
    failure = /版本/.test(error)
      ? '游戏已有新版本，请关闭全部「玩呀」窗口后重新打开'
      : /quota|space|storage.*full/i.test(error)
        ? '离线保存空间不足，请清理浏览器空间后重试'
        : '离线准备未完成，请联网重试';
  }
  function sync() {
    for (const element of document.querySelectorAll('[data-offline-status]')) {
      element.textContent = statusText();
      element.dataset.state = state;
    }
    for (const button of document.querySelectorAll('[data-install-app]')) {
      button.textContent = installed ? '已添加到桌面' : installPrompt ? '安装玩呀' : '添加到桌面';
      button.disabled = installed;
    }
    for (const button of document.querySelectorAll('[data-offline-retry]')) {
      button.hidden = state !== 'error';
      button.disabled = busy;
      button.textContent = busy ? '正在准备…' : '重新准备';
    }
    syncUpdate();
  }
  function message(worker, type) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => {
        channel.port1.close();
        reject(new Error('offline_status_timeout'));
      }, 5000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(event.data);
      };
      try {
        worker.postMessage({ type }, [channel.port2]);
      } catch (error) {
        clearTimeout(timer);
        channel.port1.close();
        reject(error);
      }
    });
  }
  async function refreshStatus() {
    if (!registration?.active) return;
    try {
      const reply = await message(registration.active, 'OFFLINE_STATUS');
      state = reply?.ready ? 'ready' : 'error';
    } catch {
      state = 'error';
    }
    sync();
  }
  function watch(reg) {
    registration = reg;
    waiting = !!reg.waiting;
    sync();
    void inspectUpdate();
    if (watched.has(reg)) {
      void refreshStatus();
      return;
    }
    watched.add(reg);
    function follow(worker) {
      if (!worker) return;
      const changed = () => {
        waiting = !!reg.waiting;
        if (worker.state === 'installed' && navigator.serviceWorker.controller) waiting = true;
        if (worker.state === 'redundant' && !reg.active) state = 'error';
        if (worker.state === 'activated') void refreshStatus();
        sync();
        if (
          worker.state === 'installed' ||
          worker.state === 'activated' ||
          worker.state === 'redundant'
        )
          void inspectUpdate();
      };
      worker.addEventListener('statechange', changed);
      changed();
    }
    reg.addEventListener('updatefound', () => follow(reg.installing));
    follow(reg.installing);
    void refreshStatus();
  }
  async function register() {
    if (!supported) return;
    const scope = new URL('./', document.baseURI);
    try {
      const existing = await navigator.serviceWorker.getRegistration(scope.href);
      if (existing?.scope === scope.href) watch(existing);
    } catch {}
    try {
      watch(
        await navigator.serviceWorker.register(new URL('./sw.js', scope), {
          scope: scope.href,
          updateViaCache: 'none',
        }),
      );
    } catch {
      if (!registration?.active) {
        state = 'error';
        sync();
      } else void refreshStatus();
    }
  }
  async function retry() {
    if (busy || !supported) return;
    busy = true;
    sync();
    try {
      if (!registration?.active) await register();
      if (registration?.active) {
        const reply = await message(registration.active, 'RETRY_OFFLINE');
        if (reply?.ready) state = 'ready';
        else failed(reply?.error);
      }
    } catch {
      state = 'error';
    } finally {
      busy = false;
      sync();
    }
  }
  function guide() {
    if (!dialog) return;
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const android = /Android/.test(navigator.userAgent);
    const instructions = ios
      ? ['用 Safari 打开「玩呀」，点击分享按钮。', '选择“添加到主屏幕”，再点“添加”。']
      : android
        ? ['打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。', '确认添加后，就能从桌面图标打开。']
        : [
            '在 Chrome 或 Edge 地址栏找到安装图标，或打开浏览器菜单。',
            '选择“安装玩呀”或“将此页面安装为应用”。',
          ];
    document.querySelector('#install-steps').replaceChildren(
      ...instructions.map((text) => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
      }),
    );
    document.querySelector('#install-offline-note').textContent =
      state === 'ready'
        ? `本机已备好全部 ${games.length} 款游戏，断网也能玩。`
        : `首次请保持联网，等首页显示“${games.length} 款游戏 · 离线已就绪”后，再断网游玩。`;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  async function install() {
    if (installed) return;
    if (!installPrompt) {
      guide();
      return;
    }
    const prompt = installPrompt;
    installPrompt = null;
    sync();
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === 'accepted') installed = true;
    } catch {
      guide();
    }
    sync();
  }
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-install-app]')) void install();
    if (event.target.closest('[data-offline-retry]')) void retry();
    if (event.target.closest('[data-update-app]')) void applyUpdate();
    if (event.target.closest('[data-update-later]')) {
      dismissedVersion = updateVersion;
      try {
        sessionStorage.setItem(dismissedKey, dismissedVersion);
      } catch {}
      syncUpdate();
    }
    if (event.target.closest('[data-close-install]')) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  });
  dialog?.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  });
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    sync();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    installPrompt = null;
    sync();
  });
  displayMode.addEventListener('change', () => {
    installed = displayMode.matches || navigator.standalone === true;
    sync();
  });
  window.addEventListener('offline', sync);
  window.addEventListener('online', () => {
    sync();
    if (!registration?.active) void register();
    else {
      void refreshStatus();
      void registration.update().catch(() => {});
    }
  });
  if (supported) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadFor && navigator.serviceWorker.controller === reloadFor) {
        reloadFor = null;
        location.reload();
        return;
      }
      applying = false;
      void inspectUpdate();
      void refreshStatus();
    });
    void register();
  }
  sync();
  return { sync };
}
