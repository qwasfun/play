import { label, roundRect } from '@playground/game-sdk';
import { feedback, generateSecret } from './code.js';

export { feedback, generateSecret } from './code.js';

const LIMIT = 180;
const names = ['', '桃', '梅', '兰', '桂', '竹'];
const colors = ['', '#d98282', '#b87991', '#748f78', '#c69a55', '#6f8f83'];
const SLOT_X = 91;
const SLOT_GAP = 86;
const SLOT_Y = 78;
const PALETTE_X = 132;
const PALETTE_GAP = 84;
const PALETTE_Y = 164;

const validPoint = (point) => Number.isFinite(point.x) && Number.isFinite(point.y);

function targetAt(point) {
  if (!validPoint(point)) return '';
  for (let index = 0; index < 4; index++) {
    const x = SLOT_X + index * SLOT_GAP;
    if (point.x >= x && point.x <= x + 66 && point.y >= SLOT_Y && point.y <= SLOT_Y + 62)
      return `slot:${index}`;
  }
  for (let index = 0; index < 5; index++) {
    const x = PALETTE_X + index * PALETTE_GAP;
    if (Math.hypot(point.x - x, point.y - PALETTE_Y) <= 28) return `symbol:${index + 1}`;
  }
  if (point.x >= 455 && point.x <= 566 && point.y >= 82 && point.y <= 137) return 'submit';
  return '';
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const secret = generateSecret(seed);
  let elapsed = 0;
  let attempts = 0;
  let exact = 0;
  let finished = false;
  let won = false;
  let cursor = 0;
  let pressed = '';
  let draft = [0, 0, 0, 0];
  let history = [];
  let message = '选好四枚花印，再提交这一行猜测';

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({
      score: won ? 1100 - attempts * 100 : 0,
      elapsed,
      won,
      attempts,
      exact,
    });
  }

  function setSymbol(value) {
    if (!Number.isInteger(value) || value < 1 || value > 5) return;
    draft[cursor] = value;
    cursor = (cursor + 1) % 4;
    message = draft.every(Boolean) ? '花印齐了，提交看看提示吧' : '继续选择下一枚花印';
    sound('tap');
  }

  function cycle(delta) {
    const current = draft[cursor];
    draft[cursor] = current ? ((current - 1 + delta + 5) % 5) + 1 : delta > 0 ? 1 : 5;
    message = draft.every(Boolean) ? '花印齐了，提交看看提示吧' : '继续选择下一枚花印';
    sound('tap');
  }

  function submit() {
    if (!draft.every((value) => Number.isInteger(value) && value >= 1 && value <= 5)) {
      message = '这一行还没有填满四枚花印';
      sound('error');
      return;
    }
    const result = feedback(secret, draft);
    attempts++;
    exact = result.exact;
    history.push({ guess: [...draft], ...result });
    if (exact === 4) {
      message = '暗语解开了，花房的门轻轻亮起';
      sound('win');
      finish(true);
      return;
    }
    sound('tap');
    if (attempts === 8) {
      message = '八张花笺用完了，下次一定能解开';
      finish(false);
      return;
    }
    draft = [0, 0, 0, 0];
    cursor = 0;
    message = `实心 ${result.exact} · 空心 ${result.near}，换一组试试`;
  }

  function activate(target) {
    if (target.startsWith('slot:')) cursor = Number(target.slice(5));
    else if (target.startsWith('symbol:')) setSymbol(Number(target.slice(7)));
    else if (target === 'submit') submit();
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      elapsed = Math.min(LIMIT, elapsed + dt);
      if (elapsed >= LIMIT) finish(false);
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = '';
        return;
      }
      if (finished) return;
      if (type === 'primary-down') pressed = targetAt(payload);
      if (type === 'primary-up') {
        const target = targetAt(payload);
        if (target && target === pressed) activate(target);
        pressed = '';
      }
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (key === 'arrowleft' || key === 'a') cursor = (cursor + 3) % 4;
        if (key === 'arrowright' || key === 'd') cursor = (cursor + 1) % 4;
        if (key === 'arrowup' || key === 'w' || key === ' ') cycle(1);
        if (key === 'arrowdown' || key === 's') cycle(-1);
        if (/^[1-5]$/.test(key)) setSymbol(Number(key));
        if (key === 'backspace' || key === 'delete') {
          draft[cursor] = 0;
          message = '已留出一个空位，重新选一枚花印';
        }
        if (key === 'enter') submit();
      }
    },
    getState() {
      return {
        draft: [...draft],
        history: history.map((row) => ({ ...row, guess: [...row.guess] })),
        elapsed,
        score: won ? 1100 - attempts * 100 : 0,
        attempts,
        exact,
        finished,
        won,
        cursor,
        extra: `${attempts} / 8 · ${exact} 个位置正确`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f6eedc';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '花房暗语', 300, 27, 27);
      label(ctx, `第 ${Math.min(attempts + 1, 8)} 张花笺 · 实心位置对，空心花印对`, 300, 56, 15);

      for (let index = 0; index < 4; index++) {
        const x = SLOT_X + index * SLOT_GAP;
        roundRect(
          ctx,
          x,
          SLOT_Y,
          66,
          62,
          18,
          draft[index] ? colors[draft[index]] : '#fffaf0',
          cursor === index ? '#526f63' : '#cbb997',
        );
        label(
          ctx,
          draft[index] ? names[draft[index]] : '＋',
          x + 33,
          SLOT_Y + 31,
          draft[index] ? 22 : 25,
          draft[index] ? '#fffaf0' : '#b7a687',
        );
      }
      roundRect(ctx, 455, 82, 111, 55, 18, '#748f78', '#526f63');
      label(ctx, '提交花笺', 510, 110, 16, '#fffaf0');

      for (let index = 0; index < 5; index++) {
        const x = PALETTE_X + index * PALETTE_GAP;
        ctx.fillStyle = colors[index + 1];
        ctx.beginPath();
        ctx.arc(x, PALETTE_Y, 25, 0, Math.PI * 2);
        ctx.fill();
        label(ctx, names[index + 1], x, PALETTE_Y, 16, '#fffaf0');
      }

      roundRect(ctx, 72, 198, 456, 224, 22, '#eadfc9');
      label(ctx, '已提交的花笺', 93, 218, 14, '#7a6c57', 'left');
      history.forEach((row, rowIndex) => {
        const y = 246 + rowIndex * 22;
        label(ctx, rowIndex + 1, 96, y, 13, '#8a7a63');
        row.guess.forEach((value, column) => {
          const x = 132 + column * 42;
          ctx.fillStyle = colors[value];
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fill();
          label(ctx, names[value], x, y, 8, '#fffaf0');
        });
        label(ctx, `● ${row.exact}   ○ ${row.near}`, 450, y, 13, '#526f63');
      });
      if (!history.length) label(ctx, '第一条提示会出现在这里', 300, 315, 15, '#a08f73');
      label(ctx, message, 300, 445, 15, exact === 4 ? '#52725f' : '#7a6555');
      label(ctx, '点花印或按 1–5 填写 · 回车提交', 300, 468, 13, '#7a786b');
    },
    destroy() {
      finished = true;
      pressed = '';
      history = [];
    },
  };
}
