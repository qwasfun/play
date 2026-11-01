import { rng } from '@playground/game-sdk';

export const SWIPE = Object.freeze({
  total: 20,
  lives: 4,
  limit: 60,
  minDistance: 38,
});
export const DIRECTIONS = Object.freeze(['up', 'right', 'down', 'left']);

export function generateDeck(seed) {
  const random = rng(`${seed}:petal-swipe:v1`);
  const deck = [];
  for (let group = 0; group < SWIPE.total / DIRECTIONS.length; group++) {
    const batch = [...DIRECTIONS];
    for (let index = batch.length - 1; index > 0; index--) {
      const target = Math.floor(random() * (index + 1));
      [batch[index], batch[target]] = [batch[target], batch[index]];
    }
    if (deck.length && batch[0] === deck[deck.length - 1]) {
      const target = batch.findIndex((direction) => direction !== batch[0]);
      [batch[0], batch[target]] = [batch[target], batch[0]];
    }
    deck.push(...batch);
  }
  return deck;
}

export const responseWindow = (index) => Math.max(1.05, 1.7 - index * 0.03);

export function swipeDirection(start, end) {
  if (
    !start ||
    !end ||
    !Number.isFinite(start.x) ||
    !Number.isFinite(start.y) ||
    !Number.isFinite(end.x) ||
    !Number.isFinite(end.y)
  )
    return null;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.hypot(dx, dy) < SWIPE.minDistance) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
