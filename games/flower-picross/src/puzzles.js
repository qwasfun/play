import { rng } from '@playground/game-sdk';

export const FLOWER_PICROSS = Object.freeze({ size: 5, rounds: 3, limit: 180 });

const PATTERNS = Object.freeze([
  { name: '庭心花', rows: ['..#..', '.###.', '#####', '..#..', '.###.'] },
  { name: '小茶盏', rows: ['####.', '#..#.', '#..#.', '.##..', '####.'] },
  { name: '双翼蝶', rows: ['#...#', '##.##', '.###.', '##.##', '#...#'] },
  { name: '夜灯笼', rows: ['.###.', '#...#', '#####', '#...#', '.###.'] },
  { name: '弯月窗', rows: ['.###.', '##...', '##...', '##...', '.###.'] },
  { name: '纸花鸢', rows: ['..#..', '.###.', '#####', '.###.', '..#..'] },
]);

export function lineClues(line) {
  const clues = [];
  let run = 0;
  for (const value of line) {
    if (value) run++;
    else if (run) {
      clues.push(run);
      run = 0;
    }
  }
  if (run) clues.push(run);
  return clues.length ? clues : [0];
}

function makePuzzle(pattern) {
  const solution = pattern.rows.flatMap((row) => [...row].map((cell) => cell === '#'));
  const rowClues = Array.from({ length: FLOWER_PICROSS.size }, (_, row) =>
    lineClues(solution.slice(row * FLOWER_PICROSS.size, (row + 1) * FLOWER_PICROSS.size)),
  );
  const columnClues = Array.from({ length: FLOWER_PICROSS.size }, (_, column) =>
    lineClues(
      Array.from(
        { length: FLOWER_PICROSS.size },
        (_, row) => solution[row * FLOWER_PICROSS.size + column],
      ),
    ),
  );
  return { name: pattern.name, solution, rowClues, columnClues };
}

export function generatePuzzles(seed) {
  const random = rng(`${seed}:flower-picross:v1`);
  const pool = PATTERNS.map((pattern) => makePuzzle(pattern));
  for (let index = pool.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  return pool.slice(0, FLOWER_PICROSS.rounds).map((puzzle) => ({
    ...puzzle,
    solution: [...puzzle.solution],
    rowClues: puzzle.rowClues.map((clues) => [...clues]),
    columnClues: puzzle.columnClues.map((clues) => [...clues]),
  }));
}

export function countSolutions(puzzle, limit = 2) {
  const size = FLOWER_PICROSS.size;
  const masks = Array.from({ length: 1 << size }, (_, mask) => mask);
  const signature = (clues) => clues.join(',');
  const rowOptions = puzzle.rowClues.map((expected) =>
    masks.filter(
      (mask) =>
        lineClues(Array.from({ length: size }, (_, column) => Boolean(mask & (1 << column)))).join(
          ',',
        ) === signature(expected),
    ),
  );
  let found = 0;
  const visit = (row, chosen) => {
    if (found >= limit) return;
    if (row === size) {
      const valid = puzzle.columnClues.every(
        (expected, column) =>
          signature(lineClues(chosen.map((mask) => Boolean(mask & (1 << column))))) ===
          signature(expected),
      );
      if (valid) found++;
      return;
    }
    for (const mask of rowOptions[row]) visit(row + 1, [...chosen, mask]);
  };
  visit(0, []);
  return found;
}
