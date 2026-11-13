// Authoring and independent verification helpers. Never bundled into the arcade.
export const directions = [
  [0, -1, 'U'],
  [1, 0, 'R'],
  [0, 1, 'D'],
  [-1, 0, 'L'],
];
export function neighbors(cell, size) {
  const x = cell % size,
    y = Math.floor(cell / size);
  return directions
    .map(([dx, dy]) => [x + dx, y + dy])
    .filter(([a, b]) => a >= 0 && b >= 0 && a < size && b < size)
    .map(([a, b]) => b * size + a);
}
export const popcount = (value) => {
  let n = 0;
  for (let bits = value >>> 0; bits; bits &= bits - 1) n++;
  return n;
};
export function solveLights(board, size) {
  const n = size * size,
    rows = board.map((value, i) =>
      [i, ...neighbors(i, size)].reduce((mask, j) => mask | (1 << j), value << n),
    );
  const pivots = [];
  let rank = 0;
  for (let col = 0; col < n; col++) {
    const found = rows.findIndex((row, i) => i >= rank && row & (1 << col));
    if (found < 0) continue;
    [rows[rank], rows[found]] = [rows[found], rows[rank]];
    for (let i = 0; i < n; i++) if (i !== rank && rows[i] & (1 << col)) rows[i] ^= rows[rank];
    pivots.push(col);
    rank++;
  }
  if (rows.slice(rank).some((row) => row & (1 << n))) return null;
  let base = 0;
  for (let i = 0; i < rank; i++) if (rows[i] & (1 << n)) base |= 1 << pivots[i];
  const free = Array.from({ length: n }, (_, i) => i).filter((i) => !pivots.includes(i));
  const basis = free.map((col) => {
    let bits = 1 << col;
    for (let i = 0; i < rank; i++) if (rows[i] & (1 << col)) bits |= 1 << pivots[i];
    return bits;
  });
  let best = base;
  for (let mask = 1; mask < 1 << basis.length; mask++) {
    let bits = base;
    basis.forEach((value, i) => {
      if (mask & (1 << i)) bits ^= value;
    });
    if (popcount(bits) < popcount(best)) best = bits;
  }
  return Array.from({ length: n }, (_, i) => i).filter((i) => best & (1 << i));
}
export function slideDistances() {
  const queue = ['123456780'],
    distance = new Map([[queue[0], 0]]);
  for (let head = 0; head < queue.length; head++) {
    const board = queue[head],
      blank = board.indexOf('0'),
      depth = distance.get(board) + 1;
    for (const cell of neighbors(blank, 3)) {
      const next = board.split('');
      [next[cell], next[blank]] = [next[blank], next[cell]];
      const key = next.join('');
      if (!distance.has(key)) {
        distance.set(key, depth);
        queue.push(key);
      }
    }
  }
  return distance;
}
export function solveSlide(board, distance) {
  const path = [];
  let key = board.join('');
  while (distance.get(key) > 0) {
    const blank = key.indexOf('0'),
      depth = distance.get(key);
    let found = false;
    for (const cell of neighbors(blank, 3)) {
      const next = key.split('');
      [next[cell], next[blank]] = [next[blank], next[cell]];
      const value = next.join('');
      if (distance.get(value) === depth - 1) {
        path.push(cell);
        key = value;
        found = true;
        break;
      }
    }
    if (!found) throw Error('拼图：无法找到最短解');
  }
  return path;
}
export function mineCounts(size, mines) {
  return Array.from({ length: size * size }, (_, cell) =>
    mines.includes(cell) ? -1 : mineAdjacent(cell, size).filter((n) => mines.includes(n)).length,
  );
}
export function mineAdjacent(cell, size) {
  const out = [],
    x = cell % size,
    y = Math.floor(cell / size);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if ((dx || dy) && x + dx >= 0 && x + dx < size && y + dy >= 0 && y + dy < size)
        out.push((y + dy) * size + x + dx);
  return out;
}
export function deduceMines(size, mines) {
  const counts = mineCounts(size, mines),
    open = new Set(),
    flags = new Set(),
    trace = [];
  let subsets = 0;
  const reveal = (cell) => {
    if (open.has(cell)) return;
    trace.push({ kind: 'reveal', cell });
    const queue = [cell];
    for (let head = 0; head < queue.length; head++) {
      const at = queue[head];
      if (open.has(at) || flags.has(at)) continue;
      if (counts[at] < 0) throw Error('扫雷推理错误');
      open.add(at);
      if (counts[at] === 0) queue.push(...mineAdjacent(at, size));
    }
  };
  reveal(0);
  const initial = open.size;
  for (let pass = 0; pass < 200 && open.size < size * size - mines.length; pass++) {
    const before = open.size + flags.size,
      sets = [];
    for (const cell of open) {
      const adjacent = mineAdjacent(cell, size),
        unknown = adjacent.filter((n) => !open.has(n) && !flags.has(n)),
        count = counts[cell] - adjacent.filter((n) => flags.has(n)).length;
      if (unknown.length) sets.push({ unknown, count });
    }
    const apply = ({ unknown, count }) => {
      if (count === 0) unknown.forEach(reveal);
      else if (count === unknown.length)
        unknown.forEach((cell) => {
          if (!flags.has(cell)) {
            flags.add(cell);
            trace.push({ kind: 'flag', cell });
          }
        });
    };
    sets.forEach(apply);
    if (open.size + flags.size === before)
      for (const a of sets)
        for (const b of sets)
          if (
            a !== b &&
            a.unknown.length < b.unknown.length &&
            a.unknown.every((cell) => b.unknown.includes(cell))
          ) {
            const difference = {
              unknown: b.unknown.filter((cell) => !a.unknown.includes(cell)),
              count: b.count - a.count,
            };
            if (difference.count === 0 || difference.count === difference.unknown.length) {
              const n = open.size + flags.size;
              apply(difference);
              if (open.size + flags.size > n) subsets++;
            }
          }
    if (open.size + flags.size === before) break;
  }
  return { solved: open.size === size * size - mines.length, trace, initial, subsets };
}
export function parseBoxes(rows) {
  const width = rows[0].length,
    board = rows.join('').split(''),
    crates = [],
    goals = [];
  let player = -1;
  board.forEach((c, i) => {
    if ('$*'.includes(c)) crates.push(i);
    if ('.+*'.includes(c)) goals.push(i);
    if ('@+'.includes(c)) player = i;
    if ('$@*+'.includes(c)) board[i] = ' ';
  });
  return { width, height: rows.length, board, crates, goals, player };
}
export function solveBoxes(rows, maxStates = 300000) {
  const puzzle = parseBoxes(rows),
    { width, board, goals } = puzzle;
  const reach = (player, crates) => {
    const paths = new Map([[player, '']]),
      queue = [player];
    for (let head = 0; head < queue.length; head++)
      for (const [dx, dy, letter] of directions) {
        const at = queue[head] + dy * width + dx;
        if (
          board[at] !== undefined &&
          board[at] !== '#' &&
          !crates.includes(at) &&
          !paths.has(at)
        ) {
          paths.set(at, paths.get(queue[head]) + letter);
          queue.push(at);
        }
      }
    return paths;
  };
  const key = (crates, paths) =>
    `${[...crates].sort((a, b) => a - b)}:${Math.min(...paths.keys())}`;
  const initial = reach(puzzle.player, puzzle.crates),
    queue = [{ player: puzzle.player, crates: puzzle.crates, path: '', pushes: 0 }],
    seen = new Set([key(puzzle.crates, initial)]);
  for (let head = 0; head < queue.length && head < maxStates; head++) {
    const state = queue[head];
    if (state.crates.every((c) => goals.includes(c)))
      return { solution: state.path, minPushes: state.pushes, states: head + 1 };
    const paths = reach(state.player, state.crates);
    for (const crate of state.crates)
      for (const [dx, dy, letter] of directions) {
        const delta = dy * width + dx,
          behind = crate - delta,
          ahead = crate + delta;
        if (
          !paths.has(behind) ||
          board[ahead] === undefined ||
          board[ahead] === '#' ||
          state.crates.includes(ahead)
        )
          continue;
        if (
          !goals.includes(ahead) &&
          [
            [-1, -width],
            [-1, width],
            [1, -width],
            [1, width],
          ].some(([a, b]) => board[ahead + a] === '#' && board[ahead + b] === '#')
        )
          continue;
        const crates = state.crates.map((c) => (c === crate ? ahead : c)),
          nextReach = reach(crate, crates),
          value = key(crates, nextReach);
        if (seen.has(value)) continue;
        seen.add(value);
        queue.push({
          player: crate,
          crates,
          path: state.path + paths.get(behind) + letter,
          pushes: state.pushes + 1,
        });
      }
  }
  return null;
}
