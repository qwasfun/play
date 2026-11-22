import { createResultRules } from '@playground/game-sdk/rules';
import { PETAL_FOLD } from './course.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: PETAL_FOLD.rounds * PETAL_FOLD.score,
  increment: PETAL_FOLD.score,
  counters: { rounds: PETAL_FOLD.rounds },
  labels: { rounds: '展开花笺数' },
  check: (result) =>
    result.score === result.rounds * PETAL_FOLD.score &&
    result.won === (result.rounds === PETAL_FOLD.rounds) &&
    (result.won || result.elapsed >= PETAL_FOLD.limit - 0.05),
});
