export const GARDEN_PLOTS = {
  size: 5,
  boards: 3,
  plotsPerBoard: 5,
  score: 400,
  limit: 150,
  transition: 0.72,
};

export const BOARD_X = 110;
export const BOARD_Y = 55;
export const CELL = 76;

const TEMPLATES = [
  [
    { r: 0, c: 0, h: 2, w: 2 },
    { r: 0, c: 2, h: 1, w: 3 },
    { r: 1, c: 2, h: 2, w: 3 },
    { r: 2, c: 0, h: 3, w: 2 },
    { r: 3, c: 2, h: 2, w: 3 },
  ],
  [
    { r: 0, c: 0, h: 2, w: 3 },
    { r: 0, c: 3, h: 2, w: 2 },
    { r: 2, c: 0, h: 2, w: 2 },
    { r: 2, c: 2, h: 2, w: 3 },
    { r: 4, c: 0, h: 1, w: 5 },
  ],
  [
    { r: 0, c: 0, h: 2, w: 2 },
    { r: 0, c: 2, h: 2, w: 2 },
    { r: 0, c: 4, h: 5, w: 1 },
    { r: 2, c: 0, h: 3, w: 3 },
    { r: 2, c: 3, h: 3, w: 1 },
  ],
  [
    { r: 0, c: 0, h: 1, w: 3 },
    { r: 0, c: 3, h: 2, w: 2 },
    { r: 1, c: 0, h: 2, w: 3 },
    { r: 2, c: 3, h: 3, w: 2 },
    { r: 3, c: 0, h: 2, w: 3 },
  ],
  [
    { r: 0, c: 0, h: 3, w: 2 },
    { r: 0, c: 2, h: 1, w: 3 },
    { r: 1, c: 2, h: 2, w: 3 },
    { r: 3, c: 0, h: 2, w: 3 },
    { r: 3, c: 3, h: 2, w: 2 },
  ],
  [
    { r: 0, c: 0, h: 2, w: 3 },
    { r: 0, c: 3, h: 1, w: 2 },
    { r: 1, c: 3, h: 2, w: 2 },
    { r: 2, c: 0, h: 3, w: 3 },
    { r: 3, c: 3, h: 2, w: 2 },
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

export function rectCells(rect) {
  const cells = [];
  for (let r = rect.r; r < rect.r + rect.h; r++)
    for (let c = rect.c; c < rect.c + rect.w; c++) cells.push({ r, c });
  return cells;
}

export function normalizeRect(start, end) {
  const r = Math.min(start.r, end.r);
  const c = Math.min(start.c, end.c);
  return { r, c, h: Math.abs(start.r - end.r) + 1, w: Math.abs(start.c - end.c) + 1 };
}

export function cellCenter(cell) {
  return { x: BOARD_X + (cell.c + 0.5) * CELL, y: BOARD_Y + (cell.r + 0.5) * CELL };
}

function transformCell(cell, transform) {
  let r = cell.r;
  let c = transform >= 4 ? GARDEN_PLOTS.size - 1 - cell.c : cell.c;
  for (let turn = 0; turn < transform % 4; turn++) [r, c] = [c, GARDEN_PLOTS.size - 1 - r];
  return { r, c };
}

function transformRect(rect, transform) {
  const cells = rectCells(rect).map((cell) => transformCell(cell, transform));
  const rows = cells.map(({ r }) => r);
  const columns = cells.map(({ c }) => c);
  const r = Math.min(...rows);
  const c = Math.min(...columns);
  return { r, c, h: Math.max(...rows) - r + 1, w: Math.max(...columns) - c + 1 };
}

export function generateBoards(seed) {
  const next = random(seed);
  const order = TEMPLATES.map((_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const swap = Math.floor(next() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order.slice(0, GARDEN_PLOTS.boards).map((template) => {
    const transform = Math.floor(next() * 8);
    const solution = TEMPLATES[template]
      .map((rect) => transformRect(rect, transform))
      .sort((left, right) => left.r - right.r || left.c - right.c);
    const clues = solution.map((rect) => {
      const cells = rectCells(rect);
      const cell = cells[Math.floor(next() * cells.length)];
      return { ...cell, value: rect.h * rect.w };
    });
    return { clues, solution, template, transform };
  });
}
