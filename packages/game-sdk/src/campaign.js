import { roundRect, label } from './index.js';
export const GRID = { x: 20, y: 20, side: 560 };
export function cellAt({ x, y }, size) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return -1;
  const col = Math.floor(((x - GRID.x) * size) / GRID.side),
    row = Math.floor(((y - GRID.y) * size) / GRID.side);
  return col >= 0 && row >= 0 && col < size && row < size ? row * size + col : -1;
}
export function cellRect(cell, size) {
  const side = GRID.side / size;
  return { x: GRID.x + (cell % size) * side, y: GRID.y + Math.floor(cell / size) * side, side };
}
export function adjacent(cell, size) {
  const x = cell % size,
    y = Math.floor(cell / size);
  return [
    [x, y - 1],
    [x + 1, y],
    [x, y + 1],
    [x - 1, y],
  ]
    .filter(([a, b]) => a >= 0 && b >= 0 && a < size && b < size)
    .map(([a, b]) => b * size + a);
}
export function moveSelection(cell, key, size) {
  const delta = {
    arrowup: -size,
    w: -size,
    arrowdown: size,
    s: size,
    arrowleft: -1,
    a: -1,
    arrowright: 1,
    d: 1,
  }[String(key).toLowerCase()];
  if (delta === undefined) return cell;
  const x = cell % size,
    y = Math.floor(cell / size);
  return Math.abs(delta) === size
    ? ((y + (delta > 0 ? 1 : -1) + size) % size) * size + x
    : y * size + ((x + delta + size) % size);
}
export function createCampaignClock(onFinish = () => {}, sound = () => {}) {
  let elapsed = 0,
    steps = 0,
    finished = false,
    won = false,
    destroyed = false;
  return {
    get elapsed() {
      return elapsed;
    },
    get active() {
      return !finished && !destroyed;
    },
    step() {
      if (!finished && !destroyed) steps++;
    },
    update(dt) {
      if (!finished && !destroyed && Number.isFinite(dt) && dt > 0) elapsed += dt;
    },
    finish(success, reason = 'complete', extra = {}) {
      if (finished || destroyed) return;
      finished = true;
      won = success;
      sound(success ? 'win' : 'hit');
      onFinish({ score: steps, steps, elapsed, won, reason, ...extra });
    },
    state() {
      return { steps, score: steps, elapsed, finished, won };
    },
    destroy() {
      destroyed = true;
    },
  };
}
export function boardBackground(ctx, color = '#edf1df') {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 600, 600);
}
export function tile(ctx, cell, size, { fill = '#fff6dc', selected = false } = {}) {
  const { x, y, side } = cellRect(cell, size);
  roundRect(ctx, x + 3, y + 5, side - 6, side - 7, Math.min(16, side / 6), fill);
  if (selected) {
    ctx.save();
    ctx.strokeStyle = '#315f55';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x + 4, y + 4, side - 8, side - 8);
    ctx.restore();
  }
  return { x: x + side / 2, y: y + side / 2, side };
}
export function glyph(ctx, text, cell, size, color = '#315f55', scale = 0.38) {
  const { x, y, side } = cellRect(cell, size);
  label(ctx, text, x + side / 2, y + side / 2, side * scale, color);
}
