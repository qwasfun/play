import { createResultRules } from '@playground/game-sdk/rules';
import { GARDEN_PLOTS } from './puzzles.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: GARDEN_PLOTS.boards * GARDEN_PLOTS.score,
  increment: GARDEN_PLOTS.score,
  counters: {
    boards: GARDEN_PLOTS.boards,
    plots: GARDEN_PLOTS.boards * GARDEN_PLOTS.plotsPerBoard,
  },
  labels: { boards: '已整理花圃数', plots: '已落下花畦数' },
  check: (result) =>
    result.score === result.boards * GARDEN_PLOTS.score &&
    result.plots >= result.boards * GARDEN_PLOTS.plotsPerBoard &&
    result.plots <=
      result.boards * GARDEN_PLOTS.plotsPerBoard +
        (result.boards < GARDEN_PLOTS.boards ? GARDEN_PLOTS.plotsPerBoard : 0) &&
    result.won === (result.boards === GARDEN_PLOTS.boards) &&
    (result.won || result.elapsed >= GARDEN_PLOTS.limit - 0.05),
});
