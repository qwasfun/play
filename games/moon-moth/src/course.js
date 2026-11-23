import { rng } from '@playground/game-sdk';

export const MOON_MOTH = Object.freeze({
  total: 15,
  lives: 3,
  limit: 50,
  score: 100,
  firstGate: 3,
  gateInterval: 2.55,
  travelTime: 2.15,
  startLane: 1,
});

export const LANE_Y = Object.freeze([164, 258, 352]);

export function generateCourse(seed) {
  const random = rng(`${seed}:moon-moth:v1`);
  const gates = [];
  let previous = MOON_MOTH.startLane;
  const used = new Set();
  for (let index = 0; index < MOON_MOTH.total; index++) {
    let lane = Math.floor(random() * 3);
    if (lane === previous && index % 3 !== 2) lane = (lane + 1 + Math.floor(random() * 2)) % 3;
    if (index >= MOON_MOTH.total - 2 && used.size < 3) {
      lane = [0, 1, 2].find((candidate) => !used.has(candidate));
    }
    used.add(lane);
    gates.push({
      index,
      lane,
      at: MOON_MOTH.firstGate + index * MOON_MOTH.gateInterval,
      flower: Math.floor(random() * 4),
    });
    previous = lane;
  }
  return { gates };
}
