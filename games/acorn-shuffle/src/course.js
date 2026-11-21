import { rng } from '@playground/game-sdk';

export const ACORN_SHUFFLE = Object.freeze({
  total: 12,
  lives: 3,
  limit: 70,
  score: 100,
  revealTime: 0.82,
  chooseTime: 3.4,
  feedbackTime: 0.56,
});

export const SLOT_X = Object.freeze([150, 300, 450]);

export function swapCount(round) {
  return 3 + Math.floor(round / 3);
}

export function swapDuration(round) {
  return Math.max(0.27, 0.5 - round * 0.018);
}

export function finalSlot(targetSlot, swaps) {
  const baskets = [0, 1, 2];
  const target = baskets[targetSlot];
  for (const [left, right] of swaps) {
    [baskets[left], baskets[right]] = [baskets[right], baskets[left]];
  }
  return baskets.indexOf(target);
}

export function generateRounds(seed) {
  const random = rng(`${seed}:acorn-shuffle:v1`);
  const pairs = [
    [0, 1],
    [1, 2],
    [0, 2],
  ];
  const rounds = [];
  for (let index = 0; index < ACORN_SHUFFLE.total; index++) {
    const targetSlot = Math.floor(random() * 3);
    const swaps = [];
    let previous = -1;
    for (let step = 0; step < swapCount(index); step++) {
      let pair = Math.floor(random() * pairs.length);
      if (pair === previous) pair = (pair + 1 + Math.floor(random() * 2)) % pairs.length;
      swaps.push([...pairs[pair]]);
      previous = pair;
    }
    rounds.push({
      index,
      targetSlot,
      swaps,
      finalSlot: finalSlot(targetSlot, swaps),
      leaf: Math.floor(random() * 4),
    });
  }
  return rounds;
}
