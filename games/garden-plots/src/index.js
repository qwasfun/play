import { label, roundRect } from '@playground/game-sdk';
import {
  BOARD_X,
  BOARD_Y,
  CELL,
  GARDEN_PLOTS,
  generateBoards,
  normalizeRect,
  rectCells,
} from './puzzles.js';

export {
  BOARD_X,
  BOARD_Y,
  CELL,
  GARDEN_PLOTS,
  cellCenter,
  generateBoards,
  normalizeRect,
  rectCells,
} from './puzzles.js';

const COLORS = ['#e9b7a4', '#c8d79b', '#eacb81', '#afcfbd', '#cbb9d9'];
const validCell = (cell) =>
  Number.isInteger(cell?.r) &&
  Number.isInteger(cell?.c) &&
  cell.r >= 0 &&
  cell.r < GARDEN_PLOTS.size &&
  cell.c >= 0 &&
  cell.c < GARDEN_PLOTS.size;
const keyFor = ({ r, c }) => `${r}:${c}`;

function cellAt(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
  const c = Math.floor((point.x - BOARD_X) / CELL);
  const r = Math.floor((point.y - BOARD_Y) / CELL);
  const cell = { r, c };
  return validCell(cell) ? cell : null;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const boardsData = generateBoards(seed);
  let boardIndex = 0;
  let boards = 0;
  let score = 0;
  let elapsed = 0;
  let rectangles = [];
  let celebration = [];
  let cursor = { r: 0, c: 0 };
  let anchor = null;
  let pressed = null;
  let preview = null;
  let phase = 'play';
  let transition = 0;
  let finished = false;
  let won = false;
  let message = '从一角拖到对角，先框出一块数字花畦';

  const board = () => boardsData[Math.min(boardIndex, boardsData.length - 1)];
  const plotCount = () => boards * GARDEN_PLOTS.plotsPerBoard + rectangles.length;

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    message = success
      ? '三座花圃都分得整整齐齐，花香沿着田埂慢慢散开啦！'
      : '夕阳落到花牌上了，剩下的花畦下次再慢慢整理';
    onFinish({ score, elapsed, won, boards, plots: plotCount() });
  }

  function completeBoard() {
    celebration = rectangles.map((rect) => ({ ...rect }));
    rectangles = [];
    boards++;
    score += GARDEN_PLOTS.score;
    sound('win');
    if (boards === GARDEN_PLOTS.boards) {
      finish(true);
      return;
    }
    phase = 'transition';
    transition = GARDEN_PLOTS.transition;
    message = `第 ${boards} 座花圃分好啦，下一座正在铺开`;
  }

  function tryPlace(start, end) {
    if (!validCell(start) || !validCell(end) || phase !== 'play') return false;
    const rect = normalizeRect(start, end);
    const cells = rectCells(rect);
    const cellKeys = new Set(cells.map(keyFor));
    const clues = board().clues.filter((clue) => cellKeys.has(keyFor(clue)));
    if (clues.length !== 1) {
      message = clues.length ? '一块花畦只能留下一个数字花牌' : '这块花畦里还没有数字花牌';
      return false;
    }
    if (rect.h * rect.w !== clues[0].value) {
      message = `这块有 ${rect.h * rect.w} 格，花牌需要 ${clues[0].value} 格`;
      return false;
    }
    const occupied = new Set(rectangles.flatMap((item) => rectCells(item).map(keyFor)));
    if (cells.some((cell) => occupied.has(keyFor(cell)))) {
      message = '花畦不能叠在一起，换一组角试试';
      return false;
    }
    rectangles.push(rect);
    sound('tap');
    message = `第 ${rectangles.length} 块花畦落好啦，继续铺满整座花圃`;
    if (rectangles.reduce((total, item) => total + item.h * item.w, 0) === 25) completeBoard();
    return true;
  }

  function undo() {
    if (phase !== 'play' || !rectangles.length) {
      message = '现在还没有可以撤销的花畦';
      return;
    }
    rectangles.pop();
    sound('tap');
    message = '已收回上一块花畦，可以重新框选';
  }

  function moveCursor(dr, dc) {
    cursor = {
      r: Math.max(0, Math.min(GARDEN_PLOTS.size - 1, cursor.r + dr)),
      c: Math.max(0, Math.min(GARDEN_PLOTS.size - 1, cursor.c + dc)),
    };
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, GARDEN_PLOTS.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        if (phase === 'transition') {
          const step = Math.min(remaining, transition);
          elapsed += step;
          transition -= step;
          remaining -= step;
          if (transition <= 1e-9) {
            boardIndex = boards;
            phase = 'play';
            celebration = [];
            cursor = { r: 0, c: 0 };
            anchor = null;
            message = `第 ${boardIndex + 1} 座花圃：从数字花牌旁开始分畦吧`;
          }
          continue;
        }
        elapsed += remaining;
        remaining = 0;
      }
      if (!finished && elapsed >= GARDEN_PLOTS.limit - 1e-9) finish(false);
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = null;
        preview = null;
        return;
      }
      if (finished || phase !== 'play') return;
      if (type === 'primary-down') {
        pressed = cellAt(payload);
        preview = pressed ? { ...pressed } : null;
      }
      if (type === 'primary-move' && pressed) preview = cellAt(payload) || preview;
      if (type === 'primary-up') {
        const end = cellAt(payload);
        if (pressed && end) tryPlace(pressed, end);
        pressed = null;
        preview = null;
      }
      if (type === 'undo') undo();
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (key === 'arrowleft' || key === 'a') moveCursor(0, -1);
        if (key === 'arrowright' || key === 'd') moveCursor(0, 1);
        if (key === 'arrowup' || key === 'w') moveCursor(-1, 0);
        if (key === 'arrowdown' || key === 's') moveCursor(1, 0);
        if (key === ' ' || key === 'space' || key === 'spacebar' || key === 'enter') {
          if (!anchor) {
            anchor = { ...cursor };
            message = '第一角定好啦，移动到矩形对角再确认';
          } else {
            tryPlace(anchor, cursor);
            anchor = null;
          }
        }
        if (key === 'z' || key === 'backspace' || key === 'delete') undo();
      }
    },
    getState() {
      return {
        elapsed,
        score,
        boards,
        boardIndex,
        plots: plotCount(),
        rectangles: rectangles.map((rect) => ({ ...rect })),
        cursor: { ...cursor },
        anchor: anchor ? { ...anchor } : null,
        board: {
          clues: board().clues.map((clue) => ({ ...clue })),
          solution: board().solution.map((rect) => ({ ...rect })),
        },
        phase,
        finished,
        won,
        extra: `${boards} / ${GARDEN_PLOTS.boards} 座 · 已分 ${plotCount()} 块`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f4eadb';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '花圃分畦', 105, 28, 25);
      label(ctx, `${score} 分 · 第 ${Math.min(boardIndex + 1, 3)} 座`, 485, 28, 15, '#6b655c');
      roundRect(ctx, 88, 42, 424, 406, 34, '#a9c09b', '#769171');
      roundRect(ctx, 98, 50, 404, 390, 26, '#fff6dc');
      drawBoard(ctx);
      roundRect(ctx, 52, 447, 496, 23, 12, '#fff9e9');
      label(ctx, message, 300, 458, 12, '#655f57');
      label(ctx, '拖动框矩形 · 方向键移动 · 空格定角 · Z 撤销', 300, 477, 11, '#756e65');
    },
    destroy() {
      finished = true;
      rectangles = [];
      celebration = [];
      pressed = null;
      preview = null;
    },
  };

  function drawBoard(ctx) {
    for (let r = 0; r < GARDEN_PLOTS.size; r++) {
      for (let c = 0; c < GARDEN_PLOTS.size; c++) {
        const x = BOARD_X + c * CELL;
        const y = BOARD_Y + r * CELL;
        ctx.fillStyle = (r + c) % 2 ? '#edf0cf' : '#f3f0d5';
        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = '#b4bd91';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x, y, CELL, CELL);
      }
    }
    const shown = phase === 'transition' || finished ? celebration : rectangles;
    shown.forEach((rect, index) => {
      const x = BOARD_X + rect.c * CELL + 4;
      const y = BOARD_Y + rect.r * CELL + 4;
      const width = rect.w * CELL - 8;
      const height = rect.h * CELL - 8;
      ctx.globalAlpha = 0.54;
      roundRect(ctx, x, y, width, height, 14, COLORS[index % COLORS.length]);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#8c705f';
      ctx.lineWidth = 4;
      ctx.stroke();
    });
    if (phase === 'play') {
      const start = pressed || anchor;
      const end = pressed ? preview : anchor ? cursor : null;
      if (start && end) {
        const rect = normalizeRect(start, end);
        ctx.setLineDash([8, 7]);
        ctx.strokeStyle = '#c37767';
        ctx.lineWidth = 4;
        ctx.strokeRect(
          BOARD_X + rect.c * CELL + 5,
          BOARD_Y + rect.r * CELL + 5,
          rect.w * CELL - 10,
          rect.h * CELL - 10,
        );
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = '#6c8066';
      ctx.lineWidth = 4;
      ctx.strokeRect(
        BOARD_X + cursor.c * CELL + 7,
        BOARD_Y + cursor.r * CELL + 7,
        CELL - 14,
        CELL - 14,
      );
    }
    board().clues.forEach((clue) => {
      const x = BOARD_X + (clue.c + 0.5) * CELL;
      const y = BOARD_Y + (clue.r + 0.5) * CELL;
      ctx.fillStyle = '#f0bd65';
      ctx.beginPath();
      ctx.arc(x, y, 23, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff8df';
      ctx.lineWidth = 4;
      ctx.stroke();
      label(ctx, String(clue.value), x, y + 1, 18, '#62564d');
    });
  }
}
