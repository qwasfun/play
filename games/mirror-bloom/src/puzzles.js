import { rng } from '@playground/game-sdk';

export const MIRROR_BLOOM = Object.freeze({ size: 5, rounds: 3, limit: 180, score: 400 });

const steps = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

const templates = [
  {
    name: '池畔晨光',
    entry: { row: 1, column: -1, direction: 0 },
    exit: { row: -1, column: 4, direction: 3 },
    mirrors: [
      { row: 1, column: 1, solution: 1 },
      { row: 3, column: 1, solution: 1 },
      { row: 3, column: 4, solution: 0 },
    ],
    flowers: [
      { row: 1, column: 0 },
      { row: 2, column: 1 },
      { row: 3, column: 3 },
      { row: 1, column: 4 },
    ],
  },
  {
    name: '藤架晴影',
    entry: { row: -1, column: 4, direction: 1 },
    exit: { row: 4, column: 5, direction: 0 },
    mirrors: [
      { row: 1, column: 4, solution: 0 },
      { row: 1, column: 1, solution: 0 },
      { row: 4, column: 1, solution: 1 },
    ],
    flowers: [
      { row: 0, column: 4 },
      { row: 1, column: 3 },
      { row: 2, column: 1 },
      { row: 4, column: 2 },
      { row: 4, column: 4 },
    ],
  },
  {
    name: '花墙晚照',
    entry: { row: 0, column: -1, direction: 0 },
    exit: { row: 4, column: 5, direction: 0 },
    mirrors: [
      { row: 0, column: 3, solution: 1 },
      { row: 2, column: 3, solution: 0 },
      { row: 2, column: 0, solution: 0 },
      { row: 4, column: 0, solution: 1 },
    ],
    flowers: [
      { row: 0, column: 1 },
      { row: 1, column: 3 },
      { row: 2, column: 2 },
      { row: 3, column: 0 },
      { row: 4, column: 3 },
    ],
  },
];

const key = ({ row, column }) => `${row}:${column}`;

function rotatePoint(point, turns) {
  let { row, column } = point;
  for (let turn = 0; turn < turns; turn++) [row, column] = [column, MIRROR_BLOOM.size - 1 - row];
  return { row, column };
}

function rotatePort(port, turns) {
  return { ...rotatePoint(port, turns), direction: (port.direction + turns) % 4 };
}

function rotateTemplate(template, turns) {
  return {
    name: template.name,
    entry: rotatePort(template.entry, turns),
    exit: rotatePort(template.exit, turns),
    mirrors: template.mirrors.map((mirror) => ({
      ...rotatePoint(mirror, turns),
      solution: turns % 2 ? 1 - mirror.solution : mirror.solution,
    })),
    flowers: template.flowers.map((flower) => rotatePoint(flower, turns)),
  };
}

export function traceLight(puzzle, orientations = puzzle.start) {
  const mirrors = new Map(
    puzzle.mirrors.map((mirror, index) => [key(mirror), orientations[index]]),
  );
  const flowerKeys = new Set(puzzle.flowers.map(key));
  const lit = new Set();
  const path = [{ row: puzzle.entry.row, column: puzzle.entry.column }];
  const seen = new Set();
  let row = puzzle.entry.row;
  let column = puzzle.entry.column;
  let direction = puzzle.entry.direction;
  let loop = false;
  for (let step = 0; step < 80; step++) {
    row += steps[direction][0];
    column += steps[direction][1];
    path.push({ row, column });
    if (row < 0 || row >= MIRROR_BLOOM.size || column < 0 || column >= MIRROR_BLOOM.size) break;
    if (flowerKeys.has(key({ row, column }))) lit.add(key({ row, column }));
    const state = `${row}:${column}:${direction}`;
    if (seen.has(state)) {
      loop = true;
      break;
    }
    seen.add(state);
    const mirror = mirrors.get(key({ row, column }));
    if (mirror === 0) direction = [3, 2, 1, 0][direction];
    if (mirror === 1) direction = [1, 0, 3, 2][direction];
  }
  const escaped = row < 0 || row >= MIRROR_BLOOM.size || column < 0 || column >= MIRROR_BLOOM.size;
  const solved =
    !loop &&
    escaped &&
    row === puzzle.exit.row &&
    column === puzzle.exit.column &&
    direction === puzzle.exit.direction &&
    lit.size === flowerKeys.size;
  return { path, lit: [...lit], direction, escaped, loop, solved };
}

export function countSolutions(puzzle) {
  let count = 0;
  for (let mask = 0; mask < 2 ** puzzle.mirrors.length; mask++) {
    const orientations = puzzle.mirrors.map((_, index) => (mask >> index) & 1);
    if (traceLight(puzzle, orientations).solved) count++;
  }
  return count;
}

export function generatePuzzles(seed) {
  const random = rng(`${seed}:mirror-bloom:v1`);
  const order = [0, 1, 2];
  for (let index = order.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }
  return order.map((templateIndex) => {
    const puzzle = rotateTemplate(templates[templateIndex], Math.floor(random() * 4));
    const start = puzzle.mirrors.map((mirror) =>
      random() < 0.5 ? mirror.solution : 1 - mirror.solution,
    );
    // Keep the first mirror correct so the shared QA can rotate and undo it
    // without accidentally completing a one-move opening position.
    start[0] = puzzle.mirrors[0].solution;
    if (start.every((orientation, index) => orientation === puzzle.mirrors[index].solution))
      start[start.length - 1] = 1 - start[start.length - 1];
    return { ...puzzle, start };
  });
}
