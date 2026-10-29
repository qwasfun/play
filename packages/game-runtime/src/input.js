export function bindGameInput(canvas, {isRunning, onInput, onUpdate, onPause, signal}) {
  let pointer = null;
  const heldKeys = new Set();
  const keys = new Set([' ', 'Enter', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'z', 'Z', 'u', 'U', 'Backspace']);
  const coordinates = event => {
    const rect = canvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*(canvas.width||600)/rect.width,y:(event.clientY-rect.top)*(canvas.height||480)/rect.height};
  };
  function releaseCapture(id) { try { canvas.releasePointerCapture(id); } catch {} }
  function cancel() {
    const previous = pointer;
    pointer = null;
    heldKeys.clear();
    onInput('primary-cancel', {});
    if (previous !== null) releaseCapture(previous);
  }
  const listen = (type, handler) => canvas.addEventListener(type, handler, {signal});
  listen('pointerdown', event => {
    if (!isRunning() || pointer !== null || heldKeys.size || event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault();
    pointer = event.pointerId;
    try { canvas.setPointerCapture(pointer); } catch {}
    canvas.focus({preventScroll:true});
    onInput('primary-down', coordinates(event));
    onUpdate();
  });
  listen('pointerup', event => {
    if (event.pointerId !== pointer) return;
    const previous = pointer;
    pointer = null;
    if (isRunning()) onInput('primary-up', coordinates(event));
    releaseCapture(previous);
    onUpdate();
  });
  listen('pointermove', event => {
    if (event.pointerId !== pointer || !isRunning()) return;
    event.preventDefault();
    onInput('primary-move', coordinates(event));
    onUpdate();
  });
  for (const type of ['pointercancel', 'lostpointercapture']) listen(type, event => {
    if (event.pointerId === pointer) cancel();
  });
  listen('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); onPause(); return; }
    if (!keys.has(event.key)) return;
    event.preventDefault();
    if (!isRunning() || pointer !== null || event.repeat || heldKeys.has(event.key.toLowerCase())) return;
    heldKeys.add(event.key.toLowerCase());
    onInput('key-down', {key:event.key.length===1?event.key.toLowerCase():event.key,repeat:false});
    onUpdate();
  });
  listen('keyup', event => {
    if (!keys.has(event.key)) return;
    event.preventDefault();
    if (!heldKeys.delete(event.key.toLowerCase())) return;
    if (isRunning()) onInput('key-up', {key:event.key.length===1?event.key.toLowerCase():event.key});
    onUpdate();
  });
  listen('blur', cancel);
  listen('contextmenu', event => event.preventDefault());
  signal.addEventListener('abort', cancel, {once:true});
  return {cancel};
}

export function watchGameLayout(canvas, onChange, signal) {
  const initial = canvas.getBoundingClientRect();
  let width = initial.width, height = initial.height;
  const changed = () => onChange('layout');
  const orientation = window.matchMedia('(orientation: landscape)');
  orientation.addEventListener('change', changed, {signal});
  window.addEventListener('orientationchange', changed, {signal});
  window.screen.orientation?.addEventListener('change', changed, {signal});
  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', changed, {signal});
    return;
  }
  const observer = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    if (Math.abs(rect.width-width) < .5 && Math.abs(rect.height-height) < .5) return;
    width = rect.width; height = rect.height;
    changed();
  });
  observer.observe(canvas);
  signal.addEventListener('abort', () => observer.disconnect(), {once:true});
}
