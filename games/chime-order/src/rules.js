import { createResultRules } from '@playground/game-sdk/rules';
import { CHIME_ORDER } from './puzzles.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: 1200,
  increment: 400,
  counters: { rounds: CHIME_ORDER.rounds },
  labels: { rounds: '完成旋律数' },
  check: (result) =>
    result.score === result.rounds * 400 &&
    result.won === (result.rounds === CHIME_ORDER.rounds) &&
    (result.won || result.elapsed >= CHIME_ORDER.limit - 0.05),
});
