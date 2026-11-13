import { createResultRules } from '@playground/game-sdk/rules';
import { BEE_ORBIT } from './course.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: BEE_ORBIT.total * BEE_ORBIT.score,
  increment: BEE_ORBIT.score,
  counters: { progress: BEE_ORBIT.total, lives: BEE_ORBIT.lives },
  labels: { progress: '采到花粉数' },
  check: (result) =>
    result.score === result.progress * BEE_ORBIT.score &&
    result.won === (result.progress === BEE_ORBIT.total && result.lives > 0) &&
    (result.won || result.lives === 0 || result.elapsed >= BEE_ORBIT.limit) &&
    (result.progress === 0 || result.elapsed + 0.02 >= result.progress * 1.15),
});
