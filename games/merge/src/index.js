import {createCampaignGame} from './campaign-engine.js';
import { rng, roundRect, label } from '@playground/game-sdk';

const LIMIT = 180;
const TARGET = 128;
const CELL = 86;
const GAP = 10;
const X = 113;
const Y = 48;
const DIRECTIONS = ['left', 'right', 'up', 'down'];
const PALETTE = {
  2: ['#f2ded4', '#8b6c64'], 4: ['#eed8b7', '#98794f'],
  8: ['#eab68f', '#78563d'], 16: ['#e69c8d', '#fff8e8'],
  32: ['#cf8f9d', '#fff8e8'], 64: ['#ab91b9', '#fff9ee'],
  128: ['#83a98e', '#fffde8'],
};

export {moveBoard,spawnTile,generateMergeBoard,hasMoves} from './model.js';
import {moveBoard,spawnTile,hasMoves} from './model.js';
function validInitial(board) {
  return Array.isArray(board) && board.length === 16 && board.every(value => Number.isInteger(value) && value >= 0 && value <= TARGET && (value === 0 || value >= 2 && (value & (value - 1)) === 0));
}

export function createGame({level:campaignLevel, seed, onFinish = () => {}, sound = () => {}, initialBoard }) {
  if(campaignLevel)return createCampaignGame({level:campaignLevel,onFinish,sound});
  const random = rng(`${seed}:numbers`);
  let board = spawnTile(spawnTile(Array(16).fill(0), random).board, random).board;
  if (validInitial(initialBoard)) board = [...initialBoard];
  let elapsed = 0;
  let score = 0;
  let moves = 0;
  let start = null;
  let finished = false;
  let won = false;
  let flashTime = 0;
  let flashTiles = [];
  let message = '滑动数字，让相同的数字靠在一起';

  function finish(reason) {
    if (finished) return;
    finished = true;
    start = null;
    onFinish({ score, elapsed, won, reason });
  }

  function move(direction) {
    if (finished) return;
    const result = moveBoard(board, direction);
    if (!result.moved) {
      message = '这个方向挪不动，换个方向试试';
      if (!hasMoves(board)) finish('blocked');
      return;
    }
    const spawned = spawnTile(result.board, random);
    board = spawned.board;
    score += result.score;
    moves++;
    flashTime = .2;
    flashTiles = [...result.merged, spawned.index];
    message = result.score ? `合并 +${result.score} 分 · 再靠近 128 一点` : '给数字留点空间，下一步会更好';
    sound(result.score ? 'collect' : 'tap');
    if (board.some(value => value >= TARGET)) {
      won = true;
      sound('win');
      finish('complete');
    } else if (!hasMoves(board)) {
      sound('hit');
      finish('blocked');
    }
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      if (board.some(value => value >= TARGET)) { won = true; finish('complete'); return; }
      if (!hasMoves(board)) { finish('blocked'); return; }
      elapsed = Math.min(LIMIT, elapsed + dt);
      flashTime = Math.max(0, flashTime - dt);
      if (elapsed >= LIMIT) finish('time');
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') { start = null; return; }
      if (finished) return;
      if (type === 'primary-down' && Number.isFinite(payload.x) && Number.isFinite(payload.y)) start = { x: payload.x, y: payload.y };
      if (type === 'primary-up') {
        const origin = start;
        start = null;
        if (!origin || !Number.isFinite(payload.x) || !Number.isFinite(payload.y)) return;
        const dx = payload.x - origin.x;
        const dy = payload.y - origin.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        move(Math.abs(dx) >= Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down');
      }
      if (type !== 'key-down' || payload.repeat) return;
      const mapping = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' };
      const direction = mapping[String(payload.key).toLowerCase()];
      if (direction) move(direction);
    },
    getState() {
      const max = Math.max(...board);
      return { score, elapsed, moves, won, finished, board: [...board], extra: `最大 ${max}`, progress: `${max} / ${TARGET}`, hint: message, swiping: start !== null };
    },
    draw(ctx) {
      ctx.fillStyle = '#f7efe3';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '一点点合并，一点点接近 128。', 300, 26, 16, '#9a7e69', 'center', 600);
      roundRect(ctx, X - 14, Y - 14, 402, 402, 25, '#e4d4c3');
      for (let i = 0; i < 16; i++) {
        const x = X + i % 4 * (CELL + GAP);
        const y = Y + Math.floor(i / 4) * (CELL + GAP);
        const value = board[i];
        const [fill, ink] = PALETTE[value] || ['#efe5d7', '#9b816c'];
        roundRect(ctx, x, y + (value ? 4 : 0), CELL, CELL, 16, value ? '#cebaa8' : '#eadecf');
        roundRect(ctx, x, y, CELL, CELL, 16, fill);
        if (value) {
          if (flashTime > 0 && flashTiles.includes(i)) {
            ctx.save();
            ctx.globalAlpha = flashTime / .2 * .55;
            roundRect(ctx, x + 3, y + 3, CELL - 6, CELL - 6, 13, null, '#fff8dd');
            ctx.restore();
          }
          label(ctx, value, x + CELL / 2, y + CELL / 2 + 1, value < 100 ? 32 : 27, ink, 'center', 800);
          ctx.fillStyle = ink;
          ctx.globalAlpha = .2;
          ctx.beginPath();
          ctx.arc(x + CELL - 14, y + 14, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      label(ctx, '滑动屏幕 / 方向键 / WASD', 300, 456, 14, '#9c8572', 'center', 500);
    },
    destroy() { start = null; },
  };
}
