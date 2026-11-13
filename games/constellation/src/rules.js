import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 700,
  increment: 20,
  counters: { steps: 100000 },
  check: (r) => !r.won || r.score === 700,
});
