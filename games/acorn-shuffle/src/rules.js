import { createResultRules } from '@playground/game-sdk/rules';
import { ACORN_SHUFFLE } from './course.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: ACORN_SHUFFLE.total * ACORN_SHUFFLE.score,
  increment: ACORN_SHUFFLE.score,
  counters: {
    progress: ACORN_SHUFFLE.total,
    attempts: ACORN_SHUFFLE.total,
    lives: ACORN_SHUFFLE.lives,
  },
  labels: { progress: '找对轮数', attempts: '已完成轮数' },
  check: (result) =>
    result.score === result.progress * ACORN_SHUFFLE.score &&
    result.lives === ACORN_SHUFFLE.lives - (result.attempts - result.progress) &&
    result.won ===
      (result.progress === ACORN_SHUFFLE.total &&
        result.attempts === ACORN_SHUFFLE.total &&
        result.lives > 0) &&
    (result.won ||
      result.lives === 0 ||
      result.attempts === ACORN_SHUFFLE.total ||
      result.elapsed + 0.02 >= ACORN_SHUFFLE.limit),
});
