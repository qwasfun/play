import { rng } from '@playground/game-sdk';
export const FLIGHT = Object.freeze({
  x: 140,
  speed: 145,
  lift: 180,
  radius: 13,
  halfGap: 72,
  first: 650,
  spacing: 2.7,
  total: 12,
  limit: 60,
  top: 82,
  bottom: 394,
});
export function generateCourse(seed) {
  const random = rng(`${seed}:kite:v1`);
  return Array.from({ length: FLIGHT.total }, (_, index) => ({
    index,
    base: 150 + random() * 176,
    phase: random() * Math.PI * 2,
    amplitude: 18 + random() * 10,
    spawn: index * FLIGHT.spacing,
  }));
}
export const passTime = (ring) => (FLIGHT.first - FLIGHT.x) / FLIGHT.speed + ring.spawn;
export const ringCenter = (ring, time) =>
  ring.base + Math.sin(time * 0.9 + ring.phase) * ring.amplitude;
export const ringX = (ring, time) => FLIGHT.first - (time - ring.spawn) * FLIGHT.speed;
export const fitsRing = (y, center) =>
  Number.isFinite(y) && Math.abs(y - center) + FLIGHT.radius <= FLIGHT.halfGap;
