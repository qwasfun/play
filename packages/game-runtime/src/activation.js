// Touch activation stays in the pointerup gesture. Some mobile browsers omit a
// native click after dragging the canvas; others retarget it to a new overlay.
export function bindTouchActivation(root = globalThis.document) {
  if (!root?.addEventListener) throw new TypeError('A document or element root is required');
  const document = root.ownerDocument || root;
  const now = () => document.defaultView?.performance?.now?.() ?? Date.now();
  const suppressions = new Map();
  const lifetime = 900;
  const capture = { capture: true };
  let active = null;
  let fallback = null;

  function candidate(target) {
    const element = (target?.closest ? target : target?.parentElement)?.closest?.(
      'button, a, #game-canvas',
    );
    if (!element || (root.contains && !root.contains(element))) return null;
    return element;
  }
  function enabled(element) {
    return (
      element?.isConnected !== false &&
      !element?.disabled &&
      element?.getAttribute?.('aria-disabled') !== 'true'
    );
  }
  const idOf = (event) => event.pointerId ?? null;
  const isTouch = (type) => type === 'touch' || type === 'pen';
  const point = (event) => ({
    x: Number.isFinite(event.clientX) ? event.clientX : 0,
    y: Number.isFinite(event.clientY) ? event.clientY : 0,
  });
  function prune() {
    const time = now();
    for (const [id, record] of suppressions) if (record.until <= time) suppressions.delete(id);
    if (fallback?.until <= time) fallback = null;
  }
  function suppress(pointer) {
    prune();
    const record = { until: now() + lifetime };
    suppressions.set(pointer.id, record);
    fallback = record;
  }
  function moved(event) {
    const position = point(event);
    return Math.hypot(position.x - active.x, position.y - active.y) > 12;
  }
  function down(event) {
    if (event.isPrimary === false || (event.button != null && event.button !== 0)) return;
    const id = idOf(event);
    if (active && active.id !== id) return;
    prune();
    // Pointer ids may be reused. A fresh gesture also invalidates the fallback
    // used by Safari's MouseEvent clicks, which do not contain a pointer id.
    suppressions.delete(id);
    fallback = null;
    const element = candidate(event.target);
    active =
      element && enabled(element)
        ? {
            id,
            element,
            pointerType: event.pointerType || 'mouse',
            canvas: element.id === 'game-canvas',
            dragged: false,
            ...point(event),
          }
        : null;
  }
  function move(event) {
    if (!active || event.isPrimary === false || active.id !== idOf(event)) return;
    if (moved(event)) active.dragged = true;
  }
  function up(event) {
    if (!active || event.isPrimary === false || active.id !== idOf(event)) return;
    const dragged = active.dragged || moved(event);
    const pointer = active;
    active = null;
    if (pointer.canvas) {
      suppress(pointer);
      return;
    }
    if (!isTouch(pointer.pointerType)) return;
    // Arm the guard before click(), including when this gesture was cancelled
    // by movement or a changed element. Programmatic detail=0 clicks pass it.
    suppress(pointer);
    if (!dragged && candidate(event.target) === pointer.element && enabled(pointer.element))
      pointer.element.click();
  }
  function cancel(event) {
    if (!active || event.isPrimary === false || active.id !== idOf(event)) return;
    const pointer = active;
    active = null;
    if (pointer.canvas || isTouch(pointer.pointerType)) suppress(pointer);
  }
  function click(event) {
    // Keyboard and assistive activation, as well as our synchronous click(),
    // carry detail=0 and must continue to work without a pointer gesture.
    if (!(event.detail > 0)) return;
    prune();
    const hasPointerId = Number.isFinite(event.pointerId) && event.pointerId >= 0;
    const record = hasPointerId ? suppressions.get(event.pointerId) : fallback;
    if (!record) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  const handlers = {
    pointerdown: down,
    pointermove: move,
    pointerup: up,
    pointercancel: cancel,
    click,
  };
  for (const [type, handler] of Object.entries(handlers))
    root.addEventListener(type, handler, capture);
  return () => {
    for (const [type, handler] of Object.entries(handlers))
      root.removeEventListener(type, handler, capture);
    active = null;
    fallback = null;
    suppressions.clear();
  };
}
