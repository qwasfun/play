import test from 'node:test';
import assert from 'node:assert/strict';
import { bindGameFullscreen } from '@playground/game-runtime/fullscreen';

class Classes {
  values = new Set();
  toggle(name, enabled) {
    if (enabled) this.values.add(name);
    else this.values.delete(name);
    return enabled;
  }
  contains(name) {
    return this.values.has(name);
  }
}
class Element extends EventTarget {
  classList = new Classes();
  dataset = {};
  attributes = new Map();
  textContent = '';
  constructor(document) {
    super();
    this.ownerDocument = document;
  }
  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
  getAttribute(name) {
    return this.attributes.get(name);
  }
  click() {
    this.dispatchEvent(new Event('click'));
  }
}
function setup(kind = 'native') {
  const document = new EventTarget(),
    abort = new AbortController(),
    events = [];
  document.body = { classList: new Classes() };
  document.fullscreenElement = null;
  const target = new Element(document),
    button = new Element(document),
    calls = { request: 0, exit: 0, fallback: 0 };
  const changed = () => document.dispatchEvent(new Event('fullscreenchange'));
  if (kind !== 'unsupported') {
    target.requestFullscreen = async () => {
      calls.request++;
      document.fullscreenElement = target;
      changed();
    };
    document.exitFullscreen = async () => {
      calls.exit++;
      document.fullscreenElement = null;
      changed();
    };
  }
  if (kind === 'rejected')
    target.requestFullscreen = async () => {
      calls.request++;
      throw new Error('Fullscreen denied by embedding policy');
    };
  const controls = bindGameFullscreen(target, button, {
    onChange: () => events.push(document.fullscreenElement),
    onFallback: () => calls.fallback++,
    signal: abort.signal,
  });
  const active = () =>
    target.classList.contains('is-fullscreen') &&
    document.body.classList.contains('has-fullscreen-game');
  return { document, target, button, abort, events, calls, controls, active, changed };
}
const settled = () => new Promise((resolve) => setImmediate(resolve));

test('native fullscreen includes game controls, pauses before requesting, and exits through the same button', async () => {
  const { document, target, button, events, calls, controls, active } = setup();
  const entering = controls.toggle();
  assert.equal(events[0], null, 'input cancellation must happen before the native transition');
  await entering;
  assert.equal(document.fullscreenElement, target);
  assert.equal(active(), true);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(button.getAttribute('aria-label'), '退出全屏');
  assert.equal(target.dataset.fullscreenMode, 'native');
  assert.equal(calls.fallback, 0);
  button.click();
  await settled();
  assert.equal(document.fullscreenElement, null);
  assert.equal(active(), false);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.equal(button.getAttribute('aria-label'), '全屏游戏');
  assert.equal(calls.request, 1);
  assert.equal(calls.exit, 1);
});

test('browser initiated fullscreen exit clears the layout and pauses the game', async () => {
  const { document, events, button, controls, active, changed } = setup();
  await controls.toggle();
  const changes = events.length;
  document.fullscreenElement = null;
  changed();
  assert.equal(active(), false);
  assert.equal(events.length, changes + 1);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
});

test('unsupported browsers retain a usable immersive mode and an exit control', async () => {
  const { target, calls, button, controls, active } = setup('unsupported');
  await controls.toggle();
  assert.equal(active(), true);
  assert.equal(target.dataset.fullscreenMode, 'immersive');
  assert.equal(calls.fallback, 1);
  button.click();
  await settled();
  assert.equal(active(), false);
  assert.equal(calls.request, 0);
});

test('a denied native fullscreen request falls back without leaving a stuck pending state', async () => {
  const { target, calls, controls, active } = setup('rejected');
  await controls.toggle();
  assert.equal(active(), true);
  assert.equal(target.dataset.fullscreenMode, 'immersive');
  assert.equal(calls.request, 1);
  assert.equal(calls.fallback, 1);
  await controls.toggle();
  assert.equal(active(), false);
  await controls.toggle();
  assert.equal(active(), true);
  assert.equal(calls.request, 2);
});

test('disabled fullscreen permission skips the native request', async () => {
  const { document, calls, controls, active } = setup();
  document.fullscreenEnabled = false;
  await controls.toggle();
  assert.equal(active(), true);
  assert.equal(calls.request, 0);
  assert.equal(calls.fallback, 1);
});

test('Escape leaves immersive fullscreen and is consumed only while fullscreen is active', async () => {
  const { document, controls, active } = setup('unsupported');
  const escape = () => {
    const event = new Event('keydown', { cancelable: true });
    Object.defineProperty(event, 'key', { value: 'Escape' });
    document.dispatchEvent(event);
    return event;
  };
  assert.equal(escape().defaultPrevented, false);
  await controls.toggle();
  assert.equal(escape().defaultPrevented, true);
  await settled();
  assert.equal(active(), false);
  assert.equal(escape().defaultPrevented, false);
});

test('WebKit prefixed native fullscreen enters and responds to external exit', async () => {
  const { document, target, controls, active, calls } = setup('unsupported');
  // Prefix availability is captured during binding, so use a fresh binding.
  controls.destroy();
  target.webkitRequestFullscreen = () => {
    calls.request++;
    document.webkitFullscreenElement = target;
    document.dispatchEvent(new Event('webkitfullscreenchange'));
  };
  document.webkitExitFullscreen = () => {
    calls.exit++;
    document.webkitFullscreenElement = null;
    document.dispatchEvent(new Event('webkitfullscreenchange'));
  };
  const prefixed = bindGameFullscreen(target, new Element(document));
  await prefixed.toggle();
  assert.equal(active(), true);
  assert.equal(target.dataset.fullscreenMode, 'native');
  document.webkitFullscreenElement = null;
  document.dispatchEvent(new Event('webkitfullscreenchange'));
  assert.equal(active(), false);
  await prefixed.toggle();
  await prefixed.toggle();
  assert.equal(active(), false);
  assert.equal(calls.exit, 1);
  prefixed.destroy();
});

test('aborting the game exits native fullscreen and prevents later button or document activity', async () => {
  const { document, target, button, abort, events, calls, controls, active, changed } = setup();
  await controls.toggle();
  abort.abort();
  await settled();
  assert.equal(active(), false);
  assert.equal(document.fullscreenElement, null);
  assert.equal(calls.exit, 1);
  const changes = events.length;
  button.click();
  await controls.toggle();
  document.fullscreenElement = target;
  changed();
  assert.equal(active(), false);
  assert.equal(events.length, changes);
  assert.equal(calls.request, 1);
});

test('a native request completing after route destruction is exited without reviving fullscreen', async () => {
  const { document, target, controls, active, calls, changed } = setup();
  let complete;
  target.requestFullscreen = () => {
    calls.request++;
    return new Promise((resolve) => {
      complete = () => {
        document.fullscreenElement = target;
        changed();
        resolve();
      };
    });
  };
  // The binding captures its request method, so rebind to the deferred method.
  controls.destroy();
  const binding = bindGameFullscreen(target, new Element(document));
  const pending = binding.toggle();
  binding.destroy();
  complete();
  await pending;
  assert.equal(active(), false);
  assert.equal(document.fullscreenElement, null);
  assert.equal(calls.exit, 1);
});

test('rapid repeated toggles cannot launch duplicate native requests', async () => {
  const { document, target, controls, calls, active, changed } = setup();
  let complete;
  controls.destroy();
  target.requestFullscreen = () => {
    calls.request++;
    return new Promise((resolve) => {
      complete = () => {
        document.fullscreenElement = target;
        changed();
        resolve();
      };
    });
  };
  const binding = bindGameFullscreen(target, new Element(document));
  const first = binding.toggle(),
    second = binding.toggle();
  await second;
  assert.equal(calls.request, 1);
  complete();
  await first;
  assert.equal(active(), true);
  assert.equal(calls.fallback, 0);
  binding.destroy();
});
