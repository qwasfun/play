import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
import { FOREST_CAMP } from './puzzles.js';

export const rules = createResultRules({
  manifest,
  cap: FOREST_CAMP.rounds * FOREST_CAMP.score,
  increment: FOREST_CAMP.score,
  counters: { rounds: FOREST_CAMP.rounds },
  labels: { rounds: '完成营地图数' },
  check: (result) =>
    result.score === result.rounds * FOREST_CAMP.score &&
    result.won === (result.rounds === FOREST_CAMP.rounds) &&
    (result.won || result.elapsed >= FOREST_CAMP.limit - 0.05),
});
