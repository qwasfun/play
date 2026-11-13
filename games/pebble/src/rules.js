import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 480,
  counters: { rounds: 3, cleared: 18 },
  check: (r) => r.score === r.cleared * 10 + r.rounds * 100 && r.won === (r.rounds === 3),
});
