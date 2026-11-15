import { rng } from '@playground/game-sdk';

export const DEW_HOP = Object.freeze({
  total: 12,
  lives: 3,
  limit: 60,
  score: 100,
  revealTime: 0.34,
  hopTime: 0.28,
  resetTime: 0.42,
});

export const DIRECTIONS = Object.freeze([
  { name: '上方', arrow: '↑', key: 'ArrowUp', x: 300, y: 118, color: '#7fa987' },
  { name: '右方', arrow: '→', key: 'ArrowRight', x: 436, y: 246, color: '#8bb294' },
  { name: '下方', arrow: '↓', key: 'ArrowDown', x: 300, y: 374, color: '#79a386' },
  { name: '左方', arrow: '←', key: 'ArrowLeft', x: 164, y: 246, color: '#91b799' },
]);

export function responseWindow(progress) {
  return Math.max(0.88, 1.58 - progress * 0.055);
}

export function generateTargets(seed) {
  const random = rng(`${seed}:dew-hop:v1`);
  const targets = [];
  for (let block = 0; block < DEW_HOP.total / 4; block++) {
    const directions = [0, 1, 2, 3];
    for (let index = directions.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [directions[index], directions[other]] = [directions[other], directions[index]];
    }
    if (targets.length && directions[0] === targets.at(-1).direction) {
      const other = directions.findIndex((direction) => direction !== directions[0]);
      [directions[0], directions[other]] = [directions[other], directions[0]];
    }
    for (const direction of directions) targets.push({ direction, leaf: Math.floor(random() * 4) });
  }
  return targets;
}
