import { createResultRules } from '@playground/game-sdk/rules';
import { FLOWER_PICROSS } from './puzzles.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: 1200,
  increment: 400,
  counters: { rounds: FLOWER_PICROSS.rounds },
  labels: { rounds: '完成花窗数' },
  check: (result) =>
    result.score === result.rounds * 400 &&
    result.won === (result.rounds === FLOWER_PICROSS.rounds) &&
    (result.won || result.elapsed >= FLOWER_PICROSS.limit - 0.05),
});
