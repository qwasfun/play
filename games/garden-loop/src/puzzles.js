import { rng } from '@playground/game-sdk';

export const GARDEN_LOOP = Object.freeze({ size: 4, rounds: 3, limit: 180 });

const paths = [
  [
    [0, 0],
    [0, 4],
    [4, 4],
    [4, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 4],
    [4, 4],
    [4, 0],
    [3, 0],
    [3, 2],
    [1, 2],
    [1, 0],
    [0, 0],
  ],
  [
    [0, 0],
    [0, 3],
    [1, 3],
    [1, 4],
    [4, 4],
    [4, 1],
    [3, 1],
    [3, 0],
    [0, 0],
  ],
];

export const edgeId = (orientation, row, column) => `${orientation}:${row}:${column}`;

export const allEdges = Object.freeze([
  ...Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 4 }, (_, column) => edgeId('h', row, column)),
  ).flat(),
  ...Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 5 }, (_, column) => edgeId('v', row, column)),
  ).flat(),
]);

export function edgeEnds(id) {
  const [orientation, rowText, columnText] = String(id).split(':');
  const row = Number(rowText);
  const column = Number(columnText);
  if (orientation === 'h' && row >= 0 && row <= 4 && column >= 0 && column < 4)
    return [
      [row, column],
      [row, column + 1],
    ];
  if (orientation === 'v' && row >= 0 && row < 4 && column >= 0 && column <= 4)
    return [
      [row, column],
      [row + 1, column],
    ];
  return [];
}

const edgeBetween = ([rowA, columnA], [rowB, columnB]) =>
  rowA === rowB
    ? edgeId('h', rowA, Math.min(columnA, columnB))
    : edgeId('v', Math.min(rowA, rowB), columnA);

function expand(points) {
  const vertices = [];
  for (let index = 0; index < points.length - 1; index++) {
    const [row, column] = points[index];
    const [targetRow, targetColumn] = points[index + 1];
    const rowStep = Math.sign(targetRow - row);
    const columnStep = Math.sign(targetColumn - column);
    const distance = Math.abs(targetRow - row) + Math.abs(targetColumn - column);
    if (index === 0) vertices.push([row, column]);
    for (let step = 1; step <= distance; step++)
      vertices.push([row + rowStep * step, column + columnStep * step]);
  }
  return vertices;
}

const transform = ([row, column], rotation, mirror) => {
  if (mirror) column = GARDEN_LOOP.size - column;
  for (let turn = 0; turn < rotation; turn++) [row, column] = [column, GARDEN_LOOP.size - row];
  return [row, column];
};

export function cluesFor(edges) {
  const selected = edges instanceof Set ? edges : new Set(edges);
  return Array.from({ length: GARDEN_LOOP.size }, (_, row) =>
    Array.from(
      { length: GARDEN_LOOP.size },
      (_, column) =>
        [
          edgeId('h', row, column),
          edgeId('h', row + 1, column),
          edgeId('v', row, column),
          edgeId('v', row, column + 1),
        ].filter((id) => selected.has(id)).length,
    ),
  );
}

export function isSingleLoop(edges) {
  const selected = edges instanceof Set ? edges : new Set(edges);
  if (selected.size < 4 || [...selected].some((id) => !allEdges.includes(id))) return false;
  const graph = new Map();
  for (const id of selected) {
    const ends = edgeEnds(id);
    if (ends.length !== 2) return false;
    for (const [vertex, neighbor] of [
      [ends[0], ends[1]],
      [ends[1], ends[0]],
    ]) {
      const key = vertex.join(':');
      if (!graph.has(key)) graph.set(key, []);
      graph.get(key).push(neighbor.join(':'));
    }
  }
  if ([...graph.values()].some((neighbors) => neighbors.length !== 2)) return false;
  const start = graph.keys().next().value;
  const seen = new Set([start]);
  const pending = [start];
  while (pending.length) {
    for (const neighbor of graph.get(pending.pop()))
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        pending.push(neighbor);
      }
  }
  return seen.size === graph.size;
}

export function satisfiesPuzzle(puzzle, edges) {
  const selected = edges instanceof Set ? edges : new Set(edges);
  if (!isSingleLoop(selected)) return false;
  return puzzle.clues.every((row, rowIndex) =>
    row.every((clue, columnIndex) => {
      if (clue === null) return true;
      return (
        [
          edgeId('h', rowIndex, columnIndex),
          edgeId('h', rowIndex + 1, columnIndex),
          edgeId('v', rowIndex, columnIndex),
          edgeId('v', rowIndex, columnIndex + 1),
        ].filter((id) => selected.has(id)).length === clue
      );
    }),
  );
}

export function generatePuzzles(seed) {
  const random = rng(`${seed}:garden-loop:v1`);
  return paths.map((corners) => {
    const rotation = Math.floor(random() * 4);
    const mirror = random() < 0.5;
    const vertices = expand(corners.map((vertex) => transform(vertex, rotation, mirror)));
    const solution = vertices.slice(1).map((vertex, index) => edgeBetween(vertices[index], vertex));
    return { size: GARDEN_LOOP.size, clues: cluesFor(solution), solution };
  });
}
