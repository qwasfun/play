import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 1200,
  increment: 100,
  counters: { passed: 12, lives: 3 },
  check: (r) => r.score === r.passed * 100 && r.won === (r.passed === 12),
});
