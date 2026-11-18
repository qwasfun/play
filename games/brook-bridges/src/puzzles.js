import { rng } from '@playground/game-sdk';

export const BROOK_BRIDGES = Object.freeze({ size: 7, rounds: 3, limit: 180, score: 400 });

const bases = [
  {
    name: '蒲草湾',
    islands: [
      ['a', 0, 0],
      ['b', 0, 3],
      ['c', 0, 6],
      ['d', 3, 0],
      ['e', 3, 3],
      ['f', 3, 6],
      ['g', 6, 3],
    ],
    solution: {
      'a:b': 1,
      'a:d': 1,
      'b:c': 2,
      'b:e': 1,
      'c:f': 2,
      'd:e': 1,
      'e:f': 0,
      'e:g': 1,
    },
  },
  {
    name: '睡莲湾',
    islands: [
      ['a', 0, 1],
      ['b', 0, 5],
      ['c', 3, 3],
      ['d', 3, 1],
      ['e', 3, 5],
      ['f', 6, 1],
      ['g', 6, 3],
      ['h', 6, 5],
    ],
    solution: {
      'a:b': 2,
      'a:d': 2,
      'b:e': 1,
      'c:d': 1,
      'c:e': 1,
      'c:g': 1,
      'd:f': 1,
      'e:h': 1,
      'f:g': 0,
      'g:h': 0,
    },
  },
  {
    name: '鹅卵湾',
    islands: [
      ['a', 0, 0],
      ['b', 0, 3],
      ['c', 0, 6],
      ['d', 2, 0],
      ['e', 2, 6],
      ['f', 4, 0],
      ['g', 4, 3],
      ['h', 4, 6],
      ['i', 6, 3],
    ],
    solution: {
      'a:b': 2,
      'a:d': 2,
      'b:c': 1,
      'b:g': 1,
      'c:e': 1,
      'd:e': 0,
      'd:f': 1,
      'e:h': 1,
      'f:g': 1,
      'g:h': 0,
      'g:i': 1,
    },
  },
];

export const edgeKey = (first, second) => [first, second].sort().join(':');

export function availableEdges(islands) {
  const edges = [];
  for (const island of islands) {
    for (const axis of ['row', 'column']) {
      const otherAxis = axis === 'row' ? 'column' : 'row';
      const next = islands
        .filter(
          (candidate) =>
            candidate[axis] === island[axis] && candidate[otherAxis] > island[otherAxis],
        )
        .sort((left, right) => left[otherAxis] - right[otherAxis])[0];
      if (next) edges.push({ key: edgeKey(island.id, next.id), from: island.id, to: next.id });
    }
  }
  return edges.sort((left, right) => left.key.localeCompare(right.key));
}

function transformPoint(row, column, variant) {
  let nextRow = row;
  let nextColumn = column;
  if (variant & 1) [nextRow, nextColumn] = [nextColumn, nextRow];
  if (variant & 2) nextColumn = BROOK_BRIDGES.size - 1 - nextColumn;
  if (variant & 4) nextRow = BROOK_BRIDGES.size - 1 - nextRow;
  return { row: nextRow, column: nextColumn };
}

function makePuzzle(base, variant) {
  const islands = base.islands
    .map(([id, row, column]) => ({ id, ...transformPoint(row, column, variant), target: 0 }))
    .sort((left, right) => left.row - right.row || left.column - right.column);
  const edges = availableEdges(islands);
  const solution = edges.map((edge) => base.solution[edge.key] || 0);
  edges.forEach((edge, index) => {
    const count = solution[index];
    islands.find(({ id }) => id === edge.from).target += count;
    islands.find(({ id }) => id === edge.to).target += count;
  });
  return { name: base.name, islands, edges, solution, variant };
}

export function generatePuzzles(seed) {
  const random = rng(`${seed}:brook-bridges:v1`);
  const order = [...bases];
  for (let index = order.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [order[index], order[target]] = [order[target], order[index]];
  }
  return order.map((base) => makePuzzle(base, Math.floor(random() * 8)));
}

function segments(puzzle, counts) {
  const byId = Object.fromEntries(puzzle.islands.map((island) => [island.id, island]));
  return puzzle.edges
    .map((edge, index) => ({ ...edge, count: counts[index], a: byId[edge.from], b: byId[edge.to] }))
    .filter(({ count }) => count > 0);
}

export function edgesCross(first, second) {
  const firstHorizontal = first.a.row === first.b.row;
  const secondHorizontal = second.a.row === second.b.row;
  if (firstHorizontal === secondHorizontal) return false;
  const horizontal = firstHorizontal ? first : second;
  const vertical = firstHorizontal ? second : first;
  const minColumn = Math.min(horizontal.a.column, horizontal.b.column);
  const maxColumn = Math.max(horizontal.a.column, horizontal.b.column);
  const minRow = Math.min(vertical.a.row, vertical.b.row);
  const maxRow = Math.max(vertical.a.row, vertical.b.row);
  return (
    vertical.a.column > minColumn &&
    vertical.a.column < maxColumn &&
    horizontal.a.row > minRow &&
    horizontal.a.row < maxRow
  );
}

export function evaluateBridges(puzzle, counts) {
  const degrees = Object.fromEntries(puzzle.islands.map(({ id }) => [id, 0]));
  puzzle.edges.forEach((edge, index) => {
    degrees[edge.from] += counts[index] || 0;
    degrees[edge.to] += counts[index] || 0;
  });
  const active = segments(puzzle, counts);
  let crossing = false;
  for (let first = 0; first < active.length; first++) {
    for (let second = first + 1; second < active.length; second++) {
      if (edgesCross(active[first], active[second])) crossing = true;
    }
  }
  const reached = new Set([puzzle.islands[0].id]);
  let changed = true;
  while (changed) {
    changed = false;
    active.forEach((edge) => {
      if (reached.has(edge.from) && !reached.has(edge.to)) {
        reached.add(edge.to);
        changed = true;
      }
      if (reached.has(edge.to) && !reached.has(edge.from)) {
        reached.add(edge.from);
        changed = true;
      }
    });
  }
  const complete = puzzle.islands.every((island) => degrees[island.id] === island.target);
  const connected = reached.size === puzzle.islands.length;
  return { degrees, crossing, connected, solved: complete && connected && !crossing };
}

export function countSolutions(puzzle, stopAt = Infinity) {
  let total = 0;
  const counts = Array(puzzle.edges.length).fill(0);
  const remaining = puzzle.edges.map((_, index) => puzzle.edges.slice(index + 1));

  function visit(index) {
    if (total >= stopAt) return;
    if (index === puzzle.edges.length) {
      if (evaluateBridges(puzzle, counts).solved) total++;
      return;
    }
    for (let count = 0; count <= 2; count++) {
      counts[index] = count;
      const partial = evaluateBridges(puzzle, counts).degrees;
      const possible = puzzle.islands.every((island) => {
        if (partial[island.id] > island.target) return false;
        const open = remaining[index].filter(
          (edge) => edge.from === island.id || edge.to === island.id,
        ).length;
        return partial[island.id] + open * 2 >= island.target;
      });
      if (possible) visit(index + 1);
    }
    counts[index] = 0;
  }

  visit(0);
  return total;
}
