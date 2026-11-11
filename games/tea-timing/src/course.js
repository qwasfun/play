import { rng } from '@playground/game-sdk';

export const TEA_TIMING = Object.freeze({ rounds: 12, limit: 75, zone: [0.62, 0.82] });

export function generateCourse(seed) {
  const random = rng(`${seed}:tea-timing:v1`);
  let previous = -1;
  return Array.from({ length: TEA_TIMING.rounds }, (_, index) => {
    let station = Math.floor(random() * 3);
    if (station === previous) station = (station + 1 + Math.floor(random() * 2)) % 3;
    previous = station;
    return {
      station,
      duration: Number((1.45 + random() * 0.65 - Math.min(index, 8) * 0.025).toFixed(3)),
    };
  });
}
