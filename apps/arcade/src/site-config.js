// Public configuration only. Production API must use a same-site HTTPS subdomain
// (for example https://play-api.185036.xyz) so Strict cookies work reliably.
const local = ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname);
export const siteConfig = Object.freeze({
  leaderboardApi: local
    ? `${location.protocol}//${location.hostname}:8787`
    : 'https://play-api.185036.xyz',
  umami: { scriptUrl: 'https://cloud.umami.is/script.js', websiteId: '' },
});
