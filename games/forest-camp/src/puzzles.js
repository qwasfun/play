export const FOREST_CAMP = { size: 6, rounds: 3, score: 400, limit: 180 };

const BASE_PUZZLES = [
  {
    name: '松香营地',
    trees: [1, 3, 11, 19, 22, 30],
    solution: [2, 4, 13, 17, 24, 28],
  },
  {
    name: '晨雾营地',
    trees: [6, 8, 11, 20, 22, 24],
    solution: [0, 2, 5, 21, 23, 25],
  },
  {
    name: '晚风营地',
    trees: [0, 4, 18, 23, 24, 28],
    solution: [1, 3, 17, 19, 30, 34],
  },
];

const position = (index) => [Math.floor(index / FOREST_CAMP.size), index % FOREST_CAMP.size];
const indexOf = (row, column) => row * FOREST_CAMP.size + column;
const beside = (first, second) => {
  const [firstRow, firstColumn] = position(first);
  const [secondRow, secondColumn] = position(second);
  return Math.abs(firstRow - secondRow) + Math.abs(firstColumn - secondColumn) === 1;
};
const touching = (first, second) => {
  const [firstRow, firstColumn] = position(first);
  const [secondRow, secondColumn] = position(second);
  return Math.max(Math.abs(firstRow - secondRow), Math.abs(firstColumn - secondColumn)) <= 1;
};

function seedNumber(seed) {
  let value = 2166136261;
  for (const character of String(seed ?? 'forest-camp')) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function random(seed) {
  let value = seed || 0x6d2b79f5;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return (mixed ^ (mixed >>> 14)) >>> 0;
  };
}

function transformIndex(index, code) {
  let [row, column] = position(index);
  if (code >= 4) {
    column = FOREST_CAMP.size - 1 - column;
    code -= 4;
  }
  for (let turn = 0; turn < code; turn++) {
    [row, column] = [column, FOREST_CAMP.size - 1 - row];
  }
  return indexOf(row, column);
}

function clues(solution) {
  const rows = Array(FOREST_CAMP.size).fill(0);
  const columns = Array(FOREST_CAMP.size).fill(0);
  solution.forEach((index) => {
    const [row, column] = position(index);
    rows[row]++;
    columns[column]++;
  });
  return { rows, columns };
}

export function generatePuzzles(seed) {
  const next = random(seedNumber(seed));
  const order = BASE_PUZZLES.map((_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const target = next() % (index + 1);
    [order[index], order[target]] = [order[target], order[index]];
  }
  return order.map((baseIndex) => {
    const base = BASE_PUZZLES[baseIndex];
    const code = next() % 8;
    const trees = base.trees.map((index) => transformIndex(index, code)).sort((a, b) => a - b);
    const solution = base.solution
      .map((index) => transformIndex(index, code))
      .sort((a, b) => a - b);
    const { rows, columns } = clues(solution);
    return { name: base.name, trees, solution, rows, columns };
  });
}

function hasPairing(tents, trees) {
  const assign = (tentIndex, used) => {
    if (tentIndex === tents.length) return true;
    return trees.some(
      (tree, treeIndex) =>
        !used.has(treeIndex) &&
        beside(tents[tentIndex], tree) &&
        assign(tentIndex + 1, new Set([...used, treeIndex])),
    );
  };
  return tents.length === trees.length && assign(0, new Set());
}

export function evaluateCamp(puzzle, board) {
  const tents = board.flatMap((value, index) => (value === 1 ? [index] : []));
  const { rows, columns } = clues(tents);
  const separated = tents.every(
    (tent, index) => !tents.slice(index + 1).some((other) => touching(tent, other)),
  );
  const besideTree = tents.every((tent) => puzzle.trees.some((tree) => beside(tent, tree)));
  const rowClues = rows.every((count, index) => count === puzzle.rows[index]);
  const columnClues = columns.every((count, index) => count === puzzle.columns[index]);
  const paired = hasPairing(tents, puzzle.trees);
  return {
    tents,
    rows,
    columns,
    separated,
    besideTree,
    paired,
    rowClues,
    columnClues,
    solved: separated && besideTree && paired && rowClues && columnClues,
  };
}

export function countSolutions(puzzle, stopAt = 2) {
  const treeSet = new Set(puzzle.trees);
  const candidates = Array.from({ length: FOREST_CAMP.size ** 2 }, (_, index) => index).filter(
    (index) => !treeSet.has(index) && puzzle.trees.some((tree) => beside(index, tree)),
  );
  let count = 0;
  const chosen = [];
  const rows = Array(FOREST_CAMP.size).fill(0);
  const columns = Array(FOREST_CAMP.size).fill(0);

  const search = (offset) => {
    if (count >= stopAt) return;
    if (
      chosen.length > puzzle.trees.length ||
      chosen.length + candidates.length - offset < puzzle.trees.length
    )
      return;
    if (rows.some((value, index) => value > puzzle.rows[index])) return;
    if (columns.some((value, index) => value > puzzle.columns[index])) return;
    if (offset === candidates.length) {
      const board = Array(FOREST_CAMP.size ** 2).fill(0);
      chosen.forEach((index) => (board[index] = 1));
      if (evaluateCamp(puzzle, board).solved) count++;
      return;
    }

    search(offset + 1);
    const candidate = candidates[offset];
    if (chosen.some((tent) => touching(tent, candidate))) return;
    const [row, column] = position(candidate);
    chosen.push(candidate);
    rows[row]++;
    columns[column]++;
    search(offset + 1);
    columns[column]--;
    rows[row]--;
    chosen.pop();
  };
  search(0);
  return count;
}
