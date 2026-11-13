import { createResultRules } from '@playground/game-sdk/rules';
import { TEA_TIMING } from './course.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: 1200,
  increment: 100,
  counters: { cups: TEA_TIMING.rounds, handled: TEA_TIMING.rounds, lives: 3 },
  labels: { cups: '候好茶壶数', handled: '已处理茶壶数', lives: '剩余机会' },
  check: (result) =>
    result.score === result.cups * 100 &&
    result.cups <= result.handled &&
    result.won === (result.cups === TEA_TIMING.rounds) &&
    (result.won ||
      result.lives === 0 ||
      result.handled === TEA_TIMING.rounds ||
      result.elapsed >= TEA_TIMING.limit - 0.05),
});
