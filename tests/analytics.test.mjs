import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalytics } from '../apps/arcade/src/analytics.js';

function setup({ loaded = false, enabled = true } = {}) {
  const events = [],
    scripts = [];
  const scope = { location: new URL('https://play.example.test/') };
  const document = {
    title: 'Home',
    referrer: 'https://referrer.example.test/',
    createElement: () => ({ dataset: {} }),
    head: { append: (script) => scripts.push(script) },
  };
  const load = () => {
    scope.umami = {
      track: (build) => events.push(build({ screen: '1280x900', language: 'zh-CN' })),
    };
    scripts[0]?.onload();
  };
  if (loaded) load();
  const track = createAnalytics({
    config: { enabled, websiteId: 'test-site', scriptUrl: 'https://stats.example.test/script.js' },
    scope,
    document,
  });
  return { events, scripts, scope, document, track, load };
}

test('pageviews preserve route, title and referrer across delayed script loading', () => {
  const s = setup();
  s.track.pageview('#/');
  s.scope.location.hash = '#/levels/lights/1?cv=1';
  s.document.title = 'Lights level 1';
  s.track.pageview(s.scope.location.hash);
  s.track('game_start', {
    game_id: 'lights',
    mode: 'campaign',
    rules_version: 1,
    level: 1,
    campaign_version: 1,
    nickname: 'private',
    player_id: 'private',
    token: 'secret',
    levelProof: { events: [] },
  });
  assert.equal(s.events.length, 0);
  assert.equal(s.scripts.length, 1);
  assert.equal(s.scripts[0].dataset.autoTrack, 'false');
  s.document.title = 'Later title';
  s.load();
  assert.equal(s.events.length, 3);
  assert.deepEqual(
    s.events.map(({ url, title, referrer }) => ({ url, title, referrer })),
    [
      {
        url: 'https://play.example.test/#/',
        title: 'Home',
        referrer: 'https://referrer.example.test/',
      },
      {
        url: 'https://play.example.test/#/levels/lights/1?cv=1',
        title: 'Lights level 1',
        referrer: 'https://play.example.test/#/',
      },
      {
        url: 'https://play.example.test/#/levels/lights/1?cv=1',
        title: 'Lights level 1',
        referrer: 'https://play.example.test/#/',
      },
    ],
  );
  assert.equal(s.events[2].screen, '1280x900');
  assert.deepEqual(s.events[2].data, {
    game_id: 'lights',
    mode: 'campaign',
    rules_version: 1,
    level: 1,
    campaign_version: 1,
  });
  assert.ok(!JSON.stringify(s.events).includes('private'));
  assert.ok(!JSON.stringify(s.events).includes('secret'));
});

test('consecutive rerenders deduplicate, while back, forward and reload count visits', () => {
  const s = setup({ loaded: true });
  for (const hash of ['#/', '#/', '#/favorites', '#/favorites', '#/', '#/favorites'])
    s.track.pageview(hash);
  assert.equal(s.events.length, 4);
  assert.equal(s.events[2].referrer, 'https://play.example.test/#/favorites');
  const reload = setup({ loaded: true });
  reload.track.pageview('#/favorites');
  assert.equal(reload.events.length, 1);
});

test('disabled analytics does not load or call an existing tracker', () => {
  const s = setup({ enabled: false, loaded: true });
  s.track.pageview('#/');
  s.track('game_finish', { score: 1 });
  assert.equal(s.scripts.length, 0);
  assert.equal(s.events.length, 0);
});

test('failed or missing scripts discard queued and future events', () => {
  for (const missingTracker of [false, true]) {
    const s = setup();
    s.track.pageview('#/');
    if (missingTracker) s.scripts[0].onload();
    else s.scripts[0].onerror();
    s.load();
    s.track.pageview('#/favorites');
    s.track('game_start', {});
    assert.equal(s.events.length, 0);
  }
});

test('loading queue is bounded and send failures do not escape', async () => {
  const s = setup();
  for (let i = 0; i < 80; i++) s.track('game_start', { score: i });
  s.load();
  assert.equal(s.events.length, 50);
  for (const track of [
    () => {
      throw Error('blocked');
    },
    () => Promise.reject(Error('offline')),
  ]) {
    s.scope.umami.track = track;
    assert.doesNotThrow(() => s.track('game_finish', { won: false }));
    assert.doesNotThrow(() => s.track.pageview('#/favorites'));
    await new Promise((resolve) => setImmediate(resolve));
  }
});

test('public configuration enables only the production hostname', async () => {
  const previous = globalThis.location;
  try {
    for (const hostname of ['play.185036.xyz', 'localhost', '127.0.0.1', 'preview.example.test']) {
      globalThis.location = new URL('https://' + hostname);
      const { siteConfig } = await import('../apps/arcade/src/site-config.js?host=' + hostname);
      assert.equal(siteConfig.umami.enabled, hostname === 'play.185036.xyz');
      assert.equal(siteConfig.umami.scriptUrl, 'https://um.185036.xyz/script.js');
    }
  } finally {
    if (previous === undefined) delete globalThis.location;
    else globalThis.location = previous;
  }
});
