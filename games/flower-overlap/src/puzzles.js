export const FLOWER_OVERLAP = {
  size: 4,
  layers: 3,
  rounds: 4,
  score: 300,
  limit: 150,
  transition: 0.6,
};

const TEMPLATES = [
  [
    [0, 1, 4, 8],
    [1, 4, 5, 6, 9],
    [2, 3, 5, 9, 10, 14],
  ],
  [
    [0, 4, 5, 9],
    [1, 2, 6, 9, 10],
    [3, 6, 7, 10, 13, 14],
  ],
  [
    [1, 4, 5, 8],
    [2, 5, 6, 7, 11],
    [0, 3, 4, 8, 9, 13],
  ],
  [
    [2, 5, 6, 10],
    [0, 1, 4, 8, 12],
    [3, 6, 7, 9, 10, 13],
  ],
];

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

export function rotateCell(index, turns = 1, size = FLOWER_OVERLAP.size) {
  if (!Number.isInteger(index) || index < 0 || index >= size * size)
    throw new Error('窗格位置超出花影范围');
  let row = Math.floor(index / size);
  let column = index % size;
  const count = ((turns % 4) + 4) % 4;
  for (let turn = 0; turn < count; turn++) [row, column] = [column, size - 1 - row];
  return row * size + column;
}

export function rotateMask(mask, turns = 1) {
  return [...new Set(mask.map((index) => rotateCell(index, turns)))].sort((a, b) => a - b);
}

export function combineLayers(masks, rotations) {
  if (masks.length !== FLOWER_OVERLAP.layers || rotations.length !== FLOWER_OVERLAP.layers)
    throw new Error('花影必须恰好包含三层');
  const counts = Array(FLOWER_OVERLAP.size ** 2).fill(0);
  masks.forEach((mask, layer) => {
    rotateMask(mask, rotations[layer]).forEach((index) => counts[index]++);
  });
  return counts;
}

export const mosaicKey = (counts) => counts.join('');

export function solutionsFor(masks, target) {
  const key = mosaicKey(target);
  const solutions = [];
  for (let a = 0; a < 4; a++)
    for (let b = 0; b < 4; b++)
      for (let c = 0; c < 4; c++) {
        const rotations = [a, b, c];
        if (mosaicKey(combineLayers(masks, rotations)) === key) solutions.push(rotations);
      }
  return solutions;
}

function uniqueCandidates(masks) {
  const byMosaic = new Map();
  for (let a = 0; a < 4; a++)
    for (let b = 0; b < 4; b++)
      for (let c = 0; c < 4; c++) {
        const rotations = [a, b, c];
        const key = mosaicKey(combineLayers(masks, rotations));
        const entries = byMosaic.get(key) || [];
        entries.push(rotations);
        byMosaic.set(key, entries);
      }
  return [...byMosaic.entries()]
    .filter(([, entries]) => entries.length === 1)
    .map(([key, [solution]]) => ({ key, solution }));
}

export function generateRounds(seed) {
  const next = random(seed);
  return TEMPLATES.map((template, index) => {
    const masks = template.map((mask) => [...mask]);
    const candidates = uniqueCandidates(masks);
    if (!candidates.length) throw new Error(`第 ${index + 1} 扇花窗没有唯一叠法`);
    const chosen = candidates[Math.floor(next() * candidates.length)];
    const solution = [...chosen.solution];
    const initial = solution.map((turn, layer) => (turn + 1 + ((index + layer) % 3)) % 4);
    if (mosaicKey(combineLayers(masks, initial)) === chosen.key) initial[0] = (initial[0] + 1) % 4;
    return {
      masks,
      solution,
      initial,
      target: combineLayers(masks, solution),
    };
  });
}
