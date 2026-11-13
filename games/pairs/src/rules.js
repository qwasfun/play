import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 720,
  increment: 0,
  counters: { steps: 100000 },
  check: (r) =>
    r.won
      ? r.steps >= 12 && r.score === 600 + Math.max(0, 120 - r.steps * 3)
      : r.score <= 500 && r.score % 100 === 0,
});
