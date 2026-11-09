import { label, roundRect } from '@playground/game-sdk';
import {
  colorAtDirection,
  DIRECTIONS,
  generateDrops,
  PETALS,
  PETAL_WHEEL,
  responseWindow,
} from './course.js';

export {
  colorAtDirection,
  DIRECTIONS,
  generateDrops,
  PETALS,
  PETAL_WHEEL,
  responseWindow,
} from './course.js';

const leftKeys = new Set(['ArrowLeft', 'a']);
const rightKeys = new Set(['ArrowRight', 'd']);
const validPoint = (point) =>
  Number.isFinite(point?.x) &&
  Number.isFinite(point?.y) &&
  point.x >= 0 &&
  point.x <= 600 &&
  point.y >= 0 &&
  point.y <= 480;
const mod = (value) => ((value % 4) + 4) % 4;

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const drops = generateDrops(seed);
  let elapsed = 0;
  let score = 0;
  let progress = 0;
  let lives = PETAL_WHEEL.lives;
  let rotation = 0;
  let phase = 'approach';
  let dropLeft = responseWindow(0);
  let transition = 0;
  let finished = false;
  let won = false;
  let flash = 0;
  let message = `${DIRECTIONS[drops[0].direction].name}飞来一颗${PETALS[drops[0].color].name}露珠`;

  function currentDrop() {
    return drops[progress] ?? null;
  }

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score, elapsed, won, progress, lives });
  }

  function loadDrop() {
    phase = 'approach';
    dropLeft = responseWindow(progress);
    const drop = currentDrop();
    message = `${DIRECTIONS[drop.direction].name}飞来一颗${PETALS[drop.color].name}露珠`;
  }

  function resolveDrop() {
    const drop = currentDrop();
    if (colorAtDirection(rotation, drop.direction) === drop.color) {
      progress++;
      score = progress * PETAL_WHEEL.score;
      flash = 1;
      sound('collect');
      if (progress === PETAL_WHEEL.total) {
        message = '二十颗晨露都落进花心啦！';
        sound('win');
        finish(true);
        return;
      }
      phase = 'bloom';
      transition = PETAL_WHEEL.bloomTime;
      message = '接住啦，下一颗露珠正乘着晨风来';
      return;
    }
    lives--;
    flash = -1;
    sound('hit');
    message = `露珠碰到了${PETALS[colorAtDirection(rotation, drop.direction)].name}花瓣，再转准一点`;
    if (lives === 0) {
      finish(false);
      return;
    }
    phase = 'reset';
    transition = PETAL_WHEEL.resetTime;
  }

  function rotate(delta) {
    if (finished || phase !== 'approach') return;
    rotation = mod(rotation + delta);
    sound('move');
    const drop = currentDrop();
    const petal = PETALS[colorAtDirection(rotation, drop.direction)];
    message = `${DIRECTIONS[drop.direction].name}是${petal.name}花瓣 · 要接${PETALS[drop.color].name}露珠`;
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, PETAL_WHEEL.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        const step = Math.min(remaining, 0.02);
        remaining -= step;
        elapsed += step;
        flash += (0 - flash) * Math.min(1, step * 6);
        if (phase === 'approach') {
          dropLeft -= step;
          if (dropLeft <= 0) resolveDrop();
        } else {
          transition -= step;
          if (transition <= 0) loadDrop();
        }
        if (!finished && elapsed >= PETAL_WHEEL.limit) finish(false);
      }
    },
    input(type, payload = {}) {
      if (finished || phase !== 'approach') return;
      if (type === 'key-down' && !payload.repeat) {
        if (leftKeys.has(payload.key)) rotate(-1);
        if (rightKeys.has(payload.key)) rotate(1);
      }
      if (type === 'primary-down' && validPoint(payload)) rotate(payload.x < 300 ? -1 : 1);
    },
    getState() {
      const drop = currentDrop();
      return {
        elapsed,
        score,
        progress,
        lives,
        rotation,
        drop: drop ? { ...drop } : null,
        dropLeft,
        phase,
        finished,
        won,
        extra: `${progress} / ${PETAL_WHEEL.total} · 机会 ${lives}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f1eadf';
      ctx.fillRect(0, 0, 600, 480);
      const sky = ctx.createLinearGradient(0, 62, 0, 430);
      sky.addColorStop(0, '#e6eddf');
      sky.addColorStop(1, '#b9d2bf');
      roundRect(ctx, 22, 68, 556, 362, 34, sky);
      label(ctx, '花轮接露', 102, 34, 23);
      label(ctx, `晨露 ${progress}/20 · 机会 ${lives}`, 478, 34, 16, '#587060');

      ctx.fillStyle = '#8ab0a1';
      ctx.globalAlpha = 0.26;
      ctx.beginPath();
      ctx.ellipse(300, 280, 185, 47, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const cx = 300;
      const cy = 248;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 2);
      for (let index = 0; index < PETALS.length; index++) drawPetal(ctx, index, PETALS[index]);
      ctx.fillStyle = '#f5d67d';
      ctx.strokeStyle = flash < 0 ? '#b85f58' : flash > 0 ? '#fff1ad' : '#9e7450';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 34 + Math.abs(flash) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff7d6';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (!finished && currentDrop()) {
        const drop = currentDrop();
        const direction = DIRECTIONS[drop.direction];
        const ratio = Math.max(0, dropLeft / responseWindow(progress));
        const radius = 116 + ratio * 116;
        drawDrop(ctx, cx + direction.x * radius, cy + direction.y * radius, PETALS[drop.color]);
        label(
          ctx,
          `${DIRECTIONS[drop.direction].name} · ${PETALS[drop.color].name}`,
          300,
          89,
          15,
          '#5c6f60',
        );
      }

      roundRect(ctx, 56, 394, 488, 34, 16, '#fff9e9');
      label(ctx, message, 300, 411, 14, flash < 0 ? '#a65c50' : '#587060');
      drawControl(ctx, 118, 451, -1, '左转');
      drawControl(ctx, 482, 451, 1, '右转');
      label(ctx, '轻点左右 · ← → / A D', 300, 454, 12, '#747166');
    },
    destroy() {
      finished = true;
    },
  };
}

function drawPetal(ctx, index, petal) {
  ctx.save();
  ctx.rotate((index * Math.PI) / 2);
  ctx.fillStyle = petal.color;
  ctx.strokeStyle = petal.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-24, -19);
  ctx.bezierCurveTo(-63, -42, -63, -116, 0, -137);
  ctx.bezierCurveTo(63, -116, 63, -42, 24, -19);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#fff8e8';
  ctx.fillStyle = '#fff8e8';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  if (index === 0) {
    ctx.beginPath();
    ctx.arc(0, -84, 9, 0, Math.PI * 2);
    ctx.fill();
  } else if (index === 1) {
    ctx.beginPath();
    ctx.moveTo(-16, -91);
    ctx.lineTo(16, -91);
    ctx.moveTo(-14, -75);
    ctx.lineTo(14, -75);
    ctx.stroke();
  } else if (index === 2) {
    ctx.beginPath();
    ctx.moveTo(0, -109);
    ctx.lineTo(0, -56);
    ctx.moveTo(0, -81);
    ctx.lineTo(-18, -96);
    ctx.moveTo(0, -72);
    ctx.lineTo(18, -88);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-5, -83, 20, -Math.PI / 2, Math.PI / 2);
    ctx.arc(7, -83, 18, Math.PI / 2, -Math.PI / 2, true);
    ctx.fill();
  }
  ctx.restore();
}

function drawDrop(ctx, x, y, petal) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = '#8bc8cf';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#c3e5e8';
  ctx.strokeStyle = '#5f8889';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -27);
  ctx.bezierCurveTo(20, -4, 25, 8, 25, 20);
  ctx.arc(0, 20, 25, 0, Math.PI, true);
  ctx.bezierCurveTo(-25, 8, -20, -4, 0, -27);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = petal.color;
  ctx.beginPath();
  ctx.arc(0, 12, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.ellipse(-8, -3, 5, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawControl(ctx, x, y, direction, text) {
  roundRect(ctx, x - 53, y - 19, 106, 38, 18, '#f8ecd3');
  ctx.strokeStyle = '#806952';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + direction * 17, y - 7);
  ctx.lineTo(x + direction * 29, y);
  ctx.lineTo(x + direction * 17, y + 7);
  ctx.stroke();
  label(ctx, text, x - direction * 13, y, 13, '#6d6558');
}
