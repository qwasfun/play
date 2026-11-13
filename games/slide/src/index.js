import { cottage } from './cottage.js';
import { createCampaignGame } from './campaign-engine.js';
import { rng, roundRect, label } from '@playground/game-sdk';

const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0],
  X = 124,
  Y = 62,
  STEP = 120,
  SIZE = 112,
  LIMIT = 180;
const isSolved = (board) => board.every((value, index) => value === GOAL[index]);
export function slideNeighbors(cell) {
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) return [];
  const x = cell % 3,
    y = Math.floor(cell / 3),
    neighbors = [];
  if (y > 0) neighbors.push(cell - 3);
  if (x < 2) neighbors.push(cell + 1);
  if (y < 2) neighbors.push(cell + 3);
  if (x > 0) neighbors.push(cell - 1);
  return neighbors;
}
export function generateSlide(seed) {
  const random = rng(`${seed}:cozy-slide`),
    board = [...GOAL],
    history = [];
  const count = 20 + Math.floor(random() * 9);
  let blank = 8,
    previous = -1;
  for (let i = 0; i < count; i++) {
    const choices = slideNeighbors(blank).filter((cell) => cell !== previous),
      next = choices[Math.floor(random() * choices.length)];
    history.push(blank);
    [board[blank], board[next]] = [board[next], board[blank]];
    previous = blank;
    blank = next;
  }
  // A legal walk can close a loop. Always leave a deliberate, solvable puzzle.
  if (isSolved(board)) {
    const next = slideNeighbors(blank)[0];
    history.push(blank);
    [board[blank], board[next]] = [board[next], board[blank]];
    blank = next;
  }
  return { board, blank, solution: history.reverse() };
}
export function moveSlide(board, cell) {
  const blank = board.indexOf(0);
  if (!slideNeighbors(blank).includes(cell)) return { board: [...board], blank, moved: false };
  const next = [...board];
  [next[blank], next[cell]] = [next[cell], next[blank]];
  return { board: next, blank: cell, moved: true };
}
function cellAt(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return -1;
  const col = Math.floor((x - X + 4) / STEP),
    row = Math.floor((y - Y + 4) / STEP);
  return col >= 0 && col < 3 && row >= 0 && row < 3 ? row * 3 + col : -1;
}

export function createGame({ level, seed, onFinish = () => {}, sound = () => {} }) {
  if (level) return createCampaignGame({ level, onFinish, sound });
  const puzzle = generateSlide(seed),
    history = [];
  let board = [...puzzle.board],
    blank = puzzle.blank,
    elapsed = 0,
    moves = 0,
    pressed = -1,
    finished = false,
    won = false;
  let message = '把相邻的小方块，滑进空着的位置';
  const correct = () => board.filter((value, index) => value !== 0 && value === GOAL[index]).length;
  const score = () => (won ? 300 + Math.max(0, 200 - moves * 5) : correct() * 20);
  function finish(reason) {
    if (finished) return;
    finished = true;
    pressed = -1;
    onFinish({ score: score(), elapsed, won, moves, steps: moves, reason });
  }
  function move(cell) {
    if (finished) return;
    const next = moveSlide(board, cell);
    if (!next.moved) {
      message = '只能移动空格上下左右相邻的方块';
      return;
    }
    history.push({ board: [...board], blank });
    board = next.board;
    blank = next.blank;
    moves++;
    sound('tap');
    message = '按 1 到 8 排好，小屋就回到画里了';
    if (isSolved(board)) {
      won = true;
      sound('win');
      finish('complete');
    }
  }
  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      elapsed = Math.min(LIMIT, elapsed + dt);
      if (elapsed >= LIMIT) finish('time');
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = -1;
        return;
      }
      if (finished) return;
      if (type === 'undo') {
        pressed = -1;
        const last = history.pop();
        if (last) {
          board = last.board;
          blank = last.blank;
          message = '退回了一步，已计步数保留';
          sound('tap');
        }
        return;
      }
      if (type === 'primary-down') pressed = cellAt(payload.x, payload.y);
      if (type === 'primary-up') {
        const cell = cellAt(payload.x, payload.y),
          origin = pressed;
        pressed = -1;
        if (cell >= 0 && cell === origin) move(cell);
      }
      if (type !== 'key-down' || payload.repeat) return;
      const key = String(payload.key).toLowerCase();
      const [dx, dy] = {
        arrowup: [0, -1],
        w: [0, -1],
        arrowdown: [0, 1],
        s: [0, 1],
        arrowleft: [-1, 0],
        a: [-1, 0],
        arrowright: [1, 0],
        d: [1, 0],
      }[key] || [0, 0];
      if (!dx && !dy) return;
      const x = (blank % 3) + dx,
        y = Math.floor(blank / 3) + dy;
      if (x >= 0 && x < 3 && y >= 0 && y < 3) move(y * 3 + x);
    },
    getState() {
      return {
        board: [...board],
        blank,
        elapsed,
        moves,
        steps: moves,
        score: score(),
        finished,
        won,
        canUndo: history.length > 0,
        extra: `正确 ${correct()} / 8`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f2e5d9';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '把小屋，慢慢拼回温柔的原样。', 300, 25, 16, '#9a7d6c', 'center', 600);
      roundRect(ctx, X - 11, Y - 11, 374, 374, 24, '#cfb29b');
      for (let i = 0; i < 9; i++) {
        const x = X + (i % 3) * STEP,
          y = Y + Math.floor(i / 3) * STEP,
          value = board[i];
        roundRect(ctx, x, y, SIZE, SIZE, 12, value ? '#c7ad95' : '#bba68f');
        if (!value) {
          label(ctx, '⌂', x + 56, y + 57, 28, '#e4d4bc', 'center', 400);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, SIZE, SIZE, 12);
        ctx.clip();
        const source = value - 1;
        cottage(ctx, x - (source % 3) * STEP, y - Math.floor(source / 3) * STEP);
        ctx.restore();
        roundRect(ctx, x + 7, y + 7, 25, 25, 7, '#fff8e8');
        label(ctx, value, x + 19.5, y + 19.5, 15, '#98785e', 'center', 750);
        if (value === GOAL[i]) {
          ctx.save();
          ctx.strokeStyle = '#8fa57b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x + 1, y + 1, SIZE - 2, SIZE - 2, 11);
          ctx.stroke();
          ctx.restore();
        }
        if (slideNeighbors(blank).includes(i)) {
          ctx.save();
          ctx.strokeStyle = '#fff4cd';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, SIZE - 4, SIZE - 4, 11);
          ctx.stroke();
          ctx.restore();
        }
      }
      label(
        ctx,
        `已移动 ${moves} 步 · 目标：1 2 3 / 4 5 6 / 7 8 □`,
        300,
        445,
        13,
        '#997b67',
        'center',
        600,
      );
      label(ctx, '点击邻格 / 方向键移动空格 · 可撤销', 300, 466, 12, '#a8917a', 'center', 500);
    },
    destroy() {
      pressed = -1;
      finished = true;
      history.length = 0;
    },
  };
}
