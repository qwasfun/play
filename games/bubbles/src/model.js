const WIDTH = 5,
  HEIGHT = 4;
export function findGroup(board, start, width = WIDTH, height = HEIGHT) {
  if (!Number.isInteger(start) || start < 0 || start >= width * height || board[start] == null)
    return [];
  const group = [start],
    seen = new Set(group),
    color = board[start];
  for (let head = 0; head < group.length; head++) {
    const cell = group[head],
      x = cell % width,
      y = Math.floor(cell / width);
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        next = ny * width + nx;
      if (
        nx < 0 ||
        nx >= width ||
        ny < 0 ||
        ny >= height ||
        seen.has(next) ||
        board[next] !== color
      )
        continue;
      seen.add(next);
      group.push(next);
    }
  }
  return group;
}

export function collapseBubbles(board, width = WIDTH, height = HEIGHT) {
  const columns = [];
  for (let col = 0; col < width; col++) {
    const items = [];
    for (let row = 0; row < height; row++)
      if (board[row * width + col] != null) items.push(board[row * width + col]);
    if (items.length) columns.push(items);
  }
  const next = Array(width * height).fill(null);
  columns.forEach((items, col) =>
    items.forEach((color, row) => {
      next[(height - items.length + row) * width + col] = color;
    }),
  );
  return next;
}
