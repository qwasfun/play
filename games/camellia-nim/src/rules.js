import { createResultRules } from '@playground/game-sdk/rules';
import { CAMELLIA_NIM } from './strategy.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: CAMELLIA_NIM.gardens * CAMELLIA_NIM.score,
  increment: CAMELLIA_NIM.score,
  counters: { gardens: CAMELLIA_NIM.gardens, wins: CAMELLIA_NIM.gardens, turns: 36 },
  labels: { gardens: '完成的花园数', wins: '赢下的花园数', turns: '玩家行动数' },
  check: (result) =>
    result.score === result.wins * CAMELLIA_NIM.score &&
    result.wins <= result.gardens &&
    result.won ===
      (result.gardens === CAMELLIA_NIM.gardens && result.wins === CAMELLIA_NIM.gardens) &&
    (result.gardens === CAMELLIA_NIM.gardens || result.elapsed >= CAMELLIA_NIM.limit - 0.05),
});
