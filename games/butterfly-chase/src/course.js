import { rng } from '@playground/game-sdk';

export const BUTTERFLY_CHASE = Object.freeze({
  total: 12,
  butterflies: 5,
  lives: 3,
  limit: 75,
  catchRadius: 38,
  netSpeed: 310,
  bloomTime: 0.42,
  resetTime: 0.62,
});

export const TRAITS = Object.freeze([
  Object.freeze({ id: 0, name: '桃粉点翅', color: '#d98278', accent: '#fff1cf', mark: 'dot' }),
  Object.freeze({ id: 1, name: '桂金横纹', color: '#d2a348', accent: '#fff5c8', mark: 'stripe' }),
  Object.freeze({ id: 2, name: '青叶月纹', color: '#759b7b', accent: '#e8f0d8', mark: 'moon' }),
  Object.freeze({ id: 3, name: '雾蓝点翅', color: '#6f99aa', accent: '#e8f4ef', mark: 'dot' }),
  Object.freeze({ id: 4, name: '藤紫横纹', color: '#8d7fa4', accent: '#f4e8d3', mark: 'stripe' }),
]);

const anchors = Object.freeze([
  Object.freeze({ x: 126, y: 155 }),
  Object.freeze({ x: 300, y: 140 }),
  Object.freeze({ x: 474, y: 178 }),
  Object.freeze({ x: 188, y: 304 }),
  Object.freeze({ x: 414, y: 302 }),
]);

export const responseWindow = (progress) => Math.max(2.8, 4.8 - progress * 0.14);

export function generateGarden(seed, progress) {
  const random = rng(`${seed}:butterfly-chase:v1:${progress}`);
  const traitOrder = TRAITS.map(({ id }) => id);
  for (let index = traitOrder.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [traitOrder[index], traitOrder[target]] = [traitOrder[target], traitOrder[index]];
  }
  const target = traitOrder[Math.floor(random() * traitOrder.length)];
  const butterflies = anchors.map((anchor, index) => {
    const direction = random() < 0.5 ? -1 : 1;
    return {
      id: traitOrder[index],
      x: anchor.x + (random() - 0.5) * 22,
      y: anchor.y + (random() - 0.5) * 18,
      vx: direction * (34 + random() * 26),
      vy: (random() - 0.5) * 44,
    };
  });
  return { target, butterflies };
}
