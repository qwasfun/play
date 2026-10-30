import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 420,
  increment: 0,
  counters: { steps: 100000 },
  check: (r) =>
    r.won ? r.score === 300 + Math.max(0, 120 - r.steps * 2) : r.score <= 160 && r.score % 10 === 0,
});
