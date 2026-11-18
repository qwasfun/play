import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
import { BROOK_BRIDGES } from './puzzles.js';

export const rules = createResultRules({
  manifest,
  cap: BROOK_BRIDGES.rounds * BROOK_BRIDGES.score,
  increment: BROOK_BRIDGES.score,
  counters: { rounds: BROOK_BRIDGES.rounds },
  labels: { rounds: '完成溪湾数' },
  check: (result) =>
    result.score === result.rounds * BROOK_BRIDGES.score &&
    result.won === (result.rounds === BROOK_BRIDGES.rounds) &&
    (result.won || result.elapsed >= BROOK_BRIDGES.limit - 0.05),
});
