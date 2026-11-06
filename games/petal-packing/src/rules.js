import { createResultRules } from '@playground/game-sdk/rules';
import { PETAL_PACKING } from './puzzles.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: 1200,
  increment: 400,
  counters: { rounds: PETAL_PACKING.rounds, steps: 100000 },
  labels: { rounds: '完成花匣数', steps: '摆放与旋转次数' },
  check: (result) =>
    result.score === result.rounds * 400 &&
    result.won === (result.rounds === PETAL_PACKING.rounds) &&
    (!result.won || result.steps >= PETAL_PACKING.rounds * PETAL_PACKING.pieces) &&
    (result.won || result.elapsed >= PETAL_PACKING.limit - 0.05),
});
