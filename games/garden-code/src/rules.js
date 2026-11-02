import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: 1000,
  increment: 100,
  counters: { attempts: 8, exact: 4 },
  labels: { attempts: '猜测次数', exact: '位置正确数' },
  check: (result) =>
    result.score === (result.won ? 1100 - result.attempts * 100 : 0) &&
    result.won === (result.exact === 4) &&
    (!result.won || result.attempts >= 1) &&
    (result.won || result.attempts === 8 || result.elapsed >= 179.95),
});
