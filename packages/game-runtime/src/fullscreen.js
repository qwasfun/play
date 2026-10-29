// Keep the game controls inside the fullscreen surface. Embedded browsers and
// iPhones that cannot fullscreen an element still get the same page-wide layout.
export function bindGameFullscreen(
  target,
  button,
  { onChange = () => {}, onFallback = () => {}, signal } = {},
) {
  const document = target.ownerDocument,
    body = document.body;
  let mode = null,
    pending = false,
    destroyed = false;
  const nativeElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const request = target.requestFullscreen || target.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  function display(next) {
    if (mode === next) return;
    mode = next;
    target.classList.toggle('is-fullscreen', !!mode);
    body.classList.toggle('has-fullscreen-game', !!mode);
    button.textContent = mode ? '退出全屏' : '⛶ 全屏';
    button.setAttribute('aria-label', mode ? '退出全屏' : '全屏游戏');
    button.setAttribute('aria-pressed', String(!!mode));
    target.dataset.fullscreenMode = mode || '';
    onChange();
  }
  function exitNative() {
    try {
      return Promise.resolve(exit?.call(document));
    } catch (error) {
      return Promise.reject(error);
    }
  }
  function changed() {
    if (destroyed) return;
    if (nativeElement() === target) display('native');
    else if (mode === 'native') display(null);
  }
  async function toggle() {
    if (destroyed || pending) return;
    pending = true;
    // Cancel a held bridge or drag before any browser/layout transition starts.
    onChange();
    try {
      if (mode) {
        if (nativeElement() === target) {
          try {
            await exitNative();
          } catch {
            return;
          }
          if (!destroyed && nativeElement() !== target) display(null);
        } else display(null);
        return;
      }
      if (
        request &&
        document.fullscreenEnabled !== false &&
        document.webkitFullscreenEnabled !== false
      ) {
        try {
          await request.call(target, { navigationUI: 'hide' });
          if (destroyed) {
            if (nativeElement() === target) await exitNative().catch(() => {});
            return;
          }
          if (nativeElement() === target) {
            display('native');
            return;
          }
        } catch {}
      }
      if (!destroyed) {
        display('immersive');
        onFallback();
      }
    } finally {
      pending = false;
    }
  }
  function keydown(event) {
    if (event.key !== 'Escape' || !mode) return;
    event.preventDefault();
    event.stopPropagation();
    void toggle();
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    button.removeEventListener('click', toggle);
    document.removeEventListener('fullscreenchange', changed);
    document.removeEventListener('webkitfullscreenchange', changed);
    document.removeEventListener('keydown', keydown, true);
    target.classList.toggle('is-fullscreen', false);
    body.classList.toggle('has-fullscreen-game', false);
    if (nativeElement() === target) void exitNative().catch(() => {});
    mode = null;
  }
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', toggle);
  document.addEventListener('fullscreenchange', changed);
  document.addEventListener('webkitfullscreenchange', changed);
  document.addEventListener('keydown', keydown, true);
  signal?.addEventListener('abort', destroy, { once: true });
  if (signal?.aborted) destroy();
  return { toggle, destroy };
}
