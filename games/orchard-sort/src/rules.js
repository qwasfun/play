import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 300,
  counters: { rounds: 3, steps: 100000 },
  check: (r) =>
    r.score === r.rounds * 100 && r.won === (r.rounds === 3) && (!r.won || r.steps >= 3),
});
