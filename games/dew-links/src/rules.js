import { createResultRules } from '@playground/game-sdk/rules';
import { DEW_LINKS } from './puzzles.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: 1200,
  increment: 400,
  counters: { paths: DEW_LINKS.rounds * DEW_LINKS.pairs, rounds: DEW_LINKS.rounds },
  labels: { paths: '完成露珠小径数', rounds: '完成花圃数' },
  check: (result) =>
    result.score === result.rounds * 400 &&
    result.paths === result.rounds * DEW_LINKS.pairs &&
    result.won === (result.rounds === DEW_LINKS.rounds) &&
    (result.won || result.elapsed >= DEW_LINKS.limit - 0.05),
});
