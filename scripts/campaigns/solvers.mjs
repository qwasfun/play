// Authoring/test only. No production package imports this module.
export const shuffle = (a, r) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export function jugSolution(a, b, target) {
  const queue = [[0, 0, []]],
    seen = new Set(['0,0']);
  for (let i = 0; i < queue.length; i++) {
    const [x, y, path] = queue[i];
    if (x === target || y === target) return path;
    const p = Math.min(x, b - y),
      q = Math.min(y, a - x);
    [
      [a, y],
      [x, b],
      [0, y],
      [x, 0],
      [x - p, y + p],
      [x + q, y - q],
    ].forEach(([u, v], op) => {
      const k = `${u},${v}`;
      if (!seen.has(k)) {
        seen.add(k);
        queue.push([u, v, [...path, op]]);
      }
    });
  }
  return null;
}
export function runs(line) {
  const out = [];
  let n = 0;
  for (const v of [...line, 0]) {
    if (v) n++;
    else if (n) {
      out.push(n);
      n = 0;
    }
  }
  return out.length ? out : [0];
}
export function nonogram(board) {
  const rows = Array.from({ length: 5 }, (_, r) => runs(board.slice(r * 5, r * 5 + 5))),
    cols = Array.from({ length: 5 }, (_, c) =>
      runs(Array.from({ length: 5 }, (_, r) => board[r * 5 + c])),
    );
  return { rows, cols };
}
export function solveNonogram({ rows, cols }, limit = 2) {
  const masks = Array.from({ length: 32 }, (_, m) =>
      Array.from({ length: 5 }, (_, i) => Boolean(m & (1 << i))),
    ),
    candidates = (clues) =>
      clues.map((clue) =>
        masks.filter((row) => JSON.stringify(runs(row)) === JSON.stringify(clue)),
      ),
    rs = candidates(rows),
    cs = candidates(cols),
    solutions = [];
  let nodes = 0;
  function visit(part) {
    nodes++;
    const n = part.length;
    if (n === 5) {
      solutions.push(part.flat());
      return;
    }
    for (const row of rs[n]) {
      if (
        cs.every((choices, c) =>
          choices.some((col) => part.every((r, i) => r[c] === col[i]) && row[c] === col[n]),
        )
      ) {
        visit([...part, row]);
        if (solutions.length >= limit) return;
      }
    }
  }
  visit([]);
  return {
    solutions,
    nodes,
    ambiguity: rs.reduce((n, a) => n + a.length, 0) + cs.reduce((n, a) => n + a.length, 0),
  };
}
export function pegBoard(count, r) {
  const lines = [];
  for (let a = 0; a < 25; a++)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = (a % 5) + dx * 2,
        y = Math.floor(a / 5) + dy * 2;
      if (x >= 0 && x < 5 && y >= 0 && y < 5) lines.push([a, a + dy * 5 + dx, y * 5 + x]);
    }
  let budget = 250000;
  const seen = new Set();
  function grow(board, path) {
    if (--budget < 0) return null;
    if (board.filter(Boolean).length === count) return { board, solution: [...path].reverse() };
    const key = board.map(Number).join('');
    if (seen.has(key)) return null;
    seen.add(key);
    for (const [a, b, c] of shuffle(lines, r))
      if (!board[a] && !board[b] && board[c]) {
        const next = [...board];
        next[a] = next[b] = 1;
        next[c] = 0;
        const found = grow(next, [...path, [a, b, c]]);
        if (found) return found;
      }
    return null;
  }
  const board = Array(25).fill(0);
  board[12] = 1;
  return grow(board, []);
}
export function graphTrail(edges) {
  const used = new Set(),
    path = [];
  const degree = (i) => edges.filter((e) => e.includes(i)).length,
    start = edges.flat().find((i) => degree(i) % 2) || edges[0][0];
  function walk(a) {
    edges.forEach(([x, y], i) => {
      if (!used.has(i) && (x === a || y === a)) {
        used.add(i);
        walk(x === a ? y : x);
      }
    });
    path.push(a);
  }
  walk(start);
  return path.reverse();
}
export function route(start, end, walls, size = 6) {
  const q = [[start, []]],
    seen = new Set([start]);
  for (let h = 0; h < q.length; h++) {
    const [a, p] = q[h];
    if (a === end) return p;
    for (const d of [-size, 1, size, -1]) {
      const b = a + d;
      if (
        b < 0 ||
        b >= size * size ||
        Math.abs((a % size) - (b % size)) +
          Math.abs(Math.floor(a / size) - Math.floor(b / size)) !==
          1 ||
        walls.includes(b) ||
        seen.has(b)
      )
        continue;
      seen.add(b);
      q.push([b, [...p, b]]);
    }
  }
  return null;
}
