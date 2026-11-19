import { createResultRules } from '@playground/game-sdk/rules';
import { TWIN_FIREFLIES } from './course.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: TWIN_FIREFLIES.total * TWIN_FIREFLIES.score,
  increment: TWIN_FIREFLIES.score,
  counters: {
    progress: TWIN_FIREFLIES.total,
    gates: TWIN_FIREFLIES.total,
    lives: TWIN_FIREFLIES.lives,
  },
  labels: { progress: '成功穿越数', gates: '已抵达花门数' },
  check: (result) =>
    result.score === result.progress * TWIN_FIREFLIES.score &&
    result.lives === TWIN_FIREFLIES.lives - (result.gates - result.progress) &&
    result.won ===
      (result.progress === TWIN_FIREFLIES.total &&
        result.gates === TWIN_FIREFLIES.total &&
        result.lives > 0) &&
    (result.won ||
      result.lives === 0 ||
      result.gates === TWIN_FIREFLIES.total ||
      result.elapsed + 0.02 >= TWIN_FIREFLIES.limit),
});
