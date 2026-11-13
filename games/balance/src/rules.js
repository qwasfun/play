import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 500,
  counters: { rounds: 5 },
  check: (r) => r.score === r.rounds * 100 && r.won === (r.rounds === 5),
});
