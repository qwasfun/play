import { label, roundRect } from '@playground/game-sdk';
import { generatePuzzles, MIRROR_BLOOM, traceLight } from './puzzles.js';

export { countSolutions, generatePuzzles, MIRROR_BLOOM, traceLight } from './puzzles.js';

const GRID_X = 135;
const GRID_Y = 68;
const CELL = 66;
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

export const mirrorPoint = (mirror) => ({
  x: GRID_X + mirror.column * CELL + CELL / 2,
  y: GRID_Y + mirror.row * CELL + CELL / 2,
});

function mirrorAt(puzzle, point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return -1;
  return puzzle.mirrors.findIndex((mirror) => {
    const center = mirrorPoint(mirror);
    return Math.abs(point.x - center.x) <= CELL / 2 && Math.abs(point.y - center.y) <= CELL / 2;
  });
}

function nextMirror(puzzle, cursor, rowStep, columnStep) {
  const current = puzzle.mirrors[cursor];
  let best = cursor;
  let distance = Infinity;
  puzzle.mirrors.forEach((mirror, index) => {
    if (index === cursor) return;
    const rowDistance = mirror.row - current.row;
    const columnDistance = mirror.column - current.column;
    if (rowStep && Math.sign(rowDistance) !== rowStep) return;
    if (columnStep && Math.sign(columnDistance) !== columnStep) return;
    const next =
      Math.abs(rowDistance) +
      Math.abs(columnDistance) +
      Math.abs(rowStep ? columnDistance : rowDistance) * 0.35;
    if (next < distance) {
      best = index;
      distance = next;
    }
  });
  return best === cursor
    ? (cursor + (rowStep + columnStep > 0 ? 1 : puzzle.mirrors.length - 1)) % puzzle.mirrors.length
    : best;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const puzzles = generatePuzzles(seed);
  let round = 0;
  let rounds = 0;
  let orientations = [...puzzles[0].start];
  let cursor = 0;
  let pressed = -1;
  let elapsed = 0;
  let moves = 0;
  let phase = 'play';
  let transition = 0;
  let history = [];
  let finished = false;
  let won = false;
  let message = '从叶片入口顺着晨光看，想一想每面镜子该往哪边斜';

  const puzzle = () => puzzles[Math.min(round, puzzles.length - 1)];
  const beam = () => traceLight(puzzle(), orientations);

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score: rounds * MIRROR_BLOOM.score, elapsed, won, rounds });
  }

  function completeIfReady() {
    const light = beam();
    if (!light.solved) {
      const lit = light.lit.length;
      message = light.loop
        ? '光束绕成小圈啦，转一面镜子给它留条新路'
        : `已经照亮 ${lit}/${puzzle().flowers.length} 朵花，再看看金色出口在哪边`;
      return;
    }
    rounds++;
    history = [];
    pressed = -1;
    sound('win');
    if (rounds === MIRROR_BLOOM.rounds) {
      message = '三座花圃都亮起来了，晨光正沿着花镜轻轻闪耀！';
      finish(true);
      return;
    }
    phase = 'transition';
    transition = 0.7;
    message = `${puzzle().name}亮起来啦，下一座花圃马上铺开`;
  }

  function rotate(index) {
    if (phase !== 'play' || index < 0 || index >= orientations.length) return;
    cursor = index;
    history.push({ orientations: [...orientations], moves });
    orientations[index] = 1 - orientations[index];
    moves++;
    sound('tap');
    completeIfReady();
  }

  function undo() {
    if (phase !== 'play' || !history.length) {
      message = '现在还没有可以撤销的转动';
      return;
    }
    const previous = history.pop();
    orientations = previous.orientations;
    moves = previous.moves;
    message = '已把上一面花镜转回去，计时仍会继续';
    sound('tap');
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, MIRROR_BLOOM.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        if (phase === 'transition') {
          const step = Math.min(remaining, transition);
          elapsed += step;
          transition -= step;
          remaining -= step;
          if (transition <= 1e-9) {
            round = rounds;
            orientations = [...puzzle().start];
            cursor = 0;
            history = [];
            phase = 'play';
            message = `第 ${round + 1} 座是${puzzle().name}，先找离入口最近的镜子`;
          }
          continue;
        }
        elapsed += remaining;
        remaining = 0;
      }
      if (!finished && elapsed >= MIRROR_BLOOM.limit - 1e-9) finish(false);
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = -1;
        return;
      }
      if (finished || phase !== 'play') return;
      if (type === 'primary-down') pressed = mirrorAt(puzzle(), payload);
      if (type === 'primary-up') {
        const index = mirrorAt(puzzle(), payload);
        if (index === pressed) rotate(index);
        pressed = -1;
      }
      if (type === 'undo') undo();
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (moveKeys.has(key)) cursor = nextMirror(puzzle(), cursor, ...moveKeys.get(key));
        if (key === ' ' || key === 'enter') rotate(cursor);
        if (key === 'z' || key === 'backspace' || key === 'delete') undo();
      }
    },
    getState() {
      const light = beam();
      return {
        elapsed,
        score: rounds * MIRROR_BLOOM.score,
        rounds,
        round,
        phase,
        orientations: [...orientations],
        puzzle: {
          ...puzzle(),
          entry: { ...puzzle().entry },
          exit: { ...puzzle().exit },
          mirrors: puzzle().mirrors.map((mirror) => ({ ...mirror })),
          flowers: puzzle().flowers.map((flower) => ({ ...flower })),
          start: [...puzzle().start],
        },
        path: light.path.map((point) => ({ ...point })),
        lit: [...light.lit],
        cursor,
        moves,
        finished,
        won,
        extra: `${rounds} / 3 · 亮花 ${light.lit.length}/${puzzle().flowers.length}`,
        hint: message,
      };
    },
    draw(ctx) {
      const current = puzzle();
      const light = beam();
      ctx.fillStyle = '#f4eddf';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '花镜引光', 300, 25, 27);
      label(ctx, `第 ${Math.min(round + 1, 3)} 座 · ${current.name}`, 300, 50, 14, '#68766a');
      roundRect(ctx, 118, 56, 364, 366, 30, '#adc3aa');
      roundRect(ctx, 128, 64, 344, 348, 24, '#efe8cf');
      for (let row = 0; row < MIRROR_BLOOM.size; row++) {
        for (let column = 0; column < MIRROR_BLOOM.size; column++) {
          const x = GRID_X + column * CELL;
          const y = GRID_Y + row * CELL;
          roundRect(
            ctx,
            x + 2,
            y + 2,
            CELL - 4,
            CELL - 4,
            12,
            (row + column) % 2 ? '#e4dec4' : '#ece6ce',
          );
          ctx.strokeStyle = '#d1c7a7';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      ctx.beginPath();
      light.path.forEach((point, index) => {
        const x = GRID_X + point.column * CELL + CELL / 2;
        const y = GRID_Y + point.row * CELL + CELL / 2;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#ffe59c';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#f4c965';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
      const lit = new Set(light.lit);
      current.flowers.forEach((flower) =>
        drawFlower(ctx, flower, lit.has(`${flower.row}:${flower.column}`)),
      );
      current.mirrors.forEach((mirror, index) =>
        drawMirror(ctx, mirror, orientations[index], cursor === index),
      );
      drawPort(ctx, current.entry, '#6c9874', '入');
      drawPort(ctx, current.exit, '#d5a247', '出');
      label(ctx, message, 300, 439, 13, '#617064');
      label(ctx, '点镜旋转 · 方向键 / WASD 选择 · 空格旋转 · Z 撤销', 300, 462, 12, '#77746a');
    },
    destroy() {
      finished = true;
      orientations = [];
      history = [];
      pressed = -1;
    },
  };
}

function drawMirror(ctx, mirror, orientation, selected) {
  const { x, y } = mirrorPoint(mirror);
  roundRect(ctx, x - 25, y - 25, 50, 50, 14, selected ? '#fff4d2' : '#f7f0da');
  ctx.strokeStyle = selected ? '#557360' : '#b7a987';
  ctx.lineWidth = selected ? 4 : 2;
  ctx.stroke();
  ctx.beginPath();
  if (orientation === 0) {
    ctx.moveTo(x - 17, y + 17);
    ctx.lineTo(x + 17, y - 17);
  } else {
    ctx.moveTo(x - 17, y - 17);
    ctx.lineTo(x + 17, y + 17);
  }
  ctx.strokeStyle = '#5f7771';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = '#e9f5ee';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawFlower(ctx, flower, glowing) {
  const x = GRID_X + flower.column * CELL + CELL / 2;
  const y = GRID_Y + flower.row * CELL + CELL / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = glowing ? '#d87d73' : '#c8aa9c';
  for (let petal = 0; petal < 5; petal++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, -13, glowing ? 8 : 6, glowing ? 13 : 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = glowing ? '#ffe18c' : '#a88d72';
  ctx.fill();
  ctx.restore();
}

function drawPort(ctx, port, color, text) {
  const x = GRID_X + port.column * CELL + CELL / 2;
  const y = GRID_Y + port.row * CELL + CELL / 2;
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  label(ctx, text, x, y + 1, 12, '#fff9e8');
}
