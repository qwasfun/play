import { rng } from '@playground/game-sdk';

const SYMBOLS = Object.freeze([1, 2, 3, 4, 5]);

const shuffled = (values, random) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

export function generateSecret(seed) {
  const random = rng(`${seed}:garden-code:v1`);
  const secret = shuffled(SYMBOLS, random).slice(0, 3);
  secret.push(1 + Math.floor(random() * SYMBOLS.length));
  return shuffled(secret, random);
}

export function feedback(secret, guess) {
  if (!Array.isArray(secret) || !Array.isArray(guess) || secret.length !== 4 || guess.length !== 4)
    throw Error('花房暗语：暗语与猜测都必须包含四枚花印');
  let exact = 0;
  const secretCounts = new Map();
  const guessCounts = new Map();
  for (let index = 0; index < 4; index++) {
    if (secret[index] === guess[index]) exact++;
    else {
      secretCounts.set(secret[index], (secretCounts.get(secret[index]) || 0) + 1);
      guessCounts.set(guess[index], (guessCounts.get(guess[index]) || 0) + 1);
    }
  }
  let near = 0;
  for (const [symbol, count] of guessCounts) near += Math.min(count, secretCounts.get(symbol) || 0);
  return { exact, near };
}
