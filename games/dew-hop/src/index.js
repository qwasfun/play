import { label, roundRect } from '@playground/game-sdk';
import { DEW_HOP, DIRECTIONS, generateTargets, responseWindow } from './course.js';

export { DEW_HOP, DIRECTIONS, generateTargets, responseWindow } from './course.js';

const keyDirections = new Map([
  ['arrowup', 0],
  ['w', 0],
  ['arrowright', 1],
  ['d', 1],
  ['arrowdown', 2],
  ['s', 2],
  ['arrowleft', 3],
  ['a', 3],
]);

export const padPoint = (direction) => ({
  x: DIRECTIONS[direction].x,
  y: DIRECTIONS[direction].y,
});

export function directionAt(point) {
  if (
    !Number.isFinite(point?.x) ||
    !Number.isFinite(point?.y) ||
    point.x < 0 ||
    point.x > 600 ||
    point.y < 0 ||
    point.y > 480
  )
    return -1;
  let found = -1;
  let distance = Infinity;
  DIRECTIONS.forEach((direction, index) => {
    const next = Math.hypot(point.x - direction.x, point.y - direction.y);
    if (next <= 58 && next < distance) {
      found = index;
      distance = next;
    }
  });
  return found;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const targets = generateTargets(seed);
  let elapsed = 0;
  let score = 0;
  let progress = 0;
  let lives = DEW_HOP.lives;
  let phase = 'reveal';
  let transition = DEW_HOP.revealTime;
  let responseLeft = 0;
  let lastDirection = -1;
  let finished = false;
  let won = false;
  let flash = 0;
  let message = '先看四方荷叶，花蕊马上就要亮起来了';

  const currentTarget = () => targets[progress] ?? null;

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score, elapsed, won, progress, lives });
  }

  function beginReveal() {
    phase = 'reveal';
    transition = DEW_HOP.revealTime;
    responseLeft = 0;
    message = '涟漪轻轻荡开，下一片花蕊就要亮起';
  }

  function loseChance(timeout = false) {
    lives--;
    flash = -1;
    sound('hit');
    message = timeout ? '涟漪收拢啦，下一次看清花蕊就出发' : '跳错荷叶啦，下一次跟着金色花蕊走';
    if (lives === 0) {
      finish(false);
      return;
    }
    phase = 'reset';
    transition = DEW_HOP.resetTime;
    responseLeft = 0;
  }

  function choose(direction) {
    if (finished || phase !== 'wait' || direction < 0 || direction >= DIRECTIONS.length) return;
    const target = currentTarget();
    if (direction !== target.direction) {
      loseChance(false);
      return;
    }
    lastDirection = direction;
    progress++;
    score = progress * DEW_HOP.score;
    flash = 1;
    sound('collect');
    if (progress === DEW_HOP.total) {
      message = '十二片荷叶都稳稳跳过，露珠正闪着亮晶晶的光！';
      sound('win');
      finish(true);
      return;
    }
    phase = 'hop';
    transition = DEW_HOP.hopTime;
    responseLeft = 0;
    message = `跳到${DIRECTIONS[direction].name}啦，下一片荷叶正在泛光`;
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, DEW_HOP.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        if (phase === 'wait') {
          const step = Math.min(remaining, responseLeft);
          elapsed += step;
          remaining -= step;
          responseLeft -= step;
          flash += (0 - flash) * Math.min(1, step * 7);
          if (responseLeft <= 1e-9) loseChance(true);
        } else {
          const step = Math.min(remaining, transition);
          elapsed += step;
          remaining -= step;
          transition -= step;
          flash += (0 - flash) * Math.min(1, step * 7);
          if (transition <= 1e-9) {
            if (phase === 'reveal') {
              phase = 'wait';
              responseLeft = responseWindow(progress);
              const target = currentTarget();
              message = `${DIRECTIONS[target.direction].name}荷叶亮了，向${DIRECTIONS[target.direction].arrow}跳！`;
            } else beginReveal();
          }
        }
        if (!finished && elapsed >= DEW_HOP.limit - 1e-9) finish(false);
      }
    },
    input(type, payload = {}) {
      if (finished || phase !== 'wait') return;
      if (type === 'key-down' && !payload.repeat) {
        const direction = keyDirections.get(String(payload.key).toLowerCase());
        if (direction !== undefined) choose(direction);
      }
      if (type === 'primary-down') choose(directionAt(payload));
    },
    getState() {
      const target = currentTarget();
      return {
        elapsed,
        score,
        progress,
        lives,
        phase,
        transition,
        responseLeft,
        target: target ? { ...target } : null,
        lastDirection,
        finished,
        won,
        extra: `${progress} / ${DEW_HOP.total} · 机会 ${lives}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f3ecdf';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '露珠跳荷', 98, 34, 23);
      label(ctx, `跳跃 ${progress}/12 · 机会 ${lives}`, 482, 34, 16, '#56705d');

      const pond = ctx.createLinearGradient(0, 66, 0, 430);
      pond.addColorStop(0, '#d6ebe5');
      pond.addColorStop(1, '#9bc9c8');
      roundRect(ctx, 24, 62, 552, 368, 38, pond);
      drawRipples(ctx, phase, transition, responseLeft, progress);

      const active = phase === 'wait' ? currentTarget()?.direction : -1;
      DIRECTIONS.forEach((direction, index) =>
        drawPad(ctx, direction, index === active, currentTarget()?.leaf ?? 0, flash),
      );

      let dewX = 300;
      let dewY = 246;
      if (phase === 'hop' && lastDirection >= 0) {
        const amount = 1 - transition / DEW_HOP.hopTime;
        const target = DIRECTIONS[lastDirection];
        dewX += (target.x - dewX) * amount;
        dewY += (target.y - dewY) * amount - Math.sin(amount * Math.PI) * 34;
      }
      drawDew(ctx, dewX, dewY, flash);

      roundRect(ctx, 53, 393, 494, 35, 17, '#fff9e9');
      label(ctx, message, 300, 411, 14, flash < 0 ? '#a65c50' : '#566e5b');
      roundRect(ctx, 159, 440, 282, 28, 14, '#f5e3bd');
      label(ctx, '轻点目标荷叶 · 方向键 / WASD', 300, 454, 13, '#6f6558');
    },
    destroy() {
      finished = true;
    },
  };
}

function drawRipples(ctx, phase, transition, responseLeft, progress) {
  const ratio =
    phase === 'wait'
      ? responseLeft / responseWindow(progress)
      : phase === 'reveal'
        ? 1 - transition / DEW_HOP.revealTime
        : 0;
  ctx.strokeStyle = '#fff9df';
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.28 + ratio * 0.34;
  for (let ring = 0; ring < 3; ring++) {
    ctx.beginPath();
    ctx.arc(300, 246, 54 + ring * 37 + ratio * 18, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawPad(ctx, direction, active, leaf, flash) {
  ctx.save();
  ctx.translate(direction.x, direction.y);
  ctx.rotate((leaf - 1.5) * 0.14);
  ctx.fillStyle = active ? '#8eb66f' : direction.color;
  ctx.strokeStyle = active ? '#fff1a8' : '#eef0d3';
  ctx.lineWidth = active ? 7 : 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 56, 39, 0, 0, Math.PI * 2);
  ctx.moveTo(0, 0);
  ctx.lineTo(38, -27);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  label(ctx, direction.arrow, direction.x, direction.y + 2, 23, '#f9f4dc');
  if (active) {
    ctx.save();
    ctx.translate(direction.x, direction.y - 4);
    ctx.fillStyle = flash < 0 ? '#cf756a' : '#d98578';
    for (let index = 0; index < 5; index++) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.ellipse(0, -25, 8, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe39a';
    ctx.fill();
    ctx.restore();
    label(ctx, '跳这里', direction.x, direction.y + 54, 12, '#5d6c55');
  }
}

function drawDew(ctx, x, y, flash) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = flash < 0 ? '#c56c61' : flash > 0 ? '#fff2a7' : '#5d8788';
  ctx.shadowBlur = 10 + Math.abs(flash) * 13;
  ctx.fillStyle = '#b9e3e7';
  ctx.strokeStyle = '#527b7d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -27);
  ctx.bezierCurveTo(20, -5, 23, 8, 23, 20);
  ctx.arc(0, 20, 23, 0, Math.PI, true);
  ctx.bezierCurveTo(-23, 8, -20, -5, 0, -27);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.arc(-7, 8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
