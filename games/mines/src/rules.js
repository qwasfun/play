import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 480,
  increment: 0,
  counters: { opened: 13 },
  check: (r) =>
    r.won
      ? r.opened === 13 && r.score === 300 + Math.max(0, 180 - Math.ceil(r.elapsed))
      : r.opened < 13 && r.score === r.opened * 20,
});
