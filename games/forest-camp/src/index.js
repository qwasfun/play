import { label, roundRect } from '@playground/game-sdk';
import { evaluateCamp, FOREST_CAMP, generatePuzzles } from './puzzles.js';

export { countSolutions, evaluateCamp, FOREST_CAMP, generatePuzzles } from './puzzles.js';

const GRID_X = 102;
const GRID_Y = 64;
const CELL = 60;
const moveKeys = new Map([
  ['arrowleft', [0, -1]],
  ['a', [0, -1]],
  ['arrowright', [0, 1]],
  ['d', [0, 1]],
  ['arrowup', [-1, 0]],
  ['w', [-1, 0]],
  ['arrowdown', [1, 0]],
  ['s', [1, 0]],
]);

export const cellPoint = (index) => ({
  x: GRID_X + (index % FOREST_CAMP.size) * CELL + CELL / 2,
  y: GRID_Y + Math.floor(index / FOREST_CAMP.size) * CELL + CELL / 2,
});

function cellAt(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return -1;
  const column = Math.floor((point.x - GRID_X) / CELL);
  const row = Math.floor((point.y - GRID_Y) / CELL);
  if (row < 0 || row >= FOREST_CAMP.size || column < 0 || column >= FOREST_CAMP.size) return -1;
  return row * FOREST_CAMP.size + column;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const puzzles = generatePuzzles(seed);
  let round = 0;
  let rounds = 0;
  let board = Array(FOREST_CAMP.size ** 2).fill(0);
  let cursor = 0;
  let pressed = -1;
  let elapsed = 0;
  let moves = 0;
  let phase = 'play';
  let transition = 0;
  let history = [];
  let finished = false;
  let won = false;
  let message = '先看数字为零或二的行列，给帐篷找一块安静空地';

  const puzzle = () => puzzles[Math.min(round, puzzles.length - 1)];
  const treeSet = () => new Set(puzzle().trees);
  const status = () => evaluateCamp(puzzle(), board);

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score: rounds * FOREST_CAMP.score, elapsed, won, rounds });
  }

  function completeIfReady() {
    if (!status().solved) return;
    rounds++;
    history = [];
    pressed = -1;
    sound('win');
    if (rounds === FOREST_CAMP.rounds) {
      message = '三处营地都安顿好啦，树叶正替小帐篷轻轻遮风！';
      finish(true);
      return;
    }
    phase = 'transition';
    transition = 0.7;
    message = `${puzzle().name}亮起灯火，下一片林地正慢慢展开`;
  }

  function cycle(index) {
    if (phase !== 'play' || index < 0 || index >= board.length) return;
    cursor = index;
    if (treeSet().has(index)) {
      message = '小树的位置不能改变，帐篷要搭在它上下左右的空地';
      sound('miss');
      return;
    }
    history.push({ board: [...board], moves });
    board[index] = (board[index] + 1) % 3;
    moves++;
    sound('tap');

    if (board[index] === 2) {
      message = '这格记作草叶，方便排除；再点一次可以清空';
      return;
    }
    if (board[index] === 0) {
      message = '已把这格恢复为空地，再从行列数字找线索';
      return;
    }

    const current = status();
    const [row, column] = [Math.floor(index / FOREST_CAMP.size), index % FOREST_CAMP.size];
    if (!current.besideTree) message = '帐篷必须搭在一棵树的上下或左右';
    else if (!current.separated) message = '帐篷挨得太近啦，连斜角也要留出一格';
    else if (current.rows[row] > puzzle().rows[row]) message = '这一行的帐篷超过右侧数字了';
    else if (current.columns[column] > puzzle().columns[column])
      message = '这一列的帐篷超过上方数字了';
    else message = `已搭 ${current.tents.length}/${puzzle().trees.length} 顶帐篷，继续核对行列数字`;
    completeIfReady();
  }

  function undo() {
    if (phase !== 'play' || !history.length) {
      message = '现在还没有可以撤销的安营动作';
      return;
    }
    const previous = history.pop();
    board = previous.board;
    moves = previous.moves;
    pressed = -1;
    message = '已撤销上一次标记，计时仍会继续';
    sound('tap');
  }

  function moveCursor(rowStep, columnStep) {
    const row = Math.floor(cursor / FOREST_CAMP.size);
    const column = cursor % FOREST_CAMP.size;
    const nextRow = (row + rowStep + FOREST_CAMP.size) % FOREST_CAMP.size;
    const nextColumn = (column + columnStep + FOREST_CAMP.size) % FOREST_CAMP.size;
    cursor = nextRow * FOREST_CAMP.size + nextColumn;
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, FOREST_CAMP.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        if (phase === 'transition') {
          const step = Math.min(remaining, transition);
          elapsed += step;
          transition -= step;
          remaining -= step;
          if (transition <= 1e-9) {
            round = rounds;
            board = Array(FOREST_CAMP.size ** 2).fill(0);
            cursor = 0;
            history = [];
            phase = 'play';
            message = `第 ${round + 1} 处是${puzzle().name}，先找帐篷数最多的行列`;
          }
          continue;
        }
        elapsed += remaining;
        remaining = 0;
      }
      if (!finished && elapsed >= FOREST_CAMP.limit - 1e-9) finish(false);
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
        if (moveKeys.has(key)) moveCursor(...moveKeys.get(key));
        if (key === ' ' || key === 'enter') cycle(cursor);
        if (key === 'z' || key === 'backspace' || key === 'delete') undo();
      }
    },
    getState() {
      const current = status();
      return {
        elapsed,
        score: rounds * FOREST_CAMP.score,
        rounds,
        round,
        phase,
        board: [...board],
        puzzle: {
          ...puzzle(),
          trees: [...puzzle().trees],
          solution: [...puzzle().solution],
          rows: [...puzzle().rows],
          columns: [...puzzle().columns],
        },
        cursor,
        moves,
        finished,
        won,
        extra: `${rounds} / 3 · 帐篷 ${current.tents.length}/${puzzle().trees.length}`,
        hint: message,
      };
    },
    draw(ctx) {
      const current = status();
      const trees = treeSet();
      ctx.fillStyle = '#f4eddf';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '林间安帐', 300, 24, 27);
      label(ctx, `第 ${Math.min(round + 1, 3)} 处 · ${puzzle().name}`, 300, 48, 14, '#68766a');
      roundRect(ctx, 88, 50, 424, 388, 28, '#9eb797');
      roundRect(ctx, 96, 57, 408, 374, 22, '#f7eedb');

      for (let column = 0; column < FOREST_CAMP.size; column++) {
        const exact = current.columns[column] === puzzle().columns[column];
        const over = current.columns[column] > puzzle().columns[column];
        label(
          ctx,
          puzzle().columns[column],
          GRID_X + column * CELL + CELL / 2,
          53,
          14,
          over ? '#b85f55' : exact ? '#4f765a' : '#6f705f',
          'center',
          750,
        );
      }

      for (let row = 0; row < FOREST_CAMP.size; row++) {
        const exact = current.rows[row] === puzzle().rows[row];
        const over = current.rows[row] > puzzle().rows[row];
        label(
          ctx,
          puzzle().rows[row],
          482,
          GRID_Y + row * CELL + CELL / 2,
          14,
          over ? '#b85f55' : exact ? '#4f765a' : '#6f705f',
          'center',
          750,
        );
      }

      for (let index = 0; index < board.length; index++) {
        const column = index % FOREST_CAMP.size;
        const row = Math.floor(index / FOREST_CAMP.size);
        const x = GRID_X + column * CELL;
        const y = GRID_Y + row * CELL;
        const tree = trees.has(index);
        roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 12, tree ? '#d8e3c7' : '#f4e8ce');
        ctx.strokeStyle = cursor === index ? '#526f5d' : '#d1c2a6';
        ctx.lineWidth = cursor === index ? 4 : 1.5;
        ctx.stroke();
        if (tree) drawTree(ctx, x + CELL / 2, y + CELL / 2);
        else if (board[index] === 1) drawTent(ctx, x + CELL / 2, y + CELL / 2);
        else if (board[index] === 2) drawGrass(ctx, x + CELL / 2, y + CELL / 2);
      }

      label(ctx, message, 300, 450, 13, '#617064');
      label(ctx, '点格切换 · 方向键 / WASD 移动 · 空格切换 · Z 撤销', 300, 470, 12, '#77746a');
    },
    destroy() {
      finished = true;
      board = [];
      history = [];
      pressed = -1;
    },
  };
}

function drawTree(ctx, x, y) {
  ctx.fillStyle = '#795b42';
  roundRect(ctx, x - 5, y + 3, 10, 20, 4, '#795b42');
  ctx.fillStyle = '#79966e';
  for (const [dx, dy, radius] of [
    [0, -8, 15],
    [-10, 0, 11],
    [10, 0, 11],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTent(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x - 21, y + 18);
  ctx.lineTo(x, y - 20);
  ctx.lineTo(x + 22, y + 18);
  ctx.closePath();
  ctx.fillStyle = '#dfa071';
  ctx.fill();
  ctx.strokeStyle = '#80634e';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 20);
  ctx.lineTo(x, y + 18);
  ctx.strokeStyle = '#f5d6a5';
  ctx.stroke();
}

function drawGrass(ctx, x, y) {
  ctx.strokeStyle = '#809a73';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const offset of [-7, 0, 7]) {
    ctx.beginPath();
    ctx.moveTo(x + offset, y + 10);
    ctx.quadraticCurveTo(x + offset / 2, y - 3, x + offset * 1.4, y - 10);
    ctx.stroke();
  }
}
