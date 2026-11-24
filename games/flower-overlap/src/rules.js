import { createResultRules } from '@playground/game-sdk/rules';
import { FLOWER_OVERLAP } from './puzzles.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: FLOWER_OVERLAP.rounds * FLOWER_OVERLAP.score,
  increment: FLOWER_OVERLAP.score,
  counters: { rounds: FLOWER_OVERLAP.rounds, turns: 120 },
  labels: { rounds: '复原花窗数', turns: '旋转次数' },
  check: (result) =>
    result.score === result.rounds * FLOWER_OVERLAP.score &&
    result.turns >= result.rounds &&
    result.won === (result.rounds === FLOWER_OVERLAP.rounds) &&
    (result.won || result.elapsed >= FLOWER_OVERLAP.limit - 0.05),
});
