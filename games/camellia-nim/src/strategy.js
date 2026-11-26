export const CAMELLIA_NIM = {
  gardens: 3,
  piles: 3,
  maxTake: 3,
  score: 400,
  limit: 150,
  hedgehogDelay: 0.62,
  transitionDelay: 0.72,
};

function hashSeed(seed) {
  let value = 2166136261;
  for (const character of String(seed)) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function random(seed) {
  let value = hashSeed(seed) || 1;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function positionValue(piles) {
  if (!Array.isArray(piles) || piles.length !== CAMELLIA_NIM.piles)
    throw new Error('茶花局面必须恰好有三丛');
  if (!piles.every((count) => Number.isInteger(count) && count >= 0))
    throw new Error('花瓣数量必须是非负整数');
  return piles.reduce((value, count) => value ^ (count % (CAMELLIA_NIM.maxTake + 1)), 0);
}

export function bestMove(piles) {
  const value = positionValue(piles);
  for (let pile = 0; pile < piles.length; pile++) {
    for (let take = 1; take <= Math.min(CAMELLIA_NIM.maxTake, piles[pile]); take++) {
      const next = [...piles];
      next[pile] -= take;
      if (value !== 0 && positionValue(next) === 0) return { pile, take };
    }
  }
  const pile = piles.findIndex((count) => count > 0);
  return pile < 0 ? null : { pile, take: 1 };
}

export function generateGardens(seed) {
  const next = random(seed);
  const gardens = [];
  const signatures = new Set();
  while (gardens.length < CAMELLIA_NIM.gardens) {
    const piles = Array.from({ length: CAMELLIA_NIM.piles }, () => 3 + Math.floor(next() * 5));
    const signature = piles.join(',');
    if (positionValue(piles) === 0 || signatures.has(signature)) continue;
    signatures.add(signature);
    gardens.push(piles);
  }
  return gardens;
}
