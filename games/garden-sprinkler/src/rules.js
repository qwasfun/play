import { createResultRules } from '@playground/game-sdk/rules';
import { GARDEN_SPRINKLER } from './course.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: GARDEN_SPRINKLER.rounds * GARDEN_SPRINKLER.score,
  increment: GARDEN_SPRINKLER.score,
  counters: { watered: GARDEN_SPRINKLER.rounds, shots: 40, lives: GARDEN_SPRINKLER.lives },
  labels: { watered: '浇开的花盆数', shots: '喷水次数', lives: '剩余叶子' },
  check: (result) =>
    result.score === result.watered * GARDEN_SPRINKLER.score &&
    result.shots >= result.watered &&
    result.shots <= result.watered + GARDEN_SPRINKLER.lives &&
    result.won === (result.watered === GARDEN_SPRINKLER.rounds) &&
    (result.won || result.lives === 0 || result.elapsed >= GARDEN_SPRINKLER.limit - 0.05),
});
