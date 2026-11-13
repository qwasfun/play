import { createResultRules } from '@playground/game-sdk/rules';
import { LEAF_KEEPER } from './course.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: LEAF_KEEPER.targets * 100,
  increment: 100,
  counters: { progress: LEAF_KEEPER.targets, lives: LEAF_KEEPER.lives },
  labels: { progress: '接住花粉光数' },
  check: (result) =>
    result.score === result.progress * 100 &&
    result.won === (result.progress === LEAF_KEEPER.targets && result.lives > 0) &&
    (result.won || result.lives === 0 || result.elapsed >= LEAF_KEEPER.limit) &&
    (result.progress === 0 || result.elapsed + 0.02 >= result.progress * 0.04),
});
