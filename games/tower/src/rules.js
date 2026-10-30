import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 1800,
  increment: 50,
  counters: { level: 12, lives: 3 },
  check: (r) => r.score >= r.level * 100 && r.score <= r.level * 150 && r.won === (r.level === 12),
});
