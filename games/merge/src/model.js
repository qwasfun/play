import { rng } from '@playground/game-sdk';
const DIRECTIONS = ['left', 'right', 'up', 'down'];
export function moveBoard(board, direction) {
  const next = [...board];
  let score = 0;
  const merged = [];
  if (!DIRECTIONS.includes(direction)) return { board: next, score, merged, moved: false };
  for (let line = 0; line < 4; line++) {
    const indices = Array.from({ length: 4 }, (_, position) => {
      if (direction === 'left') return line * 4 + position;
      if (direction === 'right') return line * 4 + 3 - position;
      if (direction === 'up') return position * 4 + line;
      return (3 - position) * 4 + line;
    });
    const values = indices.map((index) => board[index]).filter(Boolean);
    const packed = [];
    for (let i = 0; i < values.length; i++) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        const value = values[i] * 2;
        merged.push(indices[packed.length]);
        packed.push(value);
        score += value;
        i++;
      } else packed.push(values[i]);
    }
    indices.forEach((index, position) => {
      next[index] = packed[position] || 0;
    });
  }
  return { board: next, score, merged, moved: next.some((value, index) => value !== board[index]) };
}

export function spawnTile(board, random) {
  const next = [...board];
  const empty = next
    .map((value, index) => (value === 0 ? index : -1))
    .filter((index) => index >= 0);
  if (!empty.length) return { board: next, index: -1, value: 0 };
  const index = empty[Math.floor(random() * empty.length)];
  const value = random() < 0.9 ? 2 : 4;
  next[index] = value;
  return { board: next, index, value };
}

export function generateMergeBoard(seed) {
  const random = rng(`${seed}:numbers`);
  return spawnTile(spawnTile(Array(16).fill(0), random).board, random).board;
}

export function hasMoves(board) {
  if (board.some((value) => value === 0)) return true;
  for (let i = 0; i < 16; i++) {
    if (i % 4 < 3 && board[i] === board[i + 1]) return true;
    if (i < 12 && board[i] === board[i + 4]) return true;
  }
  return false;
}
