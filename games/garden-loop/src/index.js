import { label, roundRect } from '@playground/game-sdk';
import { allEdges, edgeEnds, GARDEN_LOOP, generatePuzzles, satisfiesPuzzle } from './puzzles.js';

export {
  allEdges,
  cluesFor,
  edgeEnds,
  edgeId,
  GARDEN_LOOP,
  generatePuzzles,
  isSingleLoop,
  satisfiesPuzzle,
} from './puzzles.js';

const BOARD_X = 150;
const BOARD_Y = 74;
const CELL = 75;
const HIT_RADIUS = 22;
const directions = {
  arrowleft: [-1, 0],
  a: [-1, 0],
  arrowright: [1, 0],
  d: [1, 0],
  arrowup: [0, -1],
  w: [0, -1],
  arrowdown: [0, 1],
  s: [0, 1],
};

export function edgePoint(id) {
  const [orientation, rowText, columnText] = String(id).split(':');
  const row = Number(rowText);
  const column = Number(columnText);
  return orientation === 'h'
    ? { x: BOARD_X + (column + 0.5) * CELL, y: BOARD_Y + row * CELL }
    : { x: BOARD_X + column * CELL, y: BOARD_Y + (row + 0.5) * CELL };
}

function edgeAt(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return '';
  let best = '';
  let distance = Infinity;
  for (const id of allEdges) {
    const center = edgePoint(id);
    const next = Math.hypot(point.x - center.x, point.y - center.y);
    if (next < distance) {
      best = id;
      distance = next;
    }
  }
  return distance <= HIT_RADIUS ? best : '';
}

const cellEdges = (row, column) => [
  `h:${row}:${column}`,
  `h:${row + 1}:${column}`,
  `v:${row}:${column}`,
  `v:${row}:${column + 1}`,
];

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const puzzles = generatePuzzles(seed);
  let round = 0;
  let rounds = 0;
  let elapsed = 0;
  let finished = false;
  let won = false;
  let phase = 'play';
  let transition = 0;
  let selectedIndex = 0;
  let edges = new Set();
  let history = [];
  let message = '看清数字，从任意一段花篱开始围起';

  const puzzle = () => puzzles[round];

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score: rounds * 400, elapsed, won, rounds });
  }

  function completeIfReady() {
    if (!satisfiesPuzzle(puzzle(), edges)) return;
    rounds++;
    history = [];
    sound('win');
    if (rounds === GARDEN_LOOP.rounds) {
      message = '三座花圃都被一圈完整花篱轻轻围好啦！';
      finish(true);
      return;
    }
    phase = 'transition';
    transition = 0.7;
    message = `第 ${rounds} 座花圃完成，下一座马上展开`;
  }

  function toggle(id) {
    if (!allEdges.includes(id) || phase !== 'play') return;
    history.push(new Set(edges));
    if (history.length > 80) history.shift();
    if (edges.has(id)) {
      edges.delete(id);
      message = '这段花篱已收起，再看看数字是否刚好';
    } else {
      edges.add(id);
      message = '花篱搭好了，继续让每个数字都恰到好处';
    }
    sound('tap');
    completeIfReady();
  }

  function undo() {
    if (phase !== 'play' || !history.length) {
      message = '现在还没有可以撤销的花篱';
      return;
    }
    edges = history.pop();
    message = '已回退一步，计时仍会继续';
    sound('tap');
  }

  function moveSelection(dx, dy) {
    const step = dx || dy * GARDEN_LOOP.size;
    selectedIndex = (selectedIndex + step + allEdges.length) % allEdges.length;
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      const step = Math.min(dt, GARDEN_LOOP.limit - elapsed);
      elapsed += step;
      if (phase === 'transition') {
        transition -= step;
        if (transition <= 0) {
          round = rounds;
          phase = 'play';
          edges = new Set();
          history = [];
          selectedIndex = 0;
          message = '新花圃展开了，数字正等着一圈完整花篱';
        }
      }
      if (!finished && elapsed >= GARDEN_LOOP.limit) finish(false);
    },
    input(type, payload = {}) {
      if (finished || phase !== 'play') return;
      if (type === 'primary-down') {
        const id = edgeAt(payload);
        if (id) {
          selectedIndex = allEdges.indexOf(id);
          toggle(id);
        }
      }
      if (type === 'undo') undo();
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (directions[key]) moveSelection(...directions[key]);
        if (key === ' ' || key === 'enter') toggle(allEdges[selectedIndex]);
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
        edges: [...edges].sort(),
        selected: allEdges[selectedIndex],
        finished,
        won,
        extra: `${rounds} / 3 · 当前 ${edges.size} 段`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f4eddd';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '花篱成环', 300, 25, 27);
      label(ctx, `第 ${Math.min(round + 1, 3)} 座花圃 · 数字是四周篱笆数`, 300, 51, 14, '#68786c');
      roundRect(ctx, BOARD_X - 24, BOARD_Y - 24, CELL * 4 + 48, CELL * 4 + 48, 30, '#d9e3cf');
      roundRect(ctx, BOARD_X - 10, BOARD_Y - 10, CELL * 4 + 20, CELL * 4 + 20, 18, '#fff8e8');

      ctx.strokeStyle = '#dfd1b5';
      ctx.lineWidth = 2;
      for (let index = 0; index <= GARDEN_LOOP.size; index++) {
        ctx.beginPath();
        ctx.moveTo(BOARD_X, BOARD_Y + index * CELL);
        ctx.lineTo(BOARD_X + CELL * GARDEN_LOOP.size, BOARD_Y + index * CELL);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(BOARD_X + index * CELL, BOARD_Y);
        ctx.lineTo(BOARD_X + index * CELL, BOARD_Y + CELL * GARDEN_LOOP.size);
        ctx.stroke();
      }

      for (let row = 0; row < GARDEN_LOOP.size; row++) {
        for (let column = 0; column < GARDEN_LOOP.size; column++) {
          const count = cellEdges(row, column).filter((id) => edges.has(id)).length;
          const clue = puzzle().clues[row][column];
          const color = count === clue ? '#6c8b6f' : count > clue ? '#c46f66' : '#665f53';
          label(
            ctx,
            String(clue),
            BOARD_X + (column + 0.5) * CELL,
            BOARD_Y + (row + 0.5) * CELL,
            25,
            color,
          );
        }
      }

      ctx.lineCap = 'round';
      for (const id of edges) {
        const [[rowA, columnA], [rowB, columnB]] = edgeEnds(id);
        ctx.beginPath();
        ctx.moveTo(BOARD_X + columnA * CELL, BOARD_Y + rowA * CELL);
        ctx.lineTo(BOARD_X + columnB * CELL, BOARD_Y + rowB * CELL);
        ctx.strokeStyle = '#71916f';
        ctx.lineWidth = 11;
        ctx.stroke();
        ctx.strokeStyle = '#f2c96d';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 12]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (let row = 0; row <= GARDEN_LOOP.size; row++)
        for (let column = 0; column <= GARDEN_LOOP.size; column++) {
          ctx.beginPath();
          ctx.arc(BOARD_X + column * CELL, BOARD_Y + row * CELL, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#9b8060';
          ctx.fill();
        }

      const cursor = edgePoint(allEdges[selectedIndex]);
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, 17, 0, Math.PI * 2);
      ctx.strokeStyle = '#4f6758';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      roundRect(ctx, 60, 410, 480, 31, 15, '#fff8e7');
      label(ctx, message, 300, 425, 13, '#657064');
      label(ctx, '点按篱边 · 方向键 / WASD 选择 · 空格落篱 · Z 撤销', 300, 462, 12, '#77766b');
    },
    destroy() {
      finished = true;
      edges.clear();
      history = [];
    },
  };
}
