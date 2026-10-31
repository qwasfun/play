import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: 300,
  increment: 100,
  counters: { rounds: 3, steps: 100000 },
  check: (result) =>
    result.score === result.rounds * 100 &&
    result.won === (result.rounds === 3) &&
    (!result.won || result.steps >= 23),
});
