import test from 'node:test';
import assert from 'node:assert/strict';
import { bindTouchActivation } from '@playground/game-runtime/activation';

class Surface extends EventTarget {
  time = 0;
  defaultView = { performance: { now: () => this.time } };
  contains(element) {
    return element.ownerDocument === this && element.isConnected;
  }
  emit(type, properties = {}) {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries(properties))
      Object.defineProperty(event, key, { value });
    this.dispatchEvent(event);
    return event;
  }
}
class Element {
  constructor(document, tagName = 'BUTTON', id = '') {
    this.ownerDocument = document;
    this.tagName = tagName;
    this.id = id;
    this.isConnected = true;
    this.disabled = false;
    this.scriptClicks = 0;
  }
  closest() {
    return ['BUTTON', 'A'].includes(this.tagName) || this.id === 'game-canvas'
      ? this
      : this.parentElement?.closest() || null;
  }
  getAttribute() {
    return null;
  }
  click() {
    this.scriptClicks++;
    this.ownerDocument.emit('click', { target: this, detail: 0, pointerId: -1 });
  }
}
function setup() {
  const surface = new Surface(),
    button = new Element(surface),
    link = new Element(surface, 'A'),
    canvas = new Element(surface, 'CANVAS', 'game-canvas');
  const cleanup = bindTouchActivation(surface),
    activations = [];
  surface.addEventListener('click', (event) => activations.push(event.target));
  const event = (type, target = button, extra = {}) =>
    surface.emit(type, {
      target,
      pointerId: 11,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientX: 30,
      clientY: 40,
      ...extra,
    });
  return { surface, button, link, canvas, cleanup, activations, event };
}

test('touch button activates synchronously once and its later native click is blocked', () => {
  const { surface, button, activations, event } = setup();
  assert.equal(event('pointerdown').defaultPrevented, false);
  event('pointerup');
  assert.deepEqual(activations, [button]);
  assert.equal(button.scriptClicks, 1);
  assert.equal(
    surface.emit('click', { target: button, detail: 1, pointerId: 11 }).defaultPrevented,
    true,
  );
  assert.equal(
    surface.emit('click', { target: button, detail: 2, pointerId: 11 }).defaultPrevented,
    true,
  );
  assert.deepEqual(activations, [button]);
});

test('a touch after a completed canvas drag still activates pause even if native click is missing', () => {
  const { canvas, button, activations, event } = setup();
  event('pointerdown', canvas);
  event('pointermove', canvas, { clientX: 180 });
  event('pointerup', canvas, { clientX: 180 });
  event('pointerdown', button, { pointerId: 12 });
  event('pointerup', button, { pointerId: 12 });
  assert.deepEqual(activations, [button]);
});

test('canvas gestures suppress retargeted compatibility clicks after an overlay replaces the target', () => {
  for (const pointerType of ['touch', 'pen', 'mouse']) {
    const { surface, canvas, link, activations, event } = setup();
    event('pointerdown', canvas, { pointerType });
    event('pointerup', canvas, { pointerType });
    canvas.isConnected = false;
    assert.equal(
      surface.emit('click', { target: link, detail: 1, pointerId: 11 }).defaultPrevented,
      true,
    );
    assert.deepEqual(activations, []);
  }
});

test('movement greater than twelve pixels cancels activation even when the finger comes back', () => {
  const { surface, button, activations, event } = setup();
  event('pointerdown');
  event('pointermove', button, { clientX: 43 });
  event('pointermove');
  event('pointerup');
  surface.emit('click', { target: button, detail: 1, pointerId: 11 });
  assert.deepEqual(activations, []);
});

test('final release distance is checked even if pointermove was not delivered', () => {
  const { activations, event } = setup();
  event('pointerdown');
  event('pointerup', undefined, { clientX: 43 });
  assert.deepEqual(activations, []);
});

test('cancelled gesture and release on another control never activate', () => {
  const first = setup();
  first.event('pointerdown');
  first.event('pointercancel');
  first.event('pointerup');
  assert.deepEqual(first.activations, []);
  const second = setup();
  second.event('pointerdown');
  second.event('pointerup', second.link);
  assert.deepEqual(second.activations, []);
});

test('a secondary finger cannot move, release, or cancel the primary candidate', () => {
  const { button, link, activations, event } = setup();
  event('pointerdown');
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'])
    event(type, link, { pointerId: 12, isPrimary: false, clientX: 300 });
  event('pointerup');
  assert.deepEqual(activations, [button]);
});

test('pen activates controls; ordinary mouse and keyboard clicks keep native behavior', () => {
  const { surface, button, link, activations, event } = setup();
  event('pointerdown', button, { pointerType: 'pen' });
  event('pointerup', button, { pointerType: 'pen' });
  event('pointerdown', link, { pointerType: 'mouse', pointerId: 1 });
  event('pointerup', link, { pointerType: 'mouse', pointerId: 1 });
  assert.equal(link.scriptClicks, 0);
  assert.equal(
    surface.emit('click', { target: link, detail: 1, pointerId: 1 }).defaultPrevented,
    false,
  );
  assert.equal(
    surface.emit('click', { target: button, detail: 0, pointerId: -1 }).defaultPrevented,
    false,
  );
  assert.deepEqual(activations, [button, link, button]);
});

test('legacy clicks without pointerId are suppressed, while a fresh pointerdown clears their fallback', () => {
  const { surface, button, link, activations, event } = setup();
  event('pointerdown');
  event('pointerup');
  assert.equal(surface.emit('click', { target: button, detail: 1 }).defaultPrevented, true);
  event('pointerdown', link, { pointerId: 12, pointerType: 'mouse' });
  event('pointerup', link, { pointerId: 12, pointerType: 'mouse' });
  assert.equal(surface.emit('click', { target: link, detail: 1 }).defaultPrevented, false);
  assert.deepEqual(activations, [button, link]);
});

test('reused pointer ids do not block a fresh ordinary mouse gesture', () => {
  const { surface, canvas, button, activations, event } = setup();
  event('pointerdown', canvas);
  event('pointerup', canvas);
  event('pointerdown', button, { pointerType: 'mouse' });
  event('pointerup', button, { pointerType: 'mouse' });
  assert.equal(
    surface.emit('click', { target: button, detail: 1, pointerId: 11 }).defaultPrevented,
    false,
  );
  assert.deepEqual(activations, [button]);
});

test('a native click carrying another pointer id is never mistaken for the guarded click', () => {
  const { surface, button, activations, event } = setup();
  event('pointerdown');
  event('pointerup');
  assert.equal(
    surface.emit('click', { target: button, detail: 1, pointerId: 99 }).defaultPrevented,
    false,
  );
  assert.deepEqual(activations, [button, button]);
});

test('suppression expires and cleanup removes all interception', () => {
  const { surface, canvas, button, cleanup, activations, event } = setup();
  event('pointerdown', canvas);
  event('pointerup', canvas);
  surface.time = 901;
  assert.equal(
    surface.emit('click', { target: button, detail: 1, pointerId: 11 }).defaultPrevented,
    false,
  );
  event('pointerdown');
  cleanup();
  event('pointerup');
  assert.equal(button.scriptClicks, 0);
  assert.deepEqual(activations, [button]);
});

test('disabled or disconnected candidates do not receive a synthetic activation', () => {
  const { button, activations, event } = setup();
  button.disabled = true;
  event('pointerdown');
  event('pointerup');
  button.disabled = false;
  event('pointerdown');
  button.isConnected = false;
  event('pointerup');
  assert.equal(button.scriptClicks, 0);
  assert.deepEqual(activations, []);
});

test('nested labels resolve to the same control and small diagonal motion remains a tap', () => {
  const { surface, button, activations, event } = setup();
  const label = new Element(surface, 'SPAN');
  label.parentElement = button;
  event('pointerdown', label);
  event('pointermove', label, { clientX: 36, clientY: 46 });
  event('pointerup', label, { clientX: 36, clientY: 46 });
  assert.deepEqual(activations, [button]);
});
