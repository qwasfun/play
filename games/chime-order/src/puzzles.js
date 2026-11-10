import { rng } from '@playground/game-sdk';

export const CHIME_ORDER = Object.freeze({ size: 6, rounds: 3, limit: 150 });

const notes = Array.from({ length: CHIME_ORDER.size }, (_, index) => index + 1);

const shuffle = (values, random) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

export const isPermutation = (values) =>
  Array.isArray(values) &&
  values.length === CHIME_ORDER.size &&
  [...values].sort((a, b) => a - b).every((value, index) => value === notes[index]);

export function generatePuzzles(seed) {
  const random = rng(`${seed}:chime-order:v1`);
  return Array.from({ length: CHIME_ORDER.rounds }, () => {
    const target = shuffle(notes, random);
    let initial = shuffle(notes, random);
    for (let attempt = 0; attempt < 8; attempt++) {
      const misplaced = initial.filter((value, index) => value !== target[index]).length;
      if (misplaced >= 4) break;
      initial = shuffle(notes, random);
    }
    if (initial.every((value, index) => value === target[index]))
      [initial[0], initial[1]] = [initial[1], initial[0]];
    return {
      target,
      initial,
      intervals: target.slice(1).map((value, index) => value - target[index]),
    };
  });
}
