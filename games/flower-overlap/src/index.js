import { label, roundRect } from '@playground/game-sdk';
import { FLOWER_OVERLAP, combineLayers, generateRounds, mosaicKey, rotateMask } from './puzzles.js';

export {
  FLOWER_OVERLAP,
  combineLayers,
  generateRounds,
  mosaicKey,
  rotateCell,
  rotateMask,
  solutionsFor,
} from './puzzles.js';

const CURRENT_X = 55;
const TARGET_X = 361;
const BOARD_Y = 93;
const CELL = 46;
const CARD_Y = 316;
const CARD_W = 142;
const CARD_H = 96;
const CARD_X = [62, 229, 396];
const LAYER_NAMES = ['珊瑚花', '青叶', '金蕊'];
const LAYER_COLORS = ['#d98289', '#789b7e', '#e5b75d'];
const COUNT_COLORS = ['#f7e9d5', '#f0cfa9', '#d89a8f', '#98706f'];

export const layerPoint = (layer) => ({
  x: CARD_X[layer] + CARD_W / 2,
  y: CARD_Y + CARD_H / 2,
});

function layerAt(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return -1;
  return CARD_X.findIndex(
    (x) => point.x >= x && point.x <= x + CARD_W && point.y >= CARD_Y && point.y <= CARD_Y + CARD_H,
  );
}

const sameMosaic = (left, right) => mosaicKey(left) === mosaicKey(right);

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const puzzles = generateRounds(seed);
  let round = 0;
  let rounds = 0;
  let rotations = [...puzzles[0].initial];
  let selectedLayer = 0;
  let pressed = -1;
  let elapsed = 0;
  let turns = 0;
  let phase = 'play';
  let transition = 0;
  let history = [];
  let finished = false;
  let won = false;
  let message = '先比较两扇花窗，再旋转下方三层花影';

  const puzzle = () => puzzles[Math.min(round, puzzles.length - 1)];
  const current = () => combineLayers(puzzle().masks, rotations);

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    message = success
      ? '四扇花窗都叠好啦，午后的光正从花影里透进来！'
      : '日光轻轻挪开了，这扇花窗留到下一局再叠';
    onFinish({ score: rounds * FLOWER_OVERLAP.score, elapsed, won, rounds, turns });
  }

  function completeIfReady() {
    if (!sameMosaic(current(), puzzle().target)) return;
    rounds++;
    sound('win');
    if (rounds === FLOWER_OVERLAP.rounds) {
      finish(true);
      return;
    }
    phase = 'transition';
    transition = FLOWER_OVERLAP.transition;
    message = `第 ${round + 1} 扇花窗叠好了，下一束光正在靠近`;
  }

  function rotate(layer) {
    if (phase !== 'play' || layer < 0 || layer >= FLOWER_OVERLAP.layers) return;
    selectedLayer = layer;
    history.push([...rotations]);
    rotations[layer] = (rotations[layer] + 1) % 4;
    turns++;
    sound('tap');
    message = `${LAYER_NAMES[layer]}已顺时针旋转，看看深浅是否更接近目标`;
    completeIfReady();
  }

  function undo() {
    if (phase !== 'play' || !history.length) {
      message = '现在还没有可以撤销的旋转';
      return;
    }
    rotations = history.pop();
    sound('tap');
    message = '已撤销上一次旋转，花影回到刚才的位置';
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, FLOWER_OVERLAP.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        if (phase === 'transition') {
          const step = Math.min(remaining, transition);
          elapsed += step;
          transition -= step;
          remaining -= step;
          if (transition <= 1e-9) {
            round = rounds;
            rotations = [...puzzle().initial];
            selectedLayer = 0;
            history = [];
            phase = 'play';
            message = `第 ${round + 1} 扇：三层花影已经换了新的朝向`;
          }
          continue;
        }
        elapsed += remaining;
        remaining = 0;
      }
      if (!finished && elapsed >= FLOWER_OVERLAP.limit - 1e-9) finish(false);
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = -1;
        return;
      }
      if (finished || phase !== 'play') return;
      if (type === 'primary-down') pressed = layerAt(payload);
      if (type === 'primary-up') {
        const layer = layerAt(payload);
        if (layer === pressed) rotate(layer);
        pressed = -1;
      }
      if (type === 'undo') undo();
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (key === 'arrowleft' || key === 'a')
          selectedLayer = (selectedLayer + FLOWER_OVERLAP.layers - 1) % FLOWER_OVERLAP.layers;
        if (key === 'arrowright' || key === 'd')
          selectedLayer = (selectedLayer + 1) % FLOWER_OVERLAP.layers;
        if (key === ' ' || key === 'space' || key === 'spacebar' || key === 'enter')
          rotate(selectedLayer);
        if (key === 'z' || key === 'backspace' || key === 'delete') undo();
      }
    },
    getState() {
      return {
        elapsed,
        score: rounds * FLOWER_OVERLAP.score,
        rounds,
        round,
        rotations: [...rotations],
        selectedLayer,
        current: current(),
        puzzle: {
          masks: puzzle().masks.map((mask) => [...mask]),
          solution: [...puzzle().solution],
          initial: [...puzzle().initial],
          target: [...puzzle().target],
        },
        turns,
        phase,
        finished,
        won,
        extra: `${rounds} / ${FLOWER_OVERLAP.rounds} · 旋转 ${turns} 次`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f4eadc';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '花影叠窗', 104, 31, 25);
      label(
        ctx,
        `第 ${Math.min(round + 1, 4)} 扇 · ${rounds * FLOWER_OVERLAP.score} 分`,
        480,
        31,
        15,
        '#6e665c',
      );
      roundRect(ctx, 26, 55, 548, 380, 30, '#d5bba6');
      roundRect(ctx, 34, 63, 532, 364, 24, '#fff8e8');

      label(ctx, '当前花影', CURRENT_X + CELL * 2, 81, 16, '#735f58');
      label(ctx, '目标花窗', TARGET_X + CELL * 2, 81, 16, '#735f58');
      drawBoard(ctx, CURRENT_X, BOARD_Y, current(), false);
      drawBoard(ctx, TARGET_X, BOARD_Y, puzzle().target, true);
      label(ctx, '旋转下面任意一层', 300, 298, 14, '#766b61');

      puzzle().masks.forEach((mask, layer) =>
        drawLayerCard(ctx, mask, rotations[layer], layer, selectedLayer),
      );

      roundRect(ctx, 55, 442, 490, 24, 12, '#fff9e9');
      label(ctx, message, 300, 454, 12, '#665f57');
      label(ctx, '点模板旋转 · 左右键选层 · 空格旋转 · Z 撤销', 300, 475, 11, '#756e65');
    },
    destroy() {
      finished = true;
      history = [];
      pressed = -1;
    },
  };
}

function drawBoard(ctx, startX, startY, counts, target) {
  roundRect(ctx, startX - 7, startY - 7, CELL * 4 + 14, CELL * 4 + 14, 18, '#ead5bd');
  for (let index = 0; index < counts.length; index++) {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = startX + column * CELL;
    const y = startY + row * CELL;
    roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 9, COUNT_COLORS[counts[index]]);
    ctx.strokeStyle = target ? '#b38d7a' : '#c6a28e';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    label(ctx, String(counts[index]), x + CELL / 2, y + CELL / 2 + 1, 16, '#6a5853');
  }
}

function drawLayerCard(ctx, mask, rotation, layer, selectedLayer) {
  const x = CARD_X[layer];
  const selected = layer === selectedLayer;
  roundRect(ctx, x, CARD_Y, CARD_W, CARD_H, 18, selected ? '#f0dfc6' : '#f7ead7');
  ctx.strokeStyle = selected ? '#779078' : '#d2b59f';
  ctx.lineWidth = selected ? 4 : 2;
  ctx.stroke();
  const cells = new Set(rotateMask(mask, rotation));
  for (let index = 0; index < 16; index++) {
    const px = x + 13 + (index % 4) * 15;
    const py = CARD_Y + 13 + Math.floor(index / 4) * 15;
    roundRect(ctx, px, py, 12, 12, 3, cells.has(index) ? LAYER_COLORS[layer] : '#fff8e9');
  }
  label(ctx, LAYER_NAMES[layer], x + 105, CARD_Y + 31, 13, '#6b5d57');
  label(ctx, '↻ 点我旋转', x + 105, CARD_Y + 58, 12, selected ? '#68806b' : '#8a7569');
  label(ctx, `${rotation * 90}°`, x + 105, CARD_Y + 79, 11, '#8a7569');
}
