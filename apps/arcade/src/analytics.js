import { siteConfig } from './site-config.js';

export function createAnalytics({
  config = siteConfig.umami,
  scope = globalThis,
  document = scope.document,
} = {}) {
  const queue = [],
    enabled = config?.enabled !== false && Boolean(config?.websiteId);
  let failed = false,
    currentPage;
  function snapshot() {
    return {
      website: config?.websiteId,
      hostname: scope.location?.hostname,
      url: currentPage?.url || scope.location?.href,
      title: document?.title,
      referrer: currentPage?.referrer ?? document?.referrer ?? '',
    };
  }
  function dispatch(payload) {
    try {
      // The callback retains tracker metadata (screen/language), while the
      // queued payload retains the page where the event actually happened.
      Promise.resolve(scope.umami?.track?.((props) => ({ ...props, ...payload }))).catch(() => {});
    } catch {}
  }
  function send(payload) {
    if (!enabled || failed) return;
    if (scope.umami?.track) dispatch(payload);
    else if (queue.length < 50) queue.push(payload);
  }
  function discard() {
    failed = true;
    queue.length = 0;
  }
  if (enabled && config?.scriptUrl && document) {
    try {
      const script = document.createElement('script');
      script.defer = true;
      script.src = config.scriptUrl;
      script.dataset.websiteId = config.websiteId;
      // Hash routing is owned by the application, including the initial view.
      script.dataset.autoTrack = 'false';
      script.onload = () => {
        if (!scope.umami?.track) return discard();
        for (const payload of queue.splice(0)) dispatch(payload);
      };
      script.onerror = discard;
      document.head.append(script);
    } catch {
      discard();
      /* Analytics never controls game availability. */
    }
  }
  const track = (event, data) => {
    if (!enabled || failed) return;
    const clean = {};
    // An explicit allowlist prevents future profile/session fields from leaking.
    for (const key of [
      'game_id',
      'mode',
      'rules_version',
      'score',
      'elapsed',
      'won',
      'level',
      'campaign_version',
    ])
      if (['string', 'number', 'boolean'].includes(typeof data?.[key])) clean[key] = data[key];
    send({ ...snapshot(), name: event, data: clean });
  };
  track.pageview = (fragment) => {
    if (!enabled || failed) return;
    try {
      const url = new URL(scope.location.href);
      url.hash = fragment;
      if (url.href === currentPage?.url) return;
      const referrer = currentPage?.url ?? document?.referrer ?? '';
      currentPage = { url: url.href, referrer };
      send(snapshot());
    } catch {
      /* Invalid browser context must never prevent rendering. */
    }
  };
  return track;
}
