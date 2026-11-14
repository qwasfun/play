import { rng } from '@playground/game-sdk';

export const FLOWER_LATIN = Object.freeze({ size: 4, rounds: 3, limit: 180 });

const NAMES = Object.freeze(['晨露笺', '桂香笺', '晚霞笺', '青叶笺', '月白笺', '蜜金笺']);

function shuffled(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function candidates(board, index) {
  const row = Math.floor(index / FLOWER_LATIN.size);
  const column = index % FLOWER_LATIN.size;
  const used = new Set();
  for (let step = 0; step < FLOWER_LATIN.size; step++) {
    used.add(board[row * FLOWER_LATIN.size + step]);
    used.add(board[step * FLOWER_LATIN.size + column]);
  }
  return [1, 2, 3, 4].filter((value) => !used.has(value));
}

export function countSolutions(givens, limit = 2) {
  const board = [...givens];
  let found = 0;
  const search = () => {
    if (found >= limit) return;
    let target = -1;
    let choices = null;
    for (let index = 0; index < board.length; index++) {
      if (board[index]) continue;
      const available = candidates(board, index);
      if (!available.length) return;
      if (!choices || available.length < choices.length) {
        target = index;
        choices = available;
      }
    }
    if (target < 0) {
      found++;
      return;
    }
    for (const value of choices) {
      board[target] = value;
      search();
      board[target] = 0;
      if (found >= limit) return;
    }
  };
  search();
  return found;
}

function makeSolution(random) {
  const rows = shuffled([0, 1, 2, 3], random);
  const columns = shuffled([0, 1, 2, 3], random);
  const symbols = shuffled([1, 2, 3, 4], random);
  return rows.flatMap((row) => columns.map((column) => symbols[(row + column) % 4]));
}

function makePuzzle(random, name) {
  const solution = makeSolution(random);
  const givens = [...solution];
  let blanks = 0;
  for (const index of shuffled(
    Array.from({ length: 16 }, (_, value) => value),
    random,
  )) {
    const value = givens[index];
    givens[index] = 0;
    if (countSolutions(givens) === 1) blanks++;
    else givens[index] = value;
    if (blanks === 9) break;
  }
  return { name, givens, solution };
}

export function generatePuzzles(seed) {
  const random = rng(`${seed}:flower-latin:v1`);
  const names = shuffled(NAMES, random);
  const puzzles = [];
  const signatures = new Set();
  let attempts = 0;
  while (puzzles.length < FLOWER_LATIN.rounds && attempts < 40) {
    const puzzle = makePuzzle(random, names[puzzles.length]);
    const signature = puzzle.solution.join('');
    if (!signatures.has(signature)) {
      signatures.add(signature);
      puzzles.push(puzzle);
    }
    attempts++;
  }
  return puzzles.map((puzzle) => ({
    ...puzzle,
    givens: [...puzzle.givens],
    solution: [...puzzle.solution],
  }));
}
