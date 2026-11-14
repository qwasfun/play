import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
import { FLOWER_LATIN } from './puzzles.js';

export const rules = createResultRules({
  manifest,
  cap: 1200,
  increment: 400,
  counters: { rounds: FLOWER_LATIN.rounds },
  labels: { rounds: '完成花笺数' },
  check: (result) =>
    result.score === result.rounds * 400 &&
    result.won === (result.rounds === FLOWER_LATIN.rounds) &&
    (result.won || result.elapsed >= FLOWER_LATIN.limit - 0.05),
});
