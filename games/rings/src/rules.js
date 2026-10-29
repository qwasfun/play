import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 800,
  increment: 100,
  counters: { progress: 8, lives: 3 },
  check: (r) => r.score === r.progress * 100 && r.won === (r.progress === 8),
});
