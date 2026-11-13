import { rng } from '@playground/game-sdk';

export const LEAF_KEEPER = Object.freeze({
  targets: 12,
  lives: 3,
  limit: 60,
  speed: 0.72,
  targetRadius: 0.1,
  targetTime: 4.5,
  bloomTime: 0.32,
  resetTime: 0.6,
  edge: 1.04,
});

export function generateTargets(seed) {
  const random = rng(`${seed}:leaf-keeper:v1`);
  const firstSign = random() < 0.5 ? -1 : 1;
  return Array.from({ length: LEAF_KEEPER.targets }, (_, index) => {
    const sign = index % 2 ? -firstSign : firstSign;
    return sign * (0.28 + random() * 0.5);
  });
}
