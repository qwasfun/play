import { rng } from '@playground/game-sdk';

export const GLOW_PATH = Object.freeze({
  routes: 3,
  checkpoints: 8,
  lives: 3,
  limit: 90,
  speed: 190,
  widths: Object.freeze([54, 48, 42]),
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function generateRoutes(seed) {
  const random = rng(`${seed}:glow-path:v1`);
  return Array.from({ length: GLOW_PATH.routes }, (_, route) => {
    const leftToRight = route % 2 === 0;
    const points = [];
    let y = 126 + random() * 228;
    for (let index = 0; index <= GLOW_PATH.checkpoints; index++) {
      if (index) y = clamp(y + (random() - 0.5) * (138 - route * 10), 104, 366);
      const x = 58 + (484 * index) / GLOW_PATH.checkpoints;
      points.push({ x: leftToRight ? x : 600 - x, y });
    }
    return { points, radius: GLOW_PATH.widths[route] };
  });
}

export function distanceToSegment(point, from, to) {
  if (![point, from, to].every((value) => Number.isFinite(value?.x) && Number.isFinite(value?.y)))
    return Infinity;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const amount = lengthSquared
    ? clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared, 0, 1)
    : 0;
  return Math.hypot(from.x + amount * dx - point.x, from.y + amount * dy - point.y);
}
