import { createResultRules } from '@playground/game-sdk/rules';
import { DEW_HOP } from './course.js';
import { manifest } from './manifest.js';

export const rules = createResultRules({
  manifest,
  cap: DEW_HOP.total * DEW_HOP.score,
  increment: DEW_HOP.score,
  counters: { progress: DEW_HOP.total, lives: DEW_HOP.lives },
  labels: { progress: '完成跳跃数' },
  check: (result) =>
    result.score === result.progress * DEW_HOP.score &&
    result.won === (result.progress === DEW_HOP.total && result.lives > 0) &&
    (result.won || result.lives === 0 || result.elapsed >= DEW_HOP.limit) &&
    (result.progress === 0 || result.elapsed + 0.02 >= result.progress * DEW_HOP.revealTime),
});
