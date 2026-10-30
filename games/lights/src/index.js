import { createCampaignGame } from './campaign-engine.js';
import { rng, roundRect, label } from '@playground/game-sdk';

const SIZE = 4;
const LIMIT = 180;
const TILE = 86;
const GAP = 10;
const BOARD_X = 113;
const BOARD_Y = 48;

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

function tileAt(x, y) {
  const col = Math.floor((x - BOARD_X + GAP / 2) / (TILE + GAP));
  const row = Math.floor((y - BOARD_Y + GAP / 2) / (TILE + GAP));
  if (col < 0 || col >= 4 || row < 0 || row >= 4) return -1;
  return row * 4 + col;
}

export function createGame({ level, seed, onFinish = () => {}, sound = () => {} }) {
  if (level) return createCampaignGame({ level, onFinish, sound });
  let board = generateLights(seed).board;
  let elapsed = 0;
  let steps = 0;
  let selected = 0;
  let pressed = -1;
  let finished = false;
  let won = false;
  const history = [];

  function finish(reason) {
    if (finished) return;
    finished = true;
    onFinish({ score: steps, steps, elapsed, won, reason });
  }

  function toggle(index) {
    if (finished || index < 0) return;
    history.push([...board]);
    board = toggledBoard(board, index);
    selected = index;
    steps++;
    sound('tap');
    if (board.every((value) => value === 0)) {
      won = true;
      sound('win');
      finish('solved');
    }
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      elapsed = Math.min(LIMIT, elapsed + dt);
      if (elapsed >= LIMIT) finish('time');
    },
    input(type, payload = {}) {
      if (finished) return;
      if (type === 'primary-down') pressed = tileAt(payload.x, payload.y);
      if (type === 'primary-up') {
        const index = tileAt(payload.x, payload.y);
        if (index >= 0 && index === pressed) toggle(index);
        pressed = -1;
      }
      if (type === 'primary-cancel') pressed = -1;
      if (type === 'undo' && history.length) {
        board = history.pop();
        pressed = -1;
        sound('tap');
      }
      if (type !== 'key-down' || payload.repeat) return;
      const key = payload.key;
      let row = Math.floor(selected / 4);
      let col = selected % 4;
      if (key === 'ArrowUp') row = (row + 3) % 4;
      else if (key === 'ArrowDown') row = (row + 1) % 4;
      else if (key === 'ArrowLeft') col = (col + 3) % 4;
      else if (key === 'ArrowRight') col = (col + 1) % 4;
      else if (key === ' ' || key === 'Enter') toggle(selected);
      else return;
      selected = row * 4 + col;
    },
    getState() {
      const lit = board.reduce((sum, value) => sum + value, 0);
      return {
        score: steps,
        steps,
        elapsed,
        won,
        finished,
        progress: `${lit} 盏灯还亮着`,
        hint: '点击翻转十字区域 · 熄灭全部灯光',
        board: [...board],
        selected,
        canUndo: history.length > 0,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f1edf8';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '给这座小灯塔，道一声晚安。', 300, 26, 16, '#76678c', 'center', 500);
      roundRect(ctx, BOARD_X - 14, BOARD_Y - 14, 402, 402, 26, '#e3daee');
      for (let i = 0; i < 16; i++) {
        const x = BOARD_X + (i % 4) * (TILE + GAP);
        const y = BOARD_Y + Math.floor(i / 4) * (TILE + GAP);
        roundRect(ctx, x, y + 4, TILE, TILE, 17, '#c8bdd9');
        roundRect(ctx, x, y, TILE, TILE, 17, board[i] ? '#ffedb7' : '#ded5ec');
        if (selected === i) {
          ctx.save();
          ctx.strokeStyle = '#7d5ba4';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.roundRect(x - 3, y - 3, TILE + 6, TILE + 6, 19);
          ctx.stroke();
          ctx.restore();
        }
        label(
          ctx,
          String(i + 1).padStart(2, '0'),
          x + 15,
          y + 18,
          10,
          board[i] ? '#ad8d43' : '#a299b3',
          'center',
          600,
        );
        const cx = x + TILE / 2;
        const cy = y + 39;
        if (board[i]) {
          ctx.save();
          ctx.shadowColor = '#ffd153';
          ctx.shadowBlur = 18;
          ctx.fillStyle = '#ffcb4d';
          ctx.beginPath();
          ctx.arc(cx, cy, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = '#b7aacb';
          ctx.beginPath();
          ctx.arc(cx, cy, 15, 0, Math.PI * 2);
          ctx.fill();
        }
        roundRect(ctx, cx - 9, cy + 12, 18, 7, 3, board[i] ? '#b69c64' : '#9687ad');
        roundRect(ctx, cx - 6, cy + 19, 12, 4, 2, board[i] ? '#a38b59' : '#8a7a9f');
        if (board[i]) {
          ctx.strokeStyle = '#fff8dd';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx - 6, cy - 5);
          ctx.lineTo(cx - 3, cy + 5);
          ctx.lineTo(cx + 3, cy + 5);
          ctx.lineTo(cx + 6, cy - 5);
          ctx.stroke();
        }
      }
      label(ctx, '方向键选择 · 空格翻转 · 需要时可以撤销', 300, 458, 14, '#76678c', 'center', 500);
    },
    destroy() {
      pressed = -1;
    },
  };
}
