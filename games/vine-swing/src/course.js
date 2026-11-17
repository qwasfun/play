import { rng } from '@playground/game-sdk';

export const VINE_SWING = Object.freeze({
  total: 10,
  lives: 3,
  limit: 75,
  score: 120,
  cycle: 1.4,
  flightTime: 0.52,
  resetTime: 0.56,
  initialPhase: 0.68,
});

export function releaseWindow(progress) {
  return Math.max(0.055, 0.095 - progress * 0.0045);
}

export function phaseDistance(phase, target) {
  const distance = Math.abs(phase - target) % 1;
  return Math.min(distance, 1 - distance);
}

export function timeToPhase(phase, target) {
  const distance = (target - phase + 1) % 1;
  return distance * VINE_SWING.cycle;
}

export function swingPoint(anchor, phase) {
  const angle = Math.sin(phase * Math.PI * 2) * 0.68;
  return {
    x: anchor.x + Math.sin(angle) * anchor.length,
    y: anchor.y + Math.cos(angle) * anchor.length,
  };
}

export function generateCourse(seed) {
  const random = rng(`${seed}:vine-swing:v1`);
  const anchors = [];
  let x = random() < 0.5 ? 165 : 435;
  let lastDirection = x < 300 ? 1 : -1;
  for (let index = 0; index <= VINE_SWING.total; index++) {
    anchors.push({
      x,
      y: 92 + Math.round(random() * 54),
      length: 122 + Math.round(random() * 32),
      flower: Math.floor(random() * 4),
    });
    if (index === VINE_SWING.total) break;
    let direction = random() < 0.7 ? -lastDirection : lastDirection;
    if (x < 205) direction = 1;
    if (x > 395) direction = -1;
    const distance = 128 + Math.round(random() * 42);
    x = Math.max(118, Math.min(482, x + direction * distance));
    lastDirection = direction;
  }
  const transfers = anchors.slice(0, -1).map((anchor, index) => ({
    anchor,
    next: anchors[index + 1],
    direction: anchors[index + 1].x > anchor.x ? 1 : -1,
    releasePhase: anchors[index + 1].x > anchor.x ? 0 : 0.5,
  }));
  return { anchors, transfers };
}
