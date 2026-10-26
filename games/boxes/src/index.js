import { rng, roundRect, label } from '@playground/game-sdk';

const LIMIT = 180;
const CELL = 56;
const X = 104;
const Y = 48;
const DIRECTIONS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
export const BOX_MAPS = [
  { id: 'three-blossoms', rows: ['#######', '#  .  #', '#  $  #', '#.$@$.#', '#     #', '#     #', '#######'], solution: 'UDLRR' },
  { id: 'garden-gate', rows: ['#######', '# . . #', '# $ $ #', '#  #  #', '#  $ .#', '#  @  #', '#######'], solution: 'LURRUUDDLLUU' },
  { id: 'little-path', rows: ['#######', '#     #', '# .#. #', '# $ $ #', '#  $  #', '# .@  #', '#######'], solution: 'LUUDDRRUUDLULD' },
];

export function getPuzzle(seed, mapIndex) {
  const random = rng(`${seed}:garden-boxes`);
  const index = Number.isInteger(mapIndex) ? ((mapIndex % BOX_MAPS.length) + BOX_MAPS.length) % BOX_MAPS.length : Math.floor(random() * BOX_MAPS.length);
  const source = BOX_MAPS[index];
  const width = source.rows[0].length;
  const height = source.rows.length;
  const board = source.rows.join('').split('');
  const crates = [], goals = [];
  let player = -1;
  board.forEach((value, cell) => {
    if (value === '$' || value === '*') crates.push(cell);
    if (value === '.' || value === '*' || value === '+') goals.push(cell);
    if (value === '@' || value === '+') player = cell;
    if ('$@*+'.includes(value)) board[cell] = value === '*' || value === '+' ? '.' : ' ';
  });
  return { mapId: source.id, width, height, board, player, crates, goals, solution: source.solution };
}

export const generateBoxes = getPuzzle;

export function moveBoxes({ board, width = 7, height = 7, player, crates }, direction) {
  const next = { player, crates: [...crates], moved: false, pushed: false };
  const delta = DIRECTIONS[direction];
  if (!delta) return next;
  const [dx, dy] = delta;
  const px = player % width, py = Math.floor(player / width);
  const x = px + dx, y = py + dy;
  if (x < 0 || x >= width || y < 0 || y >= height) return next;
  const target = y * width + x;
  if (board[target] === '#') return next;
  const crate = crates.indexOf(target);
  if (crate >= 0) {
    const bx = x + dx, by = y + dy;
    if (bx < 0 || bx >= width || by < 0 || by >= height) return next;
    const beyond = by * width + bx;
    if (board[beyond] === '#' || crates.includes(beyond)) return next;
    next.crates[crate] = beyond;
    next.pushed = true;
  }
  next.player = target;
  next.moved = true;
  return next;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const puzzle = getPuzzle(seed);
  const { board, width, height, goals } = puzzle;
  let player = puzzle.player;
  let crates = [...puzzle.crates];
  let steps = 0, elapsed = 0, start = null, finished = false, won = false, flash = 0;
  let message = '把三个木箱，推到开花的位置';
  const history = [];
  const placed = () => crates.filter(cell => goals.includes(cell)).length;
  const score = () => won ? 300 + Math.max(0, 150 - steps * 3) : placed() * 100;

  function finish(reason) {
    if (finished) return;
    finished = true;
    start = null;
    onFinish({ score: score(), elapsed, steps, won, reason });
  }

  function move(direction) {
    if (finished) return;
    const result = moveBoxes({ board, width, height, player, crates }, direction);
    if (!result.moved) { message = '这里走不通，换个方向，或撤销上一步'; return; }
    history.push({ player, crates: [...crates] });
    const before = placed();
    player = result.player;
    crates = result.crates;
    steps++;
    if (placed() > before) {
      flash = .5;
      message = '一只木箱，找到自己的小花圃了';
      sound('collect');
    } else {
      message = result.pushed ? '木箱只能推，记得给自己留条小路' : '慢慢来，每一步都可以撤销';
      sound('tap');
    }
    if (placed() === 3) { won = true; sound('win'); finish('complete'); }
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      elapsed = Math.min(LIMIT, elapsed + dt);
      flash = Math.max(0, flash - dt);
      if (elapsed >= LIMIT) finish('time');
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') { start = null; return; }
      if (finished) return;
      if (type === 'undo') {
        start = null;
        if (history.length) {
          const previous = history.pop();
          player = previous.player;
          crates = previous.crates;
          message = '退回上一步了，已计步数会保留';
          sound('tap');
        }
        return;
      }
      if (type === 'primary-down' && Number.isFinite(payload.x) && Number.isFinite(payload.y)) start = { x: payload.x, y: payload.y };
      if (type === 'primary-up') {
        const origin = start;
        start = null;
        if (!origin || !Number.isFinite(payload.x) || !Number.isFinite(payload.y)) return;
        const dx = payload.x - origin.x, dy = payload.y - origin.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        move(Math.abs(dx) >= Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down');
      }
      if (type !== 'key-down' || payload.repeat) return;
      const direction = { arrowup: 'up', w: 'up', arrowright: 'right', d: 'right', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left' }[String(payload.key).toLowerCase()];
      if (direction) move(direction);
    },
    getState() {
      return { score: score(), elapsed, steps, extra: `${placed()} / 3`, hint: flash > 0 ? '小花圃亮起来了，再找找下一个位置' : message, board: [...board], player, crates: [...crates], goals: [...goals], width, height, mapId: puzzle.mapId, canUndo: history.length > 0, finished, won, swiping: start !== null };
    },
    draw(ctx) {
      ctx.fillStyle = '#edf2e4'; ctx.fillRect(0, 0, 600, 480);
      label(ctx, '给每一只木箱，找一块小花圃。', 300, 25, 16, '#6d8664', 'center', 600);
      roundRect(ctx, X - 9, Y - 9, 410, 410, 23, '#c9d8b9');
      for (let i = 0; i < board.length; i++) {
        const x = X + i % width * CELL, y = Y + Math.floor(i / width) * CELL;
        if (board[i] === '#') {
          roundRect(ctx, x + 2, y + 5, CELL - 4, CELL - 5, 10, '#98b48b');
          roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 7, 10, '#b6cba1');
          ctx.fillStyle = '#a1bb90'; ctx.beginPath(); ctx.ellipse(x + 19, y + 19, 9, 4, -.4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(x + 35, y + 30, 8, 4, .5, 0, Math.PI * 2); ctx.fill();
        } else {
          roundRect(ctx, x + 1, y + 1, CELL - 2, CELL - 2, 8, (i + Math.floor(i / width)) % 2 ? '#e0e7cc' : '#e6ebd5');
          if (goals.includes(i)) {
            roundRect(ctx, x + 7, y + 7, CELL - 14, CELL - 14, 10, '#c7d8ad');
            ctx.fillStyle = '#f1c57c';
            for (let petal = 0; petal < 5; petal++) { const a = petal * Math.PI * 2 / 5; ctx.beginPath(); ctx.arc(x + 28 + Math.cos(a) * 8, y + 28 + Math.sin(a) * 8, 5, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = '#fff3c6'; ctx.beginPath(); ctx.arc(x + 28, y + 28, 5, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      for (const cell of crates) {
        const x = X + cell % width * CELL, y = Y + Math.floor(cell / width) * CELL;
        const onGoal = goals.includes(cell);
        roundRect(ctx, x + 7, y + 10, 43, 42, 9, onGoal ? '#81a478' : '#bb9366');
        roundRect(ctx, x + 6, y + 5, 43, 42, 9, onGoal ? '#a9c394' : '#dcb283');
        ctx.strokeStyle = onGoal ? '#729667' : '#b18458'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x + 14, y + 14); ctx.lineTo(x + 42, y + 38); ctx.moveTo(x + 42, y + 14); ctx.lineTo(x + 14, y + 38); ctx.stroke();
        roundRect(ctx, x + 10, y + 9, 35, 34, 5, null, onGoal ? '#d2dfb6' : '#f0cca2');
        if (onGoal) label(ctx, '✓', x + 28, y + 27, 24, '#fff9d8', 'center', 800);
      }
      const px = X + player % width * CELL + 28, py = Y + Math.floor(player / width) * CELL;
      ctx.fillStyle = '#abc09b'; ctx.beginPath(); ctx.ellipse(px, py + 47, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
      roundRect(ctx, px - 12, py + 24, 24, 23, 8, '#6a9d9a');
      ctx.fillStyle = '#efd1ad'; ctx.beginPath(); ctx.arc(px, py + 21, 11, 0, Math.PI * 2); ctx.fill();
      roundRect(ctx, px - 15, py + 10, 30, 8, 4, '#e6b96e');
      roundRect(ctx, px - 10, py + 4, 20, 11, 4, '#f1ce8c');
      label(ctx, '滑动 / 方向键移动 · 撤销保留已计步数', 300, 465, 13, '#7c9271', 'center', 500);
    },
    destroy() { start = null; finished = true; },
  };
}
