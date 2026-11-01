import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
import { SWIPE } from './deck.js';

export const rules = createResultRules({
  manifest,
  cap: 2000,
  increment: 100,
  counters: { correct: SWIPE.total, handled: SWIPE.total, lives: SWIPE.lives },
  labels: { correct: '划对花笺数', handled: '处理花笺数' },
  check: (result) =>
    result.score === result.correct * 100 &&
    result.correct <= result.handled &&
    result.lives === SWIPE.lives - (result.handled - result.correct) &&
    result.won === (result.handled === SWIPE.total && result.lives > 0) &&
    (result.won || result.lives === 0 || result.elapsed >= SWIPE.limit) &&
    result.elapsed + 0.02 >= result.handled * 0.08,
});
