import { createResultRules } from '@playground/game-sdk/rules';
import { GLOW_PATH } from './course.js';
import { manifest } from './manifest.js';

const total = GLOW_PATH.routes * GLOW_PATH.checkpoints;

export const rules = createResultRules({
  manifest,
  cap: total * 50,
  increment: 50,
  counters: { progress: total, rounds: GLOW_PATH.routes, lives: GLOW_PATH.lives },
  labels: { progress: '经过路标花数', rounds: '完成花径数' },
  check: (result) =>
    result.score === result.progress * 50 &&
    result.rounds === Math.floor(result.progress / GLOW_PATH.checkpoints) &&
    result.won ===
      (result.progress === total && result.rounds === GLOW_PATH.routes && result.lives > 0) &&
    (result.won || result.lives === 0 || result.elapsed >= GLOW_PATH.limit) &&
    (result.progress === 0 || result.elapsed + 0.02 >= result.progress * 0.04),
});
