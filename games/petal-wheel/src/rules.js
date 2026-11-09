import { createResultRules } from '@playground/game-sdk/rules';
import { PETAL_WHEEL } from './course.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: PETAL_WHEEL.total * PETAL_WHEEL.score,
  increment: PETAL_WHEEL.score,
  counters: { progress: PETAL_WHEEL.total, lives: PETAL_WHEEL.lives },
  labels: { progress: '接住露珠数' },
  check: (result) =>
    result.score === result.progress * PETAL_WHEEL.score &&
    result.won === (result.progress === PETAL_WHEEL.total && result.lives > 0) &&
    (result.won || result.lives === 0 || result.elapsed >= PETAL_WHEEL.limit) &&
    (result.progress === 0 || result.elapsed + 0.02 >= result.progress * 0.75),
});
