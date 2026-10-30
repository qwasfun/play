import {
  recordPolicy,
  cleanLevelResult,
  betterLevelResult,
  levelResultText,
} from '@playground/game-sdk/level';
import { games } from '@playground/game-registry';
export const CAMPAIGN_KEY = 'tiny-break-arcade:campaign:v1';
const supported = Object.fromEntries(
  games.filter((game) => game.campaign).map((game) => [game.id, game.campaign]),
);
const policy = (id) => recordPolicy(id, supported[id]);
export function campaignResultText(id, result) {
  return levelResultText(result, policy(id));
}
export function createCampaignStore(storage, onUnavailable = () => {}) {
  const data = { version: 1, games: {} };
  let warned = false;
  function warn() {
    if (!warned) {
      warned = true;
      onUnavailable();
    }
  }
  try {
    if (!storage) throw Error();
    storage.setItem(CAMPAIGN_KEY + ':probe', '1');
    storage.removeItem(CAMPAIGN_KEY + ':probe');
    const raw = storage.getItem(CAMPAIGN_KEY),
      parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.version === 1)
      for (const [id, meta] of Object.entries(supported)) {
        const entry = parsed.games?.[id];
        if (entry?.version !== meta.version) continue;
        const best = {};
        for (let n = 1; n <= meta.total; n++) {
          const record = cleanLevelResult(entry.best?.[n], policy(id));
          if (record) best[n] = record;
        }
        data.games[id] = { version: meta.version, best };
      }
  } catch (error) {
    if (!(error instanceof SyntaxError)) warn();
  }
  function progress(id) {
    const meta = supported[id];
    if (!meta) return { unlocked: 0, completed: 0, best: {} };
    const best = data.games[id]?.best || {};
    let unlocked = 1;
    while (unlocked < meta.total && best[unlocked]) unlocked++;
    return { unlocked, completed: Object.keys(best).length, best: { ...best } };
  }
  return {
    progress,
    record(id, version, number, result) {
      const meta = supported[id];
      if (
        !meta ||
        version !== meta.version ||
        !Number.isInteger(number) ||
        number < 1 ||
        number > meta.total ||
        number > progress(id).unlocked ||
        !cleanLevelResult(result, policy(id))
      )
        return false;
      const entry = (data.games[id] ||= { version, best: {} }),
        previous = entry.best[number],
        improved = betterLevelResult(result, previous, policy(id));
      if (improved) entry.best[number] = cleanLevelResult(result, policy(id));
      try {
        if (!storage) throw Error();
        storage.setItem(CAMPAIGN_KEY, JSON.stringify(data));
      } catch {
        warn();
      }
      return improved;
    },
  };
}
