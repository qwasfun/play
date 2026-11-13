import { roundRect, label } from '@playground/game-sdk';
import { generatePuzzle, conflictCells, isSolved } from './puzzle.js';

export { generatePuzzle, conflictCells, isSolved } from './puzzle.js';

const LIMIT = 180,
  GRID_X = 148,
  GRID_Y = 94,
  CELL = 76;
const names = ['', '青茶', '花糕', '梅果', '月饼'];
const colors = ['', '#7f9f7f', '#d48f82', '#c8a45c', '#8d7fa1'];

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  let elapsed = 0,
    rounds = 0,
    steps = 0,
    finished = false,
    won = false,
    cursor = 0,
    pressed = -1,
    history = [],
    message = '选择空格，依次切换四种茶点',
    puzzle = generatePuzzle(seed, 0),
    board = [...puzzle.board];

  const firstEditable = () => puzzle.fixed.findIndex((value) => !value);
  cursor = firstEditable();

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score: rounds * 100, elapsed, won, rounds, steps });
  }

  function loadRound(round) {
    puzzle = generatePuzzle(seed, round);
    board = [...puzzle.board];
    history = [];
    cursor = firstEditable();
  }

  function undo() {
    if (!history.length) {
      message = '这一张茶席还没有可撤销的填写';
      return;
    }
    board = history.pop();
    message = '已撤销，步数和时间保留';
  }

  function act(index) {
    if (!Number.isInteger(index) || index < 0 || index >= 16) return;
    cursor = index;
    if (puzzle.fixed[index]) {
      message = '这份茶点已经摆好，换一个空格吧';
      return;
    }
    history.push([...board]);
    board[index] = (board[index] + 1) % 5;
    steps++;
    sound('tap');
    const conflicts = conflictCells(board);
    message = conflicts.size ? '有茶点重复了，再调整一下' : '摆得很整齐，继续看看空格';
    if (!isSolved(board)) return;
    rounds++;
    sound('win');
    if (rounds === 3) finish(true);
    else {
      loadRound(rounds);
      message = '这一张完成了，铺开下一张茶席';
    }
  }

  function hit(point) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return -1;
    const column = Math.floor((point.x - GRID_X) / CELL),
      row = Math.floor((point.y - GRID_Y) / CELL);
    return row >= 0 && row < 4 && column >= 0 && column < 4 ? row * 4 + column : -1;
  }

  function moveCursor(dr, dc) {
    const row = Math.floor(cursor / 4),
      column = cursor % 4;
    cursor = ((row + dr + 4) % 4) * 4 + ((column + dc + 4) % 4);
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      elapsed = Math.min(LIMIT, elapsed + dt);
      if (elapsed >= LIMIT) finish(false);
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = -1;
        return;
      }
      if (finished) return;
      if (type === 'undo') undo();
      if (type === 'primary-down') pressed = hit(payload);
      if (type === 'primary-up') {
        const index = hit(payload);
        if (index >= 0 && index === pressed) act(index);
        pressed = -1;
      }
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (key === 'arrowup' || key === 'w') moveCursor(-1, 0);
        if (key === 'arrowdown' || key === 's') moveCursor(1, 0);
        if (key === 'arrowleft' || key === 'a') moveCursor(0, -1);
        if (key === 'arrowright' || key === 'd') moveCursor(0, 1);
        if (key === ' ' || key === 'enter') act(cursor);
        if (key === 'z' || key === 'backspace') undo();
      }
    },
    getState() {
      return {
        board: [...board],
        fixed: [...puzzle.fixed],
        elapsed,
        score: rounds * 100,
        rounds,
        steps,
        finished,
        won,
        cursor,
        conflicts: [...conflictCells(board)],
        extra: `${rounds} / 3 · ${steps} 步`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f6eedc';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '茶席四方', 300, 31, 27);
      label(ctx, `第 ${Math.min(rounds + 1, 3)} 张 · 行、列、小席都各不重复`, 300, 65, 17);
      const conflicts = conflictCells(board);
      roundRect(ctx, GRID_X - 13, GRID_Y - 13, CELL * 4 + 26, CELL * 4 + 26, 22, '#ddcfb4');
      for (let index = 0; index < 16; index++) {
        const row = Math.floor(index / 4),
          column = index % 4,
          x = GRID_X + column * CELL,
          y = GRID_Y + row * CELL,
          value = board[index];
        roundRect(
          ctx,
          x + 3,
          y + 3,
          CELL - 6,
          CELL - 6,
          13,
          puzzle.fixed[index] ? '#e2e8d4' : '#fffaf0',
          conflicts.has(index) ? '#c66f62' : cursor === index ? '#6f8c77' : '#bca888',
        );
        if (value) {
          ctx.fillStyle = colors[value];
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + 29, 18, 0, Math.PI * 2);
          ctx.fill();
          label(ctx, String(value), x + CELL / 2, y + 29, 15, '#fffaf0');
          label(ctx, names[value], x + CELL / 2, y + 57, 13);
        } else label(ctx, '＋', x + CELL / 2, y + CELL / 2, 24, '#c2ae8e');
      }
      ctx.fillStyle = '#a68d68';
      ctx.fillRect(GRID_X + CELL * 2 - 3, GRID_Y + 3, 6, CELL * 4 - 6);
      ctx.fillRect(GRID_X + 3, GRID_Y + CELL * 2 - 3, CELL * 4 - 6, 6);
      label(ctx, message, 300, 439, 16, conflicts.size ? '#a85f55' : '#526f63');
      label(ctx, '点击或空格循环 · Z 撤销', 300, 465, 14, '#7a786b');
    },
    destroy() {
      finished = true;
      pressed = -1;
      history = [];
    },
  };
}
