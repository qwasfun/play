import { label, roundRect } from '@playground/game-sdk';
import { FOLD_LABELS, generateRounds, PETAL_FOLD } from './course.js';

export {
  FOLD_LABELS,
  foldPaper,
  generateRounds,
  initialPaper,
  PETAL_FOLD,
  unfoldPunch,
} from './course.js';

const GRID_X = 310;
const GRID_Y = 104;
const CELL = 56;
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
  x: GRID_X + (index % PETAL_FOLD.size) * CELL + CELL / 2,
  y: GRID_Y + Math.floor(index / PETAL_FOLD.size) * CELL + CELL / 2,
});

function cellAt(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return -1;
  const column = Math.floor((point.x - GRID_X) / CELL);
  const row = Math.floor((point.y - GRID_Y) / CELL);
  if (row < 0 || row >= PETAL_FOLD.size || column < 0 || column >= PETAL_FOLD.size) return -1;
  return row * PETAL_FOLD.size + column;
}

function sameCells(selected, solution) {
  if (selected.size !== solution.length) return false;
  return solution.every((index) => selected.has(index));
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const puzzles = generateRounds(seed);
  let round = 0;
  let rounds = 0;
  let selected = new Set();
  let cursor = 0;
  let pressed = -1;
  let elapsed = 0;
  let moves = 0;
  let phase = 'play';
  let transition = 0;
  let history = [];
  let finished = false;
  let won = false;
  let message = '先按箭头在心里折好花笺，再找展开后的对称花印';

  const puzzle = () => puzzles[Math.min(round, puzzles.length - 1)];

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    message = success
      ? '六张花笺都展开啦，对称花印在窗边轻轻盛开！'
      : '晚风翻过花笺，这次先把折痕留到下一局';
    onFinish({ score: rounds * PETAL_FOLD.score, elapsed, won, rounds, moves });
  }

  function completeIfReady() {
    if (!sameCells(selected, puzzle().solution)) return;
    rounds++;
    sound('win');
    if (rounds === PETAL_FOLD.rounds) {
      finish(true);
      return;
    }
    phase = 'transition';
    transition = 0.65;
    message = `第 ${round + 1} 张花笺展开正确，下一道折痕正慢慢浮现`;
  }

  function toggle(index) {
    if (phase !== 'play' || index < 0 || index >= PETAL_FOLD.size ** 2) return;
    cursor = index;
    history.push(new Set(selected));
    if (selected.has(index)) selected.delete(index);
    else selected.add(index);
    moves++;
    sound('tap');
    message = selected.has(index)
      ? `已在第 ${Math.floor(index / 4) + 1} 行第 ${(index % 4) + 1} 列点亮花印`
      : '已擦去这枚花印，继续沿折痕找对称位置';
    if (selected.size > puzzle().solution.length)
      message = `花印多了一枚；这张展开后应有 ${puzzle().solution.length} 枚`;
    completeIfReady();
  }

  function undo() {
    if (phase !== 'play' || !history.length) {
      message = '现在还没有可以撤销的花印';
      return;
    }
    selected = history.pop();
    moves++;
    message = '已撤销上一枚花印，折痕还在这里等你';
    sound('tap');
  }

  function moveCursor(rowStep, columnStep) {
    const row = Math.floor(cursor / PETAL_FOLD.size);
    const column = cursor % PETAL_FOLD.size;
    const nextRow = (row + rowStep + PETAL_FOLD.size) % PETAL_FOLD.size;
    const nextColumn = (column + columnStep + PETAL_FOLD.size) % PETAL_FOLD.size;
    cursor = nextRow * PETAL_FOLD.size + nextColumn;
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, PETAL_FOLD.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        if (phase === 'transition') {
          const step = Math.min(remaining, transition);
          elapsed += step;
          transition -= step;
          remaining -= step;
          if (transition <= 1e-9) {
            round = rounds;
            selected = new Set();
            history = [];
            cursor = 0;
            phase = 'play';
            message = `第 ${round + 1} 张：${puzzle()
              .operations.map((item) => FOLD_LABELS[item])
              .join('，再')}`;
          }
          continue;
        }
        elapsed += remaining;
        remaining = 0;
      }
      if (!finished && elapsed >= PETAL_FOLD.limit - 1e-9) finish(false);
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
        if (moveKeys.has(key)) moveCursor(...moveKeys.get(key));
        if (key === ' ' || key === 'space' || key === 'spacebar' || key === 'enter') toggle(cursor);
        if (key === 'z' || key === 'backspace' || key === 'delete') undo();
      }
    },
    getState() {
      return {
        elapsed,
        score: rounds * PETAL_FOLD.score,
        rounds,
        round,
        selected: [...selected].sort((a, b) => a - b),
        puzzle: {
          ...puzzle(),
          operations: [...puzzle().operations],
          solution: [...puzzle().solution],
        },
        cursor,
        moves,
        phase,
        finished,
        won,
        extra: `${rounds} / ${PETAL_FOLD.rounds} · 花印 ${selected.size}/${puzzle().solution.length}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f5ede1';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '花笺折印', 105, 32, 25);
      label(ctx, `第 ${Math.min(round + 1, 6)} 张 · ${rounds * 200} 分`, 480, 32, 15, '#6f6c5e');
      roundRect(ctx, 28, 58, 544, 350, 30, '#d7c5ae');
      roundRect(ctx, 36, 66, 528, 334, 24, '#fff8e8');

      label(ctx, '折叠线索', 156, 91, 16, '#7b685e');
      puzzle().operations.forEach((direction, index) =>
        drawFoldStep(ctx, direction, index, puzzle().operations.length),
      );
      drawFoldedPaper(ctx, puzzle());
      label(ctx, '展开后点亮花印', 422, 91, 16, '#7b685e');

      for (let index = 0; index < PETAL_FOLD.size ** 2; index++) {
        const column = index % PETAL_FOLD.size;
        const row = Math.floor(index / PETAL_FOLD.size);
        const x = GRID_X + column * CELL;
        const y = GRID_Y + row * CELL;
        roundRect(
          ctx,
          x + 2,
          y + 2,
          CELL - 4,
          CELL - 4,
          12,
          selected.has(index) ? '#e69a9d' : '#f7dfc9',
        );
        ctx.strokeStyle = cursor === index ? '#6f7f69' : '#d2ad9d';
        ctx.lineWidth = cursor === index ? 4 : 1.5;
        ctx.stroke();
        if (selected.has(index)) drawFlower(ctx, x + CELL / 2, y + CELL / 2);
      }

      roundRect(ctx, 62, 422, 476, 28, 14, '#fff9e9');
      label(ctx, message, 300, 436, 13, '#6b675d');
      label(ctx, '点格标记 · 方向键 / WASD 移动 · 空格切换 · Z 撤销', 300, 467, 12, '#777166');
    },
    destroy() {
      finished = true;
      selected.clear();
      history = [];
      pressed = -1;
    },
  };
}

function drawFoldStep(ctx, direction, index, total) {
  const x = total === 1 ? 128 : 78 + index * 116;
  const y = 118;
  roundRect(ctx, x, y, 94, 76, 14, '#f1d6bf');
  ctx.strokeStyle = '#c89179';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#71816e';
  ctx.fillStyle = 'rgba(205,143,132,.35)';
  ctx.lineWidth = 5;
  const horizontal = direction === 'left' || direction === 'right';
  if (direction === 'left') ctx.fillRect(x + 8, y + 8, 38, 38);
  if (direction === 'right') ctx.fillRect(x + 48, y + 8, 38, 38);
  if (direction === 'top') ctx.fillRect(x + 8, y + 8, 78, 18);
  if (direction === 'bottom') ctx.fillRect(x + 8, y + 28, 78, 18);
  ctx.beginPath();
  if (horizontal) {
    const start = direction === 'left' ? x + 25 : x + 69;
    const end = direction === 'left' ? x + 69 : x + 25;
    ctx.moveTo(start, y + 28);
    ctx.lineTo(end, y + 28);
    ctx.lineTo(end + (direction === 'left' ? -9 : 9), y + 20);
    ctx.moveTo(end, y + 28);
    ctx.lineTo(end + (direction === 'left' ? -9 : 9), y + 36);
  } else {
    const start = direction === 'top' ? y + 15 : y + 41;
    const end = direction === 'top' ? y + 41 : y + 15;
    ctx.moveTo(x + 47, start);
    ctx.lineTo(x + 47, end);
    ctx.lineTo(x + 39, end + (direction === 'top' ? -8 : 8));
    ctx.moveTo(x + 47, end);
    ctx.lineTo(x + 55, end + (direction === 'top' ? -8 : 8));
  }
  ctx.stroke();
  label(ctx, `${index + 1}. ${FOLD_LABELS[direction]}`, x + 47, y + 63, 11, '#735f58');
}

function drawFoldedPaper(ctx, puzzle) {
  label(ctx, '折好后在这里打一孔', 156, 224, 13, '#706b61');
  const scale = 34;
  const width = puzzle.width * scale;
  const height = puzzle.height * scale;
  const x = 156 - width / 2;
  const y = 241;
  roundRect(ctx, x, y, width, height, 12, '#f3cfc1');
  ctx.strokeStyle = '#a97472';
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let column = 1; column < puzzle.width; column++) {
    ctx.beginPath();
    ctx.moveTo(x + column * scale, y);
    ctx.lineTo(x + column * scale, y + height);
    ctx.stroke();
  }
  for (let row = 1; row < puzzle.height; row++) {
    ctx.beginPath();
    ctx.moveTo(x, y + row * scale);
    ctx.lineTo(x + width, y + row * scale);
    ctx.stroke();
  }
  const punchX = x + (puzzle.punch % puzzle.width) * scale + scale / 2;
  const punchY = y + Math.floor(puzzle.punch / puzzle.width) * scale + scale / 2;
  ctx.beginPath();
  ctx.arc(punchX, punchY, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#fff8e8';
  ctx.fill();
  ctx.strokeStyle = '#9b6468';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawFlower(ctx, x, y) {
  ctx.fillStyle = '#fff4dc';
  for (let index = 0; index < 5; index++) {
    const angle = (index * Math.PI * 2) / 5 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * 10, y + Math.sin(angle) * 10, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#e4b75d';
  ctx.fill();
}
