import { label, roundRect } from '@playground/game-sdk';
import { FLOWER_LATIN, generatePuzzles } from './puzzles.js';

export { countSolutions, FLOWER_LATIN, generatePuzzles } from './puzzles.js';

const GRID_X = 124;
const GRID_Y = 72;
const CELL = 88;
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
  x: GRID_X + (index % FLOWER_LATIN.size) * CELL + CELL / 2,
  y: GRID_Y + Math.floor(index / FLOWER_LATIN.size) * CELL + CELL / 2,
});

function cellAt(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return -1;
  const column = Math.floor((point.x - GRID_X) / CELL);
  const row = Math.floor((point.y - GRID_Y) / CELL);
  if (row < 0 || row >= FLOWER_LATIN.size || column < 0 || column >= FLOWER_LATIN.size) return -1;
  return row * FLOWER_LATIN.size + column;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const puzzles = generatePuzzles(seed);
  let round = 0;
  let rounds = 0;
  let board = [...puzzles[0].givens];
  let cursor = puzzles[0].givens.findIndex((value) => value === 0);
  let pressed = -1;
  let elapsed = 0;
  let moves = 0;
  let phase = 'play';
  let transition = 0;
  let history = [];
  let finished = false;
  let won = false;
  let message = '木牌数字是提示，从任意空格开始补齐花序';

  const puzzle = () => puzzles[Math.min(round, puzzles.length - 1)];
  const solved = () => board.every((value, index) => value === puzzle().solution[index]);
  const editable = (index) => index >= 0 && index < board.length && puzzle().givens[index] === 0;

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
    if (rounds === FLOWER_LATIN.rounds) {
      message = '三张花笺都排得整整齐齐，花香也跟着舒展开了！';
      finish(true);
      return;
    }
    phase = 'transition';
    transition = 0.7;
    message = `${puzzle().name}完成，下一张花笺马上铺开`;
  }

  function cycle(index) {
    if (phase !== 'play' || !editable(index)) {
      if (phase === 'play' && index >= 0) message = '木牌上的数字是固定提示，去试试浅色空格吧';
      return;
    }
    cursor = index;
    history.push({ board: [...board], moves });
    board[index] = (board[index] + 1) % 5;
    moves++;
    message = board[index]
      ? `填入 ${board[index]}，看看这一行和这一列有没有重复`
      : '把这一格暂时留空，再从相邻花格找线索';
    sound('tap');
    completeIfReady();
  }

  function undo() {
    if (phase !== 'play' || !history.length) {
      message = '现在还没有可以撤销的填写';
      return;
    }
    const previous = history.pop();
    board = previous.board;
    moves = previous.moves;
    pressed = -1;
    message = '已撤销上一次填写，计时仍会继续';
    sound('tap');
  }

  function moveCursor(rowStep, columnStep) {
    const row = Math.floor(cursor / FLOWER_LATIN.size);
    const column = cursor % FLOWER_LATIN.size;
    const nextRow = (row + rowStep + FLOWER_LATIN.size) % FLOWER_LATIN.size;
    const nextColumn = (column + columnStep + FLOWER_LATIN.size) % FLOWER_LATIN.size;
    cursor = nextRow * FLOWER_LATIN.size + nextColumn;
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, FLOWER_LATIN.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        if (phase === 'transition') {
          const step = Math.min(remaining, transition);
          elapsed += step;
          transition -= step;
          remaining -= step;
          if (transition <= 1e-9) {
            round = rounds;
            board = [...puzzle().givens];
            cursor = puzzle().givens.findIndex((value) => value === 0);
            history = [];
            phase = 'play';
            message = `第 ${round + 1} 张是${puzzle().name}，先找提示最多的行列`;
          }
          continue;
        }
        elapsed += remaining;
        remaining = 0;
      }
      if (!finished && elapsed >= FLOWER_LATIN.limit - 1e-9) finish(false);
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
        if (index === pressed) cycle(index);
        pressed = -1;
      }
      if (type === 'undo') undo();
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (keys[key]) moveCursor(...keys[key]);
        if (key === ' ' || key === 'enter') cycle(cursor);
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
          givens: [...puzzle().givens],
          solution: [...puzzle().solution],
        },
        cursor,
        moves,
        finished,
        won,
        extra: `${rounds} / 3 · 已填 ${board.filter(Boolean).length - puzzle().givens.filter(Boolean).length} 格`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f4eddf';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '花格成序', 300, 25, 27);
      label(ctx, `第 ${Math.min(round + 1, 3)} 张 · ${puzzle().name}`, 300, 51, 14, '#68766a');

      roundRect(ctx, 106, 59, 388, 378, 28, '#d7c5aa');
      roundRect(ctx, 116, 67, 368, 362, 22, '#fff8e9');

      for (let index = 0; index < board.length; index++) {
        const column = index % FLOWER_LATIN.size;
        const row = Math.floor(index / FLOWER_LATIN.size);
        const x = GRID_X + column * CELL;
        const y = GRID_Y + row * CELL;
        const fixed = puzzle().givens[index] !== 0;
        roundRect(ctx, x + 3, y + 3, CELL - 6, CELL - 6, 15, fixed ? '#e7d4b5' : '#f6eddd');
        ctx.strokeStyle = cursor === index ? '#526f5d' : fixed ? '#c39c72' : '#ddccb0';
        ctx.lineWidth = cursor === index ? 4 : 2;
        ctx.stroke();
        if (board[index]) {
          const centerX = x + CELL / 2;
          const centerY = y + CELL / 2;
          ctx.fillStyle = ['#d98278', '#6f9b83', '#d1a84f', '#7e83a9'][board[index] - 1];
          ctx.globalAlpha = fixed ? 0.34 : 0.22;
          for (const angle of [0, Math.PI / 2]) {
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, 15, 28, angle, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          label(ctx, board[index], centerX, centerY + 1, 31, fixed ? '#765f49' : '#4f6558');
          if (fixed) {
            ctx.beginPath();
            ctx.arc(x + CELL - 15, y + 15, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ad825e';
            ctx.fill();
          }
        }
      }

      label(ctx, message, 300, 449, 13, '#617064');
      label(ctx, '点格换数 · 方向键 / WASD 移动 · 空格切换 · Z 撤销', 300, 469, 12, '#77746a');
    },
    destroy() {
      finished = true;
      board = [];
      history = [];
      pressed = -1;
    },
  };
}
