import { rng } from '@playground/game-sdk';

export const BEE_ORBIT = Object.freeze({
  total: 12,
  lives: 3,
  limit: 60,
  score: 100,
  angularSpeed: 1.36,
  bloomTime: 0.3,
  resetTime: 0.44,
});

export const LANES = Object.freeze([
  { name: '内环', radius: 104, color: '#d88a72', mark: '圆蕊' },
  { name: '外环', radius: 157, color: '#6f9c7c', mark: '叶纹' },
]);

export function gateWindow(progress) {
  return Math.max(1.68, 2.42 - progress * 0.055);
}

export function generateGates(seed) {
  const random = rng(`${seed}:bee-orbit:v1`);
  const gates = [];
  for (let block = 0; block < BEE_ORBIT.total / 4; block++) {
    const lanes = [0, 0, 1, 1];
    for (let index = lanes.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [lanes[index], lanes[other]] = [lanes[other], lanes[index]];
    }
    if (gates.length && lanes[0] === gates.at(-1).lane) {
      const different = lanes.findIndex((lane) => lane !== lanes[0]);
      [lanes[0], lanes[different]] = [lanes[different], lanes[0]];
    }
    for (const lane of lanes) gates.push({ lane, petal: Math.floor(random() * 4) });
  }
  return gates;
}
