import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
import { MIRROR_BLOOM } from './puzzles.js';

export const rules = createResultRules({
  manifest,
  cap: MIRROR_BLOOM.rounds * MIRROR_BLOOM.score,
  increment: MIRROR_BLOOM.score,
  counters: { rounds: MIRROR_BLOOM.rounds },
  labels: { rounds: '完成花圃数' },
  check: (result) =>
    result.score === result.rounds * MIRROR_BLOOM.score &&
    result.won === (result.rounds === MIRROR_BLOOM.rounds) &&
    (result.won || result.elapsed >= MIRROR_BLOOM.limit - 0.05),
});
