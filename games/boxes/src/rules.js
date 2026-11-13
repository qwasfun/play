import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 450,
  increment: 0,
  counters: { steps: 100000 },
  check: (r) =>
    r.won
      ? r.score === 300 + Math.max(0, 150 - r.steps * 3)
      : r.score <= 200 && r.score % 100 === 0,
});
