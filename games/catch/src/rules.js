import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
import { generateHarvest } from './model.js';
export const rules = createResultRules({
  manifest,
  cap: 1000,
  increment: 10,
  counters: { lives: 3 },
  check: (r) => !r.won || r.elapsed >= manifest.limit - 0.05,
  seedCap: (seed) => generateHarvest(seed).filter((item) => item.type === 'fruit').length * 10,
});
