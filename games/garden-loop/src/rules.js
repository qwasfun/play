import { createResultRules } from '@playground/game-sdk/rules';
import { GARDEN_LOOP } from './puzzles.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: 1200,
  increment: 400,
  counters: { rounds: GARDEN_LOOP.rounds },
  labels: { rounds: '完成花圃数' },
  check: (result) =>
    result.score === result.rounds * 400 &&
    result.won === (result.rounds === GARDEN_LOOP.rounds) &&
    (result.won || result.elapsed >= GARDEN_LOOP.limit - 0.05),
});
