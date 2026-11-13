import { label, roundRect } from '@playground/game-sdk';
import { FLOWER_PICROSS, generatePuzzles } from './puzzles.js';

export { countSolutions, FLOWER_PICROSS, generatePuzzles, lineClues } from './puzzles.js';

const GRID_X = 205;
const GRID_Y = 116;
const CELL = 54;
const keys = {
  arrowleft: [0, -1],
  a: [0, -1],
  arrowright: [0, 1],
  d: [0, 1],
  arrowup: [-1, 0],
  w: [-1, 0],
  arrowdown: [1, 0],
  s: [1, 0],
};

export const cellPoint = (index) => ({
  x: GRID_X + (index % FLOWER_PICROSS.size) * CELL + CELL / 2,
  y: GRID_Y + Math.floor(index / FLOWER_PICROSS.size) * CELL + CELL / 2,
});

function cellAt(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return -1;
  const column = Math.floor((point.x - GRID_X) / CELL);
  const row = Math.floor((point.y - GRID_Y) / CELL);
  if (row < 0 || row >= FLOWER_PICROSS.size || column < 0 || column >= FLOWER_PICROSS.size)
    return -1;
  return row * FLOWER_PICROSS.size + column;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const puzzles = generatePuzzles(seed);
  let round = 0;
  let rounds = 0;
  let board = Array(FLOWER_PICROSS.size ** 2).fill(false);
  let cursor = 0;
  let pressed = -1;
  let elapsed = 0;
  let moves = 0;
  let phase = 'play';
  let transition = 0;
  let history = [];
  let finished = false;
  let won = false;
  let message = '先读左侧行提示和上方列提示，再点亮第一格花瓣';

  const puzzle = () => puzzles[Math.min(round, puzzles.length - 1)];
  const solved = () => board.every((value, index) => value === puzzle().solution[index]);

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score: rounds * 400, elapsed, won, rounds });
  }

  function completeIfReady() {
    if (!solved()) return;
    rounds++;
    history = [];
    pressed = -1;
    sound('win');
    if (rounds === FLOWER_PICROSS.rounds) {
      message = '三扇花窗都亮起来了，花影正落满小屋！';
      finish(true);
      return;
    }
    phase = 'transition';
    transition = 0.7;
    message = `${puzzle().name}完成，下一扇花窗马上展开`;
  }

  function toggle(index) {
    if (phase !== 'play' || index < 0 || index >= board.length) return;
    cursor = index;
    history.push({ board: [...board], moves });
    board[index] = !board[index];
    moves++;
    message = board[index] ? '添上一格花瓣，再对照行列数字' : '收回这一格花瓣，空白也很重要';
    sound('tap');
    completeIfReady();
  }

  function undo() {
    if (phase !== 'play' || !history.length) {
      message = '现在还没有可以撤销的落笔';
      return;
    }
    const previous = history.pop();
    board = previous.board;
    moves = previous.moves;
    pressed = -1;
    message = '已撤销上一次落笔，计时仍会继续';
    sound('tap');
  }

  function moveCursor(rowStep, columnStep) {
    const row = Math.floor(cursor / FLOWER_PICROSS.size);
    const column = cursor % FLOWER_PICROSS.size;
    const nextRow = (row + rowStep + FLOWER_PICROSS.size) % FLOWER_PICROSS.size;
    const nextColumn = (column + columnStep + FLOWER_PICROSS.size) % FLOWER_PICROSS.size;
    cursor = nextRow * FLOWER_PICROSS.size + nextColumn;
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, FLOWER_PICROSS.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        if (phase === 'transition') {
          const step = Math.min(remaining, transition);
          elapsed += step;
          transition -= step;
          remaining -= step;
          if (transition <= 1e-9) {
            round = rounds;
            board = Array(FLOWER_PICROSS.size ** 2).fill(false);
            cursor = 0;
            history = [];
            phase = 'play';
            message = `第 ${round + 1} 扇是${puzzle().name}，从行列提示慢慢找起`;
          }
          continue;
        }
        elapsed += remaining;
        remaining = 0;
      }
      if (!finished && elapsed >= FLOWER_PICROSS.limit - 1e-9) finish(false);
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = -1;
        return;
      }
      if (finished || phase !== 'play') return;
      if (type === 'primary-down') pressed = cellAt(payload);
      if (type === 'primary-up') {
        const index = cellAt(payload);
        if (index === pressed) toggle(index);
        pressed = -1;
      }
      if (type === 'undo') undo();
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (keys[key]) moveCursor(...keys[key]);
        if (key === ' ' || key === 'enter') toggle(cursor);
        if (key === 'z' || key === 'backspace' || key === 'delete') undo();
      }
    },
    getState() {
      return {
        elapsed,
        score: rounds * 400,
        rounds,
        round,
        phase,
        board: [...board],
        puzzle: {
          ...puzzle(),
          solution: [...puzzle().solution],
          rowClues: puzzle().rowClues.map((clues) => [...clues]),
          columnClues: puzzle().columnClues.map((clues) => [...clues]),
        },
        cursor,
        moves,
        finished,
        won,
        extra: `${rounds} / 3 · 已落笔 ${moves} 格`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f4eddf';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '花窗点彩', 300, 26, 27);
      label(ctx, `第 ${Math.min(round + 1, 3)} 扇 · ${puzzle().name}`, 300, 53, 14, '#68766a');

      roundRect(ctx, 42, 76, 516, 330, 30, '#ddcfb7');
      roundRect(ctx, 54, 88, 492, 306, 24, '#fff8e8');

      for (let column = 0; column < FLOWER_PICROSS.size; column++) {
        const clues = puzzle().columnClues[column];
        clues.forEach((clue, clueIndex) => {
          const text = clue === 0 ? '·' : clue;
          label(
            ctx,
            text,
            GRID_X + column * CELL + CELL / 2,
            102 - (clues.length - 1 - clueIndex) * 16,
            14,
            '#6c6e61',
          );
        });
      }

      for (let row = 0; row < FLOWER_PICROSS.size; row++) {
        const clues = puzzle().rowClues[row];
        label(
          ctx,
          clues.map((clue) => (clue === 0 ? '·' : clue)).join('  '),
          178,
          GRID_Y + row * CELL + CELL / 2,
          15,
          '#6c6e61',
          'right',
        );
      }

      for (let index = 0; index < board.length; index++) {
        const column = index % FLOWER_PICROSS.size;
        const row = Math.floor(index / FLOWER_PICROSS.size);
        const x = GRID_X + column * CELL;
        const y = GRID_Y + row * CELL;
        roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 10, board[index] ? '#d98278' : '#f2ead9');
        ctx.strokeStyle = cursor === index ? '#526f5d' : '#d4c3a5';
        ctx.lineWidth = cursor === index ? 4 : 2;
        ctx.stroke();
        if (board[index]) {
          const centerX = x + CELL / 2;
          const centerY = y + CELL / 2;
          ctx.fillStyle = '#fff2da';
          for (const angle of [0, Math.PI / 2]) {
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, 7, 16, angle, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#efd073';
          ctx.fill();
        }
      }

      roundRect(ctx, 65, 418, 470, 28, 14, '#fff8e7');
      label(ctx, message, 300, 432, 13, '#617064');
      label(ctx, '点格填花 · 方向键 / WASD 移动 · 空格切换 · Z 撤销', 300, 465, 12, '#77746a');
    },
    destroy() {
      finished = true;
      board = [];
      history = [];
      pressed = -1;
    },
  };
}
