import { createResultRules } from '@playground/game-sdk/rules';
import { BUTTERFLY_CHASE } from './course.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: BUTTERFLY_CHASE.total * 100,
  increment: 100,
  counters: { progress: BUTTERFLY_CHASE.total, lives: BUTTERFLY_CHASE.lives },
  labels: { progress: '捕捉蝶影数' },
  check: (result) =>
    result.score === result.progress * 100 &&
    result.won === (result.progress === BUTTERFLY_CHASE.total && result.lives > 0) &&
    (result.won || result.lives === 0 || result.elapsed >= BUTTERFLY_CHASE.limit) &&
    (result.progress === 0 || result.elapsed + 0.02 >= result.progress * 0.35),
});
