import { rng } from '@playground/game-sdk';

const BASE = Object.freeze([1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1]);
const CLUES = Object.freeze([
  Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 9, 10]),
  Object.freeze([0, 2, 5, 7, 8, 10, 13, 15]),
  Object.freeze([0, 1, 2, 4, 6, 8, 9]),
]);

const shuffled = (values, random) => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

function axisOrder(random) {
  const bands = shuffled([0, 1], random);
  return bands.flatMap((band) => shuffled([0, 1], random).map((within) => band * 2 + within));
}

export function generatePuzzle(seed, round = 0) {
  if (!Number.isInteger(round) || round < 0 || round > 2) throw Error('茶席轮次：必须是 0–2');
  const random = rng(`${seed}:tea-grid:v1:${round}`),
    rows = axisOrder(random),
    columns = axisOrder(random),
    symbols = shuffled([1, 2, 3, 4], random),
    transpose = random() < 0.5,
    clueSet = new Set(CLUES[round]),
    solution = [],
    fixed = [];
  for (let row = 0; row < 4; row++)
    for (let column = 0; column < 4; column++) {
      const source = transpose ? columns[column] * 4 + rows[row] : rows[row] * 4 + columns[column];
      solution.push(symbols[BASE[source] - 1]);
      fixed.push(clueSet.has(source));
    }
  return {
    solution,
    fixed,
    board: solution.map((value, index) => (fixed[index] ? value : 0)),
  };
}

export function conflictCells(board) {
  const conflicts = new Set();
  const groups = [];
  for (let i = 0; i < 4; i++) {
    groups.push([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3]);
    groups.push([i, i + 4, i + 8, i + 12]);
  }
  for (const top of [0, 2, 8, 10]) groups.push([top, top + 1, top + 4, top + 5]);
  for (const group of groups) {
    const seen = new Map();
    for (const index of group) {
      const value = board[index];
      if (!Number.isInteger(value) || value < 1 || value > 4) continue;
      const previous = seen.get(value);
      if (previous === undefined) seen.set(value, index);
      else {
        conflicts.add(previous);
        conflicts.add(index);
      }
    }
  }
  return conflicts;
}

export const isSolved = (board) =>
  Array.isArray(board) &&
  board.length === 16 &&
  board.every((value) => Number.isInteger(value) && value >= 1 && value <= 4) &&
  conflictCells(board).size === 0;
