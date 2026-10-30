import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 500,
  counters: { handled: 5, lives: 3 },
  check: (r) => r.score === r.handled * 100 && r.won === (r.handled === 5),
});
