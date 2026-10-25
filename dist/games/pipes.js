import { rng, roundRect, label } from '../core.js';

const LIMIT = 180;
const N = 1, E = 2, S = 4, W = 8;
const CELL = 86, GAP = 10, X = 113, Y = 48;
const DIRECTIONS = [[0, -1, N, S], [1, 0, E, W], [0, 1, S, N], [-1, 0, W, E]];

export function rotateMask(mask, times = 1) {
  let next = mask;
  for (let i = 0; i < ((times % 4) + 4) % 4; i++) next = ((next << 1) & 15) | (next >> 3);
  return next;
}

export function pipeMasks(types, rotations) { return types.map((mask, index) => rotateMask(mask, rotations[index])); }

export function tracePipes(board) {
  if (!(board[0] & W)) return { connected: [], won: false };
  const connected = [0], visited = new Set(connected);
  for (let head = 0; head < connected.length; head++) {
    const cell = connected[head], x = cell % 4, y = Math.floor(cell / 4);
    for (const [dx, dy, exit, entry] of DIRECTIONS) {
      if (!(board[cell] & exit)) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= 4 || ny < 0 || ny >= 4) continue;
      const neighbor = ny * 4 + nx;
      if (!(board[neighbor] & entry) || visited.has(neighbor)) continue;
      visited.add(neighbor);
      connected.push(neighbor);
    }
  }
  return { connected, won: visited.has(15) && Boolean(board[15] & E) };
}

export function generatePipes(seed) {
  const random = rng(`${seed}:garden-water`);
  const directions = ['R', 'R', 'R', 'D', 'D', 'D'];
  for (let i = directions.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [directions[i], directions[j]] = [directions[j], directions[i]]; }
  const path = [0];
  for (const direction of directions) path.push(path[path.length - 1] + (direction === 'R' ? 1 : 4));
  const types = Array.from({ length: 16 }, () => [N | S, N | E, N | E | S][Math.floor(random() * 3)]);
  const rotations = Array.from({ length: 16 }, () => Math.floor(random() * 4));
  const solvedRotations = [...rotations];
  for (let i = 0; i < path.length; i++) {
    const current = path[i];
    const before = i === 0 ? W : current - path[i - 1] === 1 ? W : N;
    const after = i === path.length - 1 ? E : path[i + 1] - current === 1 ? E : S;
    const mask = before | after;
    types[current] = mask === (N | S) || mask === (E | W) ? N | S : N | E;
    for (let turn = 0; turn < 4; turn++) if (rotateMask(types[current], turn) === mask) { solvedRotations[current] = turn; break; }
  }
  // The water source always needs a deliberate turn before water can enter the puzzle.
  while (rotateMask(types[0], rotations[0]) & W) rotations[0] = (rotations[0] + 1) % 4;
  const solution = rotations.map((rotation, index) => (solvedRotations[index] - rotation + 4) % 4);
  return { types, rotations, solvedRotations, solution, path };
}

function cellAt(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return -1;
  const col = Math.floor((x - X + GAP / 2) / (CELL + GAP));
  const row = Math.floor((y - Y + GAP / 2) / (CELL + GAP));
  return col >= 0 && col < 4 && row >= 0 && row < 4 ? row * 4 + col : -1;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const puzzle = generatePipes(seed);
  const types = [...puzzle.types];
  let rotations = [...puzzle.rotations];
  let board = pipeMasks(types, rotations);
  let flow = tracePipes(board);
  let steps = 0, elapsed = 0, selected = 0, pressed = -1, finished = false, won = false;
  const score = () => won ? 300 + Math.max(0, 120 - steps * 2) : flow.connected.length * 10;

  function finish(reason) {
    if (finished) return;
    finished = true;
    pressed = -1;
    onFinish({ score: score(), elapsed, won, steps, reason });
  }
  function turn(cell) {
    if (finished || cell < 0) return;
    rotations[cell] = (rotations[cell] + 1) % 4;
    board = pipeMasks(types, rotations);
    const before = flow.connected.length;
    flow = tracePipes(board);
    selected = cell;
    steps++;
    sound(flow.connected.length > before ? 'collect' : 'tap');
    if (flow.won) { won = true; sound('win'); finish('complete'); }
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      elapsed = Math.min(LIMIT, elapsed + dt);
      if (elapsed >= LIMIT) finish('time');
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') { pressed = -1; return; }
      if (finished) return;
      if (type === 'primary-down') pressed = cellAt(payload.x, payload.y);
      if (type === 'primary-up') {
        const cell = cellAt(payload.x, payload.y);
        if (cell === pressed) turn(cell);
        pressed = -1;
      }
      if (type !== 'key-down' || payload.repeat) return;
      const key = payload.key;
      let row = Math.floor(selected / 4), col = selected % 4;
      if (key === 'ArrowUp') row = (row + 3) % 4;
      else if (key === 'ArrowDown') row = (row + 1) % 4;
      else if (key === 'ArrowLeft') col = (col + 3) % 4;
      else if (key === 'ArrowRight') col = (col + 1) % 4;
      else if (key === ' ' || key === 'Enter') turn(selected);
      else return;
      selected = row * 4 + col;
    },
    getState() {
      return { score: score(), elapsed, steps, extra: `${flow.connected.length} 格连通`, hint: flow.connected.length ? '让清水继续前进，送到右下角的小花' : '从左上角开始，让入口接住清水', board: [...board], types: [...types], rotations: [...rotations], connected: [...flow.connected], selected, finished, won };
    },
    draw(ctx) {
      ctx.fillStyle = '#f2f3e7'; ctx.fillRect(0, 0, 600, 480);
      label(ctx, '转一转，把清水送到小花身边。', 300, 25, 16, '#7c9183', 'center', 600);
      roundRect(ctx, X - 14, Y - 14, 402, 402, 25, '#dce8e4');
      for (let i = 0; i < 16; i++) {
        const x = X + i % 4 * (CELL + GAP), y = Y + Math.floor(i / 4) * (CELL + GAP);
        roundRect(ctx, x, y, CELL, CELL, 14, flow.connected.includes(i) ? '#f2f8ed' : '#edf2e9');
      }
      for (let i = 0; i < 16; i++) {
        const x = X + i % 4 * (CELL + GAP), y = Y + Math.floor(i / 4) * (CELL + GAP);
        const cx = x + CELL / 2, cy = y + CELL / 2;
        const wet = flow.connected.includes(i);
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const [color, thickness] of [[wet ? '#7fa8a7' : '#b5c8c5', 26], ['#f9fbf0', 17], [wet ? '#76c3cf' : '#d5e0d9', 11]]) {
          ctx.strokeStyle = color; ctx.lineWidth = thickness;
          ctx.beginPath();
          for (const [dx, dy, port] of DIRECTIONS) if (board[i] & port) { ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * (CELL / 2 + GAP / 2), cy + dy * (CELL / 2 + GAP / 2)); }
          ctx.stroke();
        }
        ctx.fillStyle = wet ? '#76c3cf' : '#d5e0d9'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (selected === i) {
          ctx.save(); ctx.strokeStyle = '#6c9a98'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
          ctx.beginPath(); ctx.roundRect(x - 3, y - 3, CELL + 6, CELL + 6, 16); ctx.stroke(); ctx.restore();
        }
      }
      const inletY = Y + CELL / 2;
      roundRect(ctx, 65, inletY - 10, X - 65, 20, 8, '#8ac8cf');
      label(ctx, '→', 79, inletY, 21, '#f8fff2', 'center', 800);
      label(ctx, '水源', 78, inletY - 27, 11, '#7d9c9a', 'center', 600);
      const outletY = Y + 3 * (CELL + GAP) + CELL / 2;
      roundRect(ctx, X + 3 * (CELL + GAP) + CELL, outletY - 9, 43, 18, 7, won ? '#8ac8cf' : '#c7d8cb');
      ctx.strokeStyle = '#87a77d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(548, outletY + 6); ctx.lineTo(548, outletY + 33); ctx.stroke();
      ctx.fillStyle = '#a0bd91'; ctx.beginPath(); ctx.ellipse(539, outletY + 25, 10, 5, .5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = won ? '#efbc77' : '#d9c39e';
      for (let petal = 0; petal < 6; petal++) { const a = petal * Math.PI / 3; ctx.beginPath(); ctx.arc(548 + Math.cos(a) * 11, outletY + Math.sin(a) * 11, 8, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#fff3bd'; ctx.beginPath(); ctx.arc(548, outletY, 7, 0, Math.PI * 2); ctx.fill();
      label(ctx, '点击顺时针旋转 · 方向键选择，空格确认', 300, 463, 13, '#879b8f', 'center', 500);
    },
    destroy() { pressed = -1; finished = true; },
  };
}
