import { label, roundRect } from '@playground/game-sdk';
import { SWIPE, generateDeck, responseWindow, swipeDirection } from './deck.js';

export { DIRECTIONS, SWIPE, generateDeck, responseWindow, swipeDirection } from './deck.js';

const directionNames = {
  up: '向上',
  right: '向右',
  down: '向下',
  left: '向左',
};
const angles = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
const keyDirections = {
  arrowup: 'up',
  w: 'up',
  arrowright: 'right',
  d: 'right',
  arrowdown: 'down',
  s: 'down',
  arrowleft: 'left',
  a: 'left',
};

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const deck = generateDeck(seed);
  let elapsed = 0;
  let handled = 0;
  let correct = 0;
  let lives = SWIPE.lives;
  let timeLeft = responseWindow(0);
  let finished = false;
  let won = false;
  let pointerStart = null;
  let pointerNow = null;
  let flash = 0;
  let message = '看清风向，轻轻一划';

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    pointerStart = null;
    pointerNow = null;
    onFinish({ score: correct * 100, elapsed, won, correct, handled, lives });
  }

  function settle(direction, timedOut = false) {
    if (finished || handled >= SWIPE.total) return;
    const hit = direction === deck[handled];
    handled++;
    if (hit) {
      correct++;
      message = '顺风而行，下一张';
      sound('collect');
    } else {
      lives--;
      flash = 0.3;
      message = timedOut ? '花笺飘走了，慢慢来' : '风向不一样，再看清一点';
      sound('hit');
    }
    pointerStart = null;
    pointerNow = null;
    if (lives === 0) finish(false);
    else if (handled === SWIPE.total) finish(true);
    else timeLeft = responseWindow(handled);
  }

  function pointer(value) {
    return Number.isFinite(value.x) && Number.isFinite(value.y) ? { x: value.x, y: value.y } : null;
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, SWIPE.limit - elapsed);
      flash = Math.max(0, flash - remaining);
      while (remaining > 1e-10 && !finished) {
        const slice = Math.min(remaining, timeLeft);
        elapsed += slice;
        timeLeft -= slice;
        remaining -= slice;
        if (timeLeft <= 1e-10 && !finished) settle(null, true);
      }
      if (!finished && elapsed >= SWIPE.limit) finish(false);
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pointerStart = null;
        pointerNow = null;
        return;
      }
      if (finished) return;
      if (type === 'primary-down') {
        pointerStart = pointer(payload);
        pointerNow = pointerStart ? { ...pointerStart } : null;
      }
      if (type === 'primary-move' && pointerStart) pointerNow = pointer(payload);
      if (type === 'primary-up' && pointerStart) {
        const end = pointer(payload);
        const direction = swipeDirection(pointerStart, end);
        pointerStart = null;
        pointerNow = null;
        if (direction) settle(direction);
        else message = '划得再舒展一些';
      }
      if (type === 'key-down' && !payload.repeat) {
        const direction = keyDirections[String(payload.key).toLowerCase()];
        if (direction) settle(direction);
      }
    },
    getState() {
      return {
        elapsed,
        score: correct * 100,
        handled,
        correct,
        lives,
        timeLeft,
        direction: deck[handled] ?? null,
        finished,
        won,
        stroke:
          pointerStart && pointerNow
            ? { start: { ...pointerStart }, end: { ...pointerNow } }
            : null,
        extra: `${handled} / ${SWIPE.total} · 机会 ${lives}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f2ead9';
      ctx.fillRect(0, 0, 600, 480);
      ctx.fillStyle = '#dce5d3';
      ctx.beginPath();
      ctx.moveTo(0, 394);
      ctx.bezierCurveTo(130, 345, 235, 430, 360, 382);
      ctx.bezierCurveTo(470, 342, 535, 390, 600, 365);
      ctx.lineTo(600, 480);
      ctx.lineTo(0, 480);
      ctx.fill();
      label(ctx, '花笺逐风', 104, 34, 23);
      label(ctx, `划对 ${correct}/20 · 机会 ${lives}`, 475, 34, 16, '#5f7868');
      const progress = handled / SWIPE.total;
      roundRect(ctx, 38, 61, 524, 12, 6, '#e2d5bc');
      roundRect(ctx, 38, 61, 524 * progress, 12, 6, '#89a38d');
      const paper = flash ? '#f3d8d0' : '#fffaf0';
      roundRect(ctx, 159, 92, 282, 278, 28, paper, flash ? '#c87868' : '#b99c73');
      ctx.lineWidth = 3;
      for (const [x, y, color] of [
        [188, 121, '#d98f82'],
        [412, 121, '#d7b15e'],
        [188, 341, '#8fa685'],
        [412, 341, '#9a88a8'],
      ]) {
        ctx.fillStyle = color;
        for (let petal = 0; petal < 5; petal++) {
          const angle = (petal * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.ellipse(
            x + Math.cos(angle) * 11,
            y + Math.sin(angle) * 11,
            9,
            5,
            angle,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.fillStyle = '#f7deb1';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      const direction = deck[handled];
      if (direction) {
        ctx.save();
        ctx.translate(300, 218);
        ctx.rotate(angles[direction]);
        ctx.strokeStyle = flash ? '#b76256' : '#657f70';
        ctx.fillStyle = flash ? '#b76256' : '#657f70';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-62, 0);
        ctx.lineTo(62, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(78, 0);
        ctx.lineTo(48, -24);
        ctx.lineTo(48, 24);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        label(ctx, directionNames[direction], 300, 302, 22, '#526f63');
        label(ctx, `${Math.max(0, timeLeft).toFixed(1)} 秒`, 300, 337, 15, '#9b765a');
      }
      if (pointerStart && pointerNow) {
        ctx.strokeStyle = '#d48d73';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pointerStart.x, pointerStart.y);
        ctx.lineTo(pointerNow.x, pointerNow.y);
        ctx.stroke();
      }
      roundRect(ctx, 62, 409, 476, 42, 18, '#fff8e9');
      label(ctx, message, 300, 430, 16, flash ? '#a95d52' : '#5f7868');
      label(ctx, '触屏 / 鼠标划动 · 方向键 / WASD', 300, 468, 13, '#77766c');
    },
    destroy() {
      finished = true;
      pointerStart = null;
      pointerNow = null;
    },
  };
}
