import { rng } from '@playground/game-sdk';

export const DEW_LINKS = Object.freeze({ size: 5, rounds: 3, pairs: 4, limit: 150 });

const rowSnake = Array.from({ length: DEW_LINKS.size ** 2 }, (_, index) => {
  const row = Math.floor(index / DEW_LINKS.size);
  const offset = index % DEW_LINKS.size;
  return { row, column: row % 2 ? DEW_LINKS.size - 1 - offset : offset };
});

const columnSnake = rowSnake.map(({ row, column }) => ({ row: column, column: row }));

function spiral() {
  const cells = [];
  let top = 0;
  let bottom = DEW_LINKS.size - 1;
  let left = 0;
  let right = DEW_LINKS.size - 1;
  while (top <= bottom && left <= right) {
    for (let column = left; column <= right; column++) cells.push({ row: top, column });
    top++;
    for (let row = top; row <= bottom; row++) cells.push({ row, column: right });
    right--;
    if (top <= bottom) {
      for (let column = right; column >= left; column--) cells.push({ row: bottom, column });
      bottom--;
    }
    if (left <= right) {
      for (let row = bottom; row >= top; row--) cells.push({ row, column: left });
      left++;
    }
  }
  return cells;
}

const basePaths = [rowSnake, spiral(), columnSnake];
const segmentLengths = [
  [6, 6, 6, 7],
  [7, 5, 7, 6],
  [5, 7, 6, 7],
];

const transform = (cell, rotation, mirror) => {
  let row = cell.row;
  let column = mirror ? DEW_LINKS.size - 1 - cell.column : cell.column;
  for (let turn = 0; turn < rotation; turn++) [row, column] = [column, DEW_LINKS.size - 1 - row];
  return { row, column };
};

const shuffledLabels = (random) => {
  const labels = [1, 2, 3, 4];
  for (let index = labels.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [labels[index], labels[target]] = [labels[target], labels[index]];
  }
  return labels;
};

export function generatePuzzles(seed) {
  const random = rng(`${seed}:dew-links:v1`);
  return basePaths.map((base, round) => {
    const rotation = Math.floor(random() * 4);
    const mirror = random() < 0.5;
    const transformed = base.map((cell) => transform(cell, rotation, mirror));
    const labels = shuffledLabels(random);
    const routes = [];
    let offset = 0;
    for (let index = 0; index < DEW_LINKS.pairs; index++) {
      const cells = transformed.slice(offset, offset + segmentLengths[round][index]);
      routes.push({ label: labels[index], cells });
      offset += segmentLengths[round][index];
    }
    const endpoints = Object.fromEntries(
      routes.map(({ label, cells }) => [label, [cells[0], cells.at(-1)]]),
    );
    return { size: DEW_LINKS.size, routes, endpoints };
  });
}
