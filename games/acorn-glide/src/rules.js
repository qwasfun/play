import { createResultRules } from '@playground/game-sdk/rules';
import { ACORN_GLIDE } from './course.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: ACORN_GLIDE.shots * ACORN_GLIDE.bullScore,
  increment: ACORN_GLIDE.ringScore,
  counters: { shots: ACORN_GLIDE.shots, rings: ACORN_GLIDE.shots, bullseyes: ACORN_GLIDE.shots },
  labels: { shots: '已滑出的松果数', rings: '进入花环数', bullseyes: '进入花心数' },
  check: (result) =>
    result.score ===
      result.bullseyes * ACORN_GLIDE.bullScore +
        (result.rings - result.bullseyes) * ACORN_GLIDE.ringScore &&
    result.bullseyes <= result.rings &&
    result.rings <= result.shots &&
    result.won === (result.shots === ACORN_GLIDE.shots && result.bullseyes === ACORN_GLIDE.shots) &&
    (result.shots === ACORN_GLIDE.shots || result.elapsed >= ACORN_GLIDE.limit - 0.05),
});
