import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 600,
  counters: { lives: 3, handled: 24, hits: 24 },
  check: (r) =>
    r.score === r.hits * 25 &&
    r.hits <= r.handled + 1 &&
    (r.won ? r.handled === 24 && r.lives > 0 : r.lives === 0),
});
