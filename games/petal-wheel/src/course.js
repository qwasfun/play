import { rng } from '@playground/game-sdk';

export const PETAL_WHEEL = Object.freeze({
  total: 20,
  lives: 3,
  limit: 75,
  score: 60,
  bloomTime: 0.3,
  resetTime: 0.52,
});

export const PETALS = Object.freeze([
  { name: '桃红', color: '#d98278', accent: '#9d514c', mark: '圆点' },
  { name: '桂金', color: '#e4b653', accent: '#9c762c', mark: '双线' },
  { name: '竹青', color: '#79a58a', accent: '#416f58', mark: '叶脉' },
  { name: '兰紫', color: '#9b88ae', accent: '#685877', mark: '月牙' },
]);

export const DIRECTIONS = Object.freeze([
  { name: '上方', x: 0, y: -1 },
  { name: '右方', x: 1, y: 0 },
  { name: '下方', x: 0, y: 1 },
  { name: '左方', x: -1, y: 0 },
]);

export function responseWindow(progress) {
  return Math.max(1.05, 1.85 - progress * 0.035);
}

export function generateDrops(seed) {
  const random = rng(`${seed}:petal-wheel:v1`);
  const drops = [];
  let previousDirection = -1;
  let previousColor = -1;
  for (let index = 0; index < PETAL_WHEEL.total; index++) {
    let direction = Math.floor(random() * DIRECTIONS.length);
    let color = Math.floor(random() * PETALS.length);
    if (direction === previousDirection) direction = (direction + 1 + (index % 3)) % 4;
    if (color === previousColor) color = (color + 1 + (index % 2)) % 4;
    drops.push({ direction, color });
    previousDirection = direction;
    previousColor = color;
  }
  return drops;
}

export function colorAtDirection(rotation, direction) {
  return (((direction - rotation) % 4) + 4) % 4;
}
