import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
export const rules = createResultRules({
  manifest,
  cap: 100000,
  increment: 0,
  counters: { steps: 100000 },
  check: (r) => r.score === r.steps,
  compare: (next, previous) => {
    if (next.won !== previous.won) return next.won;
    if (!next.won) return false;
    return (
      next.steps < previous.steps ||
      (next.steps === previous.steps && next.elapsed < previous.elapsed)
    );
  },
  format: (r) => (r.won ? `${r.steps} 步 · ${Math.ceil(r.elapsed)} 秒` : '已尝试，等待点亮灵感'),
  stored: (r) => Number.isInteger(r.steps) && r.steps >= 0,
  ranking: { field: 'steps', sign: 1, requiresWin: true },
});
