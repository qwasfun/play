import { rng } from '@playground/game-sdk';

export const PETAL_PACKING = Object.freeze({ size: 5, rounds: 3, pieces: 5, limit: 180 });

const templates = [
  ['12222', '11152', '31355', '33355', '44444'],
  ['12222', '11142', '31445', '34455', '33355'],
  ['12223', '11123', '41423', '44453', '55553'],
];

const colors = ['#d98278', '#7f9f82', '#d3a94f', '#8d7fa4', '#6f99aa'];

const normalize = (cells) => {
  const top = Math.min(...cells.map(({ row }) => row));
  const left = Math.min(...cells.map(({ column }) => column));
  return cells
    .map(({ row, column }) => ({ row: row - top, column: column - left }))
    .sort((a, b) => a.row - b.row || a.column - b.column);
};

export function rotateCells(cells, turns = 1) {
  let rotated = normalize(cells);
  for (let turn = 0; turn < ((turns % 4) + 4) % 4; turn++)
    rotated = normalize(rotated.map(({ row, column }) => ({ row: column, column: -row })));
  return rotated;
}

const transform = (cell, rotation, mirror) => {
  let row = cell.row;
  let column = mirror ? PETAL_PACKING.size - 1 - cell.column : cell.column;
  for (let turn = 0; turn < rotation; turn++)
    [row, column] = [column, PETAL_PACKING.size - 1 - row];
  return { row, column };
};

const shuffle = (values, random) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

export function generatePuzzles(seed) {
  const random = rng(`${seed}:petal-packing:v1`);
  return templates.map((rows, round) => {
    const rotation = Math.floor(random() * 4);
    const mirror = random() < 0.5;
    const cellsById = Array.from({ length: PETAL_PACKING.pieces + 1 }, () => []);
    for (let row = 0; row < PETAL_PACKING.size; row++)
      for (let column = 0; column < PETAL_PACKING.size; column++) {
        const id = Number(rows[row][column]);
        cellsById[id].push(transform({ row, column }, rotation, mirror));
      }
    const pieces = Array.from({ length: PETAL_PACKING.pieces }, (_, index) => {
      const id = index + 1;
      const solutionCells = cellsById[id];
      const top = Math.min(...solutionCells.map((cell) => cell.row));
      const left = Math.min(...solutionCells.map((cell) => cell.column));
      return {
        id,
        color: colors[(id + round) % colors.length],
        cells: normalize(solutionCells),
        initialRotation: (Math.floor(random() * 3) + id + round) % 4,
        solution: { row: top, column: left, rotation: 0 },
      };
    });
    return { size: PETAL_PACKING.size, pieces: shuffle(pieces, random) };
  });
}
