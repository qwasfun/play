import { rng, roundRect, label } from '@playground/game-sdk';

const LIMIT = 120;
const COLS = 4;
const ROWS = 3;
const CARD_W = 88;
const CARD_H = 104;
const GAP = 12;
const X = 106;
const Y = 72;
const COLORS = ['#dc896f', '#dfa75a', '#86a77c', '#b39ac8', '#d2869e', '#80aaa4'];

export function generatePairs(seed) {
  const random = rng(`${seed}:flowers`);
  const board = Array.from({ length: 12 }, (_, index) => index % 6);
  for (let i = board.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [board[i], board[j]] = [board[j], board[i]];
  }
  return board;
}

function cardAt(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return -1;
  const col = Math.floor((x - X + GAP / 2) / (CARD_W + GAP));
  const row = Math.floor((y - Y + GAP / 2) / (CARD_H + GAP));
  return col >= 0 && col < COLS && row >= 0 && row < ROWS ? row * COLS + col : -1;
}

function flower(ctx, kind, x, y) {
  const color = COLORS[kind];
  ctx.strokeStyle = '#71977b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + 6);
  ctx.quadraticCurveTo(x + 2, y + 18, x - 2, y + 28);
  ctx.stroke();
  ctx.fillStyle = '#90b48a';
  ctx.beginPath();
  ctx.ellipse(x - 8, y + 17, 9, 4, .55, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 1) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 17);
    ctx.lineTo(x - 6, y - 7);
    ctx.lineTo(x, y - 22);
    ctx.lineTo(x + 7, y - 7);
    ctx.lineTo(x + 18, y - 17);
    ctx.quadraticCurveTo(x + 18, y + 12, x, y + 13);
    ctx.quadraticCurveTo(x - 18, y + 12, x - 18, y - 17);
    ctx.fill();
  } else if (kind === 2) {
    ctx.fillStyle = color;
    for (const [dx, dy] of [[-9, -9], [9, -9], [-9, 8], [9, 8]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#d8e3b4';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 3) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#c4add7' : color;
      ctx.beginPath();
      ctx.ellipse(x, y - 18 + i * 9, 10 + i, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const count = kind === 0 ? 7 : kind === 4 ? 5 : 6;
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count - Math.PI / 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(angle) * 12, y + Math.sin(angle) * 12, kind === 4 ? 12 : 9, 12, angle + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = kind === 5 ? '#fff3c0' : '#f5d076';
    ctx.beginPath();
    ctx.arc(x, y, kind === 4 ? 8 : 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const board = generatePairs(seed);
  const matched = Array(12).fill(false);
  let faceUp = [];
  let selected = 0;
  let pressed = -1;
  let elapsed = 0;
  let score = 0;
  let steps = 0;
  let pairs = 0;
  let mismatchTime = 0;
  let matchFlash = 0;
  let finished = false;
  let won = false;

  function finish(reason) {
    if (finished) return;
    finished = true;
    pressed = -1;
    onFinish({ score, elapsed, won, steps, reason });
  }

  function flip(index) {
    if (finished || mismatchTime > 0 || index < 0 || matched[index] || faceUp.includes(index)) return;
    selected = index;
    faceUp.push(index);
    steps++;
    sound('tap');
    if (faceUp.length !== 2) return;
    const [first, second] = faceUp;
    if (board[first] === board[second]) {
      matched[first] = matched[second] = true;
      faceUp = [];
      pairs++;
      score += 100;
      matchFlash = .45;
      sound('collect');
      if (pairs === 6) {
        won = true;
        score += Math.max(0, 120 - steps * 3);
        sound('win');
        finish('complete');
      }
    } else {
      mismatchTime = .7;
    }
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      elapsed = Math.min(LIMIT, elapsed + dt);
      matchFlash = Math.max(0, matchFlash - dt);
      if (mismatchTime > 0) {
        mismatchTime = Math.max(0, mismatchTime - dt);
        if (mismatchTime === 0) faceUp = [];
      }
      if (elapsed >= LIMIT) finish('time');
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') { pressed = -1; return; }
      if (finished) return;
      if (type === 'primary-down') pressed = mismatchTime > 0 ? -1 : cardAt(payload.x, payload.y);
      if (type === 'primary-up') {
        const index = cardAt(payload.x, payload.y);
        if (index === pressed) flip(index);
        pressed = -1;
      }
      if (type !== 'key-down' || payload.repeat || mismatchTime > 0) return;
      const key = payload.key;
      let row = Math.floor(selected / COLS);
      let col = selected % COLS;
      if (key === 'ArrowUp') row = (row + ROWS - 1) % ROWS;
      else if (key === 'ArrowDown') row = (row + 1) % ROWS;
      else if (key === 'ArrowLeft') col = (col + COLS - 1) % COLS;
      else if (key === 'ArrowRight') col = (col + 1) % COLS;
      else if (key === ' ' || key === 'Enter') flip(selected);
      else return;
      selected = row * COLS + col;
    },
    getState() {
      return {
        score, elapsed, steps, pairs, selected, finished, won,
        board: [...board], faceUp: [...faceUp], matched: [...matched], locked: mismatchTime > 0,
        extra: `${pairs} / 6`, progress: `${pairs} / 6 对`,
        hint: mismatchTime > 0 ? '记住这两朵花，等它们轻轻合上' : matchFlash > 0 ? '找到一对！小花园多了一点颜色' : '找出相同的花朵 · 每次有效翻牌计一步',
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#edf3e8';
      ctx.fillRect(0, 0, 600, 480);
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 ? '#dce7d0' : '#e2ead7';
        ctx.beginPath();
        ctx.ellipse(35 + i * 60, 25 + (i * 53) % 420, 11, 4, i * .7, 0, Math.PI * 2);
        ctx.fill();
      }
      label(ctx, '把相同的小花，种在一起。', 300, 28, 17, '#66816a', 'center', 600);
      roundRect(ctx, X - 14, Y - 14, 416, 364, 25, '#dfe9d8');
      for (let i = 0; i < 12; i++) {
        const x = X + (i % COLS) * (CARD_W + GAP);
        const y = Y + Math.floor(i / COLS) * (CARD_H + GAP);
        const open = matched[i] || faceUp.includes(i);
        roundRect(ctx, x, y + 4, CARD_W, CARD_H, 16, open ? '#c9d6bd' : '#739480');
        roundRect(ctx, x, y, CARD_W, CARD_H, 16, open ? matched[i] ? '#f3f4dc' : '#fff9e9' : '#93b29a');
        if (open) {
          flower(ctx, board[i], x + CARD_W / 2, y + 43);
          if (matched[i]) {
            label(ctx, '✓', x + CARD_W - 14, y + 14, 14, '#70936c', 'center', 700);
            label(ctx, '相伴', x + CARD_W / 2, y + 90, 10, '#879a72', 'center', 600);
          } else {
            label(ctx, '小小花园', x + CARD_W / 2, y + 89, 9, '#a2aa8e', 'center', 500);
          }
        } else {
          ctx.strokeStyle = '#c7dbc0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 44, y + 67);
          ctx.lineTo(x + 44, y + 40);
          ctx.stroke();
          ctx.fillStyle = '#d8e6c8';
          ctx.beginPath();
          ctx.ellipse(x + 35, y + 43, 11, 6, .45, 0, Math.PI * 2);
          ctx.ellipse(x + 52, y + 35, 11, 6, -.6, 0, Math.PI * 2);
          ctx.fill();
          label(ctx, String(i + 1).padStart(2, '0'), x + CARD_W / 2, y + 88, 10, '#e5eddc', 'center', 600);
        }
        if (selected === i) {
          ctx.save();
          ctx.strokeStyle = '#477a62';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.roundRect(x - 3, y - 3, CARD_W + 6, CARD_H + 6, 18);
          ctx.stroke();
          ctx.restore();
        }
        if (mismatchTime > 0 && faceUp.includes(i)) roundRect(ctx, x, y, CARD_W, CARD_H, 16, null, '#dba78d');
      }
      label(ctx, `已翻 ${steps} 次 · 找到 ${pairs} / 6 对`, 300, 440, 15, '#66816a', 'center', 600);
      label(ctx, '点击翻牌 · 方向键选择，空格确认', 300, 465, 13, '#8a9b7c', 'center', 500);
    },
    destroy() { pressed = -1; },
  };
}
