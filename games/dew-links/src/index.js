import { label, roundRect } from '@playground/game-sdk';
import { DEW_LINKS, generatePuzzles } from './puzzles.js';

export { DEW_LINKS, generatePuzzles } from './puzzles.js';

const BOARD_X = 150;
const BOARD_Y = 82;
const CELL = 60;
const colors = ['', '#d98278', '#76988a', '#d2a84f', '#8c7da4'];
const symbols = ['', '●', '◆', '✦', '♥'];
const directions = {
  arrowleft: [0, -1],
  a: [0, -1],
  arrowright: [0, 1],
  d: [0, 1],
  arrowup: [-1, 0],
  w: [-1, 0],
  arrowdown: [1, 0],
  s: [1, 0],
};

const sameCell = (left, right) => left?.row === right?.row && left?.column === right?.column;
const copyCell = (cell) => ({ row: cell.row, column: cell.column });
const center = (cell) => ({
  x: BOARD_X + cell.column * CELL + CELL / 2,
  y: BOARD_Y + cell.row * CELL + CELL / 2,
});

function cellAt(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
  const column = Math.floor((point.x - BOARD_X) / CELL);
  const row = Math.floor((point.y - BOARD_Y) / CELL);
  return row >= 0 && row < DEW_LINKS.size && column >= 0 && column < DEW_LINKS.size
    ? { row, column }
    : null;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const puzzles = generatePuzzles(seed);
  let round = 0;
  let rounds = 0;
  let elapsed = 0;
  let finished = false;
  let won = false;
  let phase = 'play';
  let transition = 0;
  let cursor = { row: 0, column: 0 };
  let drawing = 0;
  let pointerActive = false;
  let paths = Array.from({ length: DEW_LINKS.pairs + 1 }, () => []);
  let message = '从一枚露珠出发，把同纹样的伙伴连起来';

  const puzzle = () => puzzles[round];
  const endpoints = (value) => puzzle().endpoints[value];
  const endpointLabel = (cell) => {
    for (let value = 1; value <= DEW_LINKS.pairs; value++)
      if (endpoints(value).some((endpoint) => sameCell(endpoint, cell))) return value;
    return 0;
  };
  const pathLabel = (cell) => {
    for (let value = 1; value <= DEW_LINKS.pairs; value++)
      if (paths[value].some((entry) => sameCell(entry, cell))) return value;
    return 0;
  };
  const pathComplete = (value) => {
    const path = paths[value];
    if (path.length < 2) return false;
    const pair = endpoints(value);
    return (
      (sameCell(path[0], pair[0]) && sameCell(path.at(-1), pair[1])) ||
      (sameCell(path[0], pair[1]) && sameCell(path.at(-1), pair[0]))
    );
  };
  const filled = () => paths.slice(1).reduce((total, path) => total + path.length, 0);

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    drawing = 0;
    pointerActive = false;
    onFinish({ score: rounds * 400, elapsed, won, paths: rounds * 4, rounds });
  }

  function resetBoard() {
    paths = Array.from({ length: DEW_LINKS.pairs + 1 }, () => []);
    cursor = { row: 0, column: 0 };
    drawing = 0;
    pointerActive = false;
  }

  function completeBoardIfReady() {
    if (filled() !== DEW_LINKS.size ** 2) return;
    if (!Array.from({ length: DEW_LINKS.pairs }, (_, index) => index + 1).every(pathComplete))
      return;
    rounds++;
    drawing = 0;
    sound('win');
    if (rounds === DEW_LINKS.rounds) {
      message = '三座花圃都亮起来啦！';
      finish(true);
      return;
    }
    phase = 'transition';
    transition = 0.7;
    message = `第 ${rounds} 座花圃完成，下一座马上醒来`;
  }

  function begin(cell) {
    if (!cell || phase !== 'play') return false;
    const endpoint = endpointLabel(cell);
    if (endpoint) {
      paths[endpoint] = [copyCell(cell)];
      drawing = endpoint;
      cursor = copyCell(cell);
      message = `牵着 ${symbols[endpoint]} 露珠继续走`;
      sound('tap');
      return true;
    }
    const value = pathLabel(cell);
    if (value && sameCell(paths[value].at(-1), cell) && !pathComplete(value)) {
      drawing = value;
      cursor = copyCell(cell);
      message = '从这里接着把小径铺下去';
      return true;
    }
    message = '请从露珠或尚未连完的小径末端出发';
    return false;
  }

  function extend(cell) {
    if (!drawing || !cell || phase !== 'play') return;
    const path = paths[drawing];
    const tail = path.at(-1);
    if (!tail || Math.abs(tail.row - cell.row) + Math.abs(tail.column - cell.column) !== 1) return;
    const ownIndex = path.findIndex((entry) => sameCell(entry, cell));
    if (ownIndex >= 0) {
      paths[drawing] = path.slice(0, ownIndex + 1);
      cursor = copyCell(cell);
      message = '沿原路退一步，再换个方向看看';
      return;
    }
    const occupied = pathLabel(cell);
    if (occupied && occupied !== drawing) {
      message = '这里已有另一条小径，换个方向吧';
      sound('error');
      return;
    }
    const endpoint = endpointLabel(cell);
    if (endpoint && endpoint !== drawing) {
      message = '这枚露珠在等另一位伙伴';
      sound('error');
      return;
    }
    path.push(copyCell(cell));
    cursor = copyCell(cell);
    if (endpoint === drawing) {
      drawing = 0;
      sound('collect');
      message = `一对 ${symbols[endpoint]} 露珠相逢了`;
    } else message = '很好，继续沿相邻格铺下去';
    completeBoardIfReady();
  }

  function clearAt(cell) {
    const value = pathLabel(cell) || endpointLabel(cell) || drawing;
    if (!value || !paths[value].length) return;
    paths[value] = [];
    drawing = 0;
    message = `已收起 ${symbols[value]} 小径，可以重新连接`;
    sound('tap');
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      const step = Math.min(dt, DEW_LINKS.limit - elapsed);
      elapsed += step;
      if (phase === 'transition') {
        transition -= step;
        if (transition <= 0) {
          round = rounds;
          phase = 'play';
          resetBoard();
          message = '新的花圃醒来了，从任意一枚露珠开始';
        }
      }
      if (!finished && elapsed >= DEW_LINKS.limit) finish(false);
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pointerActive = false;
        drawing = 0;
        return;
      }
      if (finished || phase !== 'play') return;
      if (type === 'primary-down') {
        const cell = cellAt(payload);
        pointerActive = begin(cell);
      }
      if (type === 'primary-move' && pointerActive) extend(cellAt(payload));
      if (type === 'primary-up') {
        if (pointerActive) extend(cellAt(payload));
        pointerActive = false;
        drawing = 0;
      }
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        const direction = directions[key];
        if (direction) {
          const next = {
            row: Math.max(0, Math.min(DEW_LINKS.size - 1, cursor.row + direction[0])),
            column: Math.max(0, Math.min(DEW_LINKS.size - 1, cursor.column + direction[1])),
          };
          cursor = next;
          if (drawing) extend(next);
        }
        if (key === ' ' || key === 'enter') {
          if (drawing) {
            drawing = 0;
            message = '小径先停在这里，随时可以接着走';
          } else begin(cursor);
        }
        if (key === 'z' || key === 'backspace' || key === 'delete') clearAt(cursor);
      }
    },
    getState() {
      return {
        elapsed,
        score: rounds * 400,
        paths: paths.map((path) => path.map(copyCell)),
        completedPaths: rounds * 4,
        rounds,
        round,
        phase,
        cursor: copyCell(cursor),
        drawing,
        filled: filled(),
        finished,
        won,
        extra: `${rounds} / 3 · 当前 ${filled()} / 25 格`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f4eddd';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '露珠相逢', 300, 27, 27);
      label(ctx, `第 ${Math.min(round + 1, 3)} 座花圃 · 铺满每一格`, 300, 55, 15, '#64776b');
      roundRect(ctx, BOARD_X - 10, BOARD_Y - 10, CELL * 5 + 20, CELL * 5 + 20, 28, '#d7dfcf');
      for (let row = 0; row < DEW_LINKS.size; row++) {
        for (let column = 0; column < DEW_LINKS.size; column++) {
          ctx.fillStyle = (row + column) % 2 ? '#f7f0df' : '#fff8e8';
          ctx.fillRect(BOARD_X + column * CELL, BOARD_Y + row * CELL, CELL, CELL);
          ctx.strokeStyle = '#d5c8aa';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(BOARD_X + column * CELL, BOARD_Y + row * CELL, CELL, CELL);
        }
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let value = 1; value <= DEW_LINKS.pairs; value++) {
        const path = paths[value];
        if (!path.length) continue;
        ctx.beginPath();
        path.forEach((cell, index) => {
          const point = center(cell);
          if (index) ctx.lineTo(point.x, point.y);
          else ctx.moveTo(point.x, point.y);
        });
        ctx.strokeStyle = colors[value];
        ctx.lineWidth = 28;
        ctx.stroke();
      }
      for (let value = 1; value <= DEW_LINKS.pairs; value++) {
        for (const endpoint of endpoints(value)) {
          const point = center(endpoint);
          ctx.fillStyle = '#fffaf0';
          ctx.strokeStyle = colors[value];
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 21, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          label(ctx, symbols[value], point.x, point.y, 17, colors[value]);
        }
      }
      const cursorPoint = center(cursor);
      ctx.strokeStyle = '#4f675b';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(cursorPoint.x - 25, cursorPoint.y - 25, 50, 50);
      ctx.setLineDash([]);
      roundRect(ctx, 72, 409, 456, 32, 15, '#fff8e7');
      label(ctx, message, 300, 425, 14, '#657064');
      label(ctx, '拖动连线 · 方向键 / WASD 选择 · 空格开始 · Z 收起', 300, 462, 12, '#77766b');
    },
    destroy() {
      finished = true;
      drawing = 0;
      pointerActive = false;
      paths = [];
    },
  };
}
