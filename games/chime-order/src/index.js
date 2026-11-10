import { label, roundRect } from '@playground/game-sdk';
import { CHIME_ORDER, generatePuzzles } from './puzzles.js';

export { CHIME_ORDER, generatePuzzles, isPermutation } from './puzzles.js';

const SLOT_X = Array.from({ length: CHIME_ORDER.size }, (_, index) => 80 + index * 88);
const COLORS = ['#d98278', '#e0b457', '#79a287', '#77a6ad', '#9386ab', '#c7839b'];
const keys = {
  arrowleft: -1,
  a: -1,
  arrowright: 1,
  d: 1,
};

export const chimePoint = (index) => ({ x: SLOT_X[index], y: 172 });

function chimeAt(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return -1;
  if (point.y < 82 || point.y > 276) return -1;
  const index = SLOT_X.findIndex((x) => Math.abs(point.x - x) <= 34);
  return index;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const puzzles = generatePuzzles(seed);
  let round = 0;
  let rounds = 0;
  let order = [...puzzles[0].initial];
  let selectedIndex = 0;
  let heldIndex = -1;
  let elapsed = 0;
  let moves = 0;
  let finished = false;
  let won = false;
  let phase = 'play';
  let transition = 0;
  let history = [];
  let message = '看下方旋律剪影，先拿起一枚风铃';

  const puzzle = () => puzzles[round];
  const solved = () => order.every((value, index) => value === puzzle().target[index]);

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score: rounds * 400, elapsed, won, rounds });
  }

  function completeIfReady() {
    if (!solved()) return;
    rounds++;
    heldIndex = -1;
    history = [];
    sound('win');
    if (rounds === CHIME_ORDER.rounds) {
      message = '三段旋律都排好了，风铃正轻轻合奏！';
      finish(true);
      return;
    }
    phase = 'transition';
    transition = 0.7;
    message = `第 ${rounds} 段旋律完成，下一阵风马上吹来`;
  }

  function choose(index) {
    if (index < 0 || index >= CHIME_ORDER.size || phase !== 'play') return;
    selectedIndex = index;
    if (heldIndex < 0) {
      heldIndex = index;
      message = `拿起了 ${order[index]} 号风铃，再选一枚来交换`;
      sound('tap');
      return;
    }
    if (heldIndex === index) {
      heldIndex = -1;
      message = '已放回原位，可以重新选择';
      sound('tap');
      return;
    }
    history.push({ order: [...order], moves });
    [order[heldIndex], order[index]] = [order[index], order[heldIndex]];
    heldIndex = -1;
    moves++;
    message = '两枚风铃换好位置，听听起伏是否贴合';
    sound('tap');
    completeIfReady();
  }

  function undo() {
    if (phase !== 'play' || !history.length) {
      heldIndex = -1;
      message = '现在还没有可以撤销的交换';
      return;
    }
    const previous = history.pop();
    order = previous.order;
    moves = previous.moves;
    heldIndex = -1;
    message = '已撤销上一次交换，计时仍会继续';
    sound('tap');
  }

  function moveSelection(step) {
    selectedIndex = (selectedIndex + step + CHIME_ORDER.size) % CHIME_ORDER.size;
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      const step = Math.min(dt, CHIME_ORDER.limit - elapsed);
      elapsed += step;
      if (phase === 'transition') {
        transition -= step;
        if (transition <= 0) {
          round = rounds;
          order = [...puzzles[round].initial];
          selectedIndex = 0;
          heldIndex = -1;
          history = [];
          phase = 'play';
          message = '新旋律展开了，先找出第一枚风铃';
        }
      }
      if (!finished && elapsed >= CHIME_ORDER.limit) finish(false);
    },
    input(type, payload = {}) {
      if (finished || phase !== 'play') return;
      if (type === 'primary-down') choose(chimeAt(payload));
      if (type === 'undo') undo();
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (keys[key]) moveSelection(keys[key]);
        if (key === ' ' || key === 'enter') choose(selectedIndex);
        if (key === 'z' || key === 'backspace' || key === 'delete') undo();
        if (key === 'escape') {
          heldIndex = -1;
          message = '已放回手中的风铃';
        }
      }
    },
    getState() {
      return {
        elapsed,
        score: rounds * 400,
        rounds,
        round,
        phase,
        order: [...order],
        target: [...puzzle().target],
        selectedIndex,
        heldIndex,
        moves,
        finished,
        won,
        extra: `${rounds} / 3 · 已交换 ${moves} 次`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f4eddf';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '风铃排音', 300, 26, 27);
      label(ctx, `第 ${Math.min(round + 1, 3)} 段旋律 · 数字越大音越高`, 300, 53, 14, '#68776b');

      ctx.beginPath();
      ctx.moveTo(50, 82);
      ctx.quadraticCurveTo(300, 49, 550, 82);
      ctx.strokeStyle = '#8f785e';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();

      for (let index = 0; index < CHIME_ORDER.size; index++) {
        const pitch = order[index];
        const x = SLOT_X[index];
        const top = 96 + pitch * 5;
        const height = 122 - pitch * 10;
        ctx.beginPath();
        ctx.moveTo(x, 75 - Math.abs(index - 2.5) * 2);
        ctx.lineTo(x, top);
        ctx.strokeStyle = '#a28a69';
        ctx.lineWidth = 3;
        ctx.stroke();
        roundRect(ctx, x - 30, top, 60, height, 14, COLORS[pitch - 1], '#6f6558');
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, top + height);
        ctx.lineTo(x, top + height + 20);
        ctx.strokeStyle = '#a28a69';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, top + height + 29, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#efd07d';
        ctx.fill();
        label(ctx, pitch, x, top + Math.min(31, height / 2), 20, '#fff8e7');
        if (heldIndex === index) {
          ctx.setLineDash([6, 5]);
          ctx.strokeStyle = '#9a5361';
          ctx.lineWidth = 4;
          ctx.strokeRect(x - 36, top - 7, 72, height + 14);
          ctx.setLineDash([]);
        }
      }

      const cursor = chimePoint(selectedIndex);
      ctx.beginPath();
      ctx.arc(cursor.x, 283, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#536f5d';
      ctx.fill();

      roundRect(ctx, 47, 304, 506, 98, 22, '#fff8e8', '#d9cbae');
      ctx.lineWidth = 2;
      ctx.stroke();
      label(ctx, '旋律剪影', 92, 324, 13, '#6c755f');
      const target = puzzle().target;
      ctx.beginPath();
      target.forEach((pitch, index) => {
        const x = SLOT_X[index];
        const y = 384 - pitch * 10;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#7b9a7d';
      ctx.lineWidth = 4;
      ctx.stroke();
      target.forEach((pitch, index) => {
        const x = SLOT_X[index];
        const y = 384 - pitch * 10;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[pitch - 1];
        ctx.fill();
        ctx.strokeStyle = '#fff8e8';
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      roundRect(ctx, 54, 416, 492, 28, 14, '#fff8e7');
      label(ctx, message, 300, 430, 13, '#637064');
      label(ctx, '点两枚交换 · 左右键 / A D 选择 · 空格拿起 · Z 撤销', 300, 463, 12, '#77746a');
    },
    destroy() {
      finished = true;
      order = [];
      history = [];
    },
  };
}
