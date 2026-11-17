import { createResultRules } from '@playground/game-sdk/rules';
import { VINE_SWING } from './course.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: VINE_SWING.total * VINE_SWING.score,
  increment: VINE_SWING.score,
  counters: { progress: VINE_SWING.total, lives: VINE_SWING.lives },
  labels: { progress: '完成接力数' },
  check: (result) =>
    result.score === result.progress * VINE_SWING.score &&
    result.won === (result.progress === VINE_SWING.total && result.lives > 0) &&
    (result.won || result.lives === 0 || result.elapsed + 0.02 >= VINE_SWING.limit) &&
    (result.progress === 0 || result.elapsed + 0.02 >= result.progress * VINE_SWING.flightTime),
});
