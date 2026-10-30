import { rng } from '@playground/game-sdk';
const SIZE = 4;
export function toggledBoard(board, index) {
  const next = [...board];
  if (!Number.isInteger(index) || index < 0 || index >= 16) return next;
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  for (const [dr, dc] of [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) next[r * SIZE + c] ^= 1;
  }
  return next;
}

export function generateLights(seed) {
  const random = rng(seed);
  const positions = Array.from({ length: 16 }, (_, i) => i);
  for (let i = 15; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  const solution = positions.slice(0, 5 + Math.floor(random() * 5));
  let board = Array(16).fill(0);
  for (const index of solution) board = toggledBoard(board, index);
  if (board.every((value) => value === 0)) {
    solution.push(positions[solution.length]);
    board = toggledBoard(board, solution[solution.length - 1]);
  }
  return { board, solution };
}
