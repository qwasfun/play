// Public configuration only. Production API must use a same-site HTTPS subdomain
// (for example https://play-api.185036.xyz) so Strict cookies work reliably.
const local = ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname);
export const siteConfig = Object.freeze({
  leaderboardApi: local
    ? `${location.protocol}//${location.hostname}:8787`
    : 'https://play-api.185036.xyz',
  umami: {
    enabled: globalThis.location?.hostname === 'play.185036.xyz',
    scriptUrl: 'https://um.185036.xyz/script.js',
    websiteId: 'bb63e651-8401-482f-84dc-3beff0aac59e',
  },
});
