import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 240,
  increment: 10,
  counters: { lives: 3 },
  check: (r) => r.won === (r.score === 240),
});
