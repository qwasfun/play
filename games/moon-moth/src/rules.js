import { createResultRules } from '@playground/game-sdk/rules';
import { MOON_MOTH } from './course.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: MOON_MOTH.total * MOON_MOTH.score,
  increment: MOON_MOTH.score,
  counters: {
    progress: MOON_MOTH.total,
    gates: MOON_MOTH.total,
    lives: MOON_MOTH.lives,
  },
  labels: { progress: '追上灯数', gates: '已抵达光门数' },
  check: (result) =>
    result.score === result.progress * MOON_MOTH.score &&
    result.lives === MOON_MOTH.lives - (result.gates - result.progress) &&
    result.won ===
      (result.progress === MOON_MOTH.total &&
        result.gates === MOON_MOTH.total &&
        result.lives > 0) &&
    (result.won ||
      result.lives === 0 ||
      result.gates === MOON_MOTH.total ||
      result.elapsed + 0.02 >= MOON_MOTH.limit),
});
