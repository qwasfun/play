import { label, roundRect } from '@playground/game-sdk';
import { clampGap, generateCourse, isAligned, TWIN_FIREFLIES } from './course.js';

export { clampGap, generateCourse, isAligned, TWIN_FIREFLIES } from './course.js';

const narrowKeys = new Set(['arrowleft', 'a']);
const widenKeys = new Set(['arrowright', 'd']);

export function validPoint(point) {
  return (
    Number.isFinite(point?.x) &&
    Number.isFinite(point?.y) &&
    point.x >= 0 &&
    point.x <= 600 &&
    point.y >= 0 &&
    point.y <= 480
  );
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const course = generateCourse(seed);
  let elapsed = 0;
  let gap = TWIN_FIREFLIES.startGap;
  let score = 0;
  let progress = 0;
  let gates = 0;
  let lives = TWIN_FIREFLIES.lives;
  let finished = false;
  let won = false;
  let flash = 0;
  let lastDirection = 0;
  let message = '看清最前面的双花门，轻点左右半边调整间距';

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score, elapsed, won, progress, gates, lives });
  }

  function move(direction) {
    if (finished) return;
    const next = clampGap(gap + direction * TWIN_FIREFLIES.step);
    lastDirection = direction;
    if (next === gap) {
      message = direction < 0 ? '已经收得最拢啦，等花门靠近' : '已经展开到最宽啦，等花门靠近';
      return;
    }
    gap = next;
    sound('move');
    message = direction < 0 ? '双萤收拢一档，继续看前方花门' : '双萤展开一档，继续看前方花门';
  }

  function crossGate(gate) {
    gates++;
    if (isAligned(gap, gate.gap)) {
      progress++;
      score = progress * TWIN_FIREFLIES.score;
      flash = 1;
      message = `第 ${gates} 道花门轻轻穿过，下一道正在靠近`;
      sound('collect');
    } else {
      lives--;
      flash = -1;
      message =
        gap < gate.gap
          ? '队形收得太拢啦，下一道可以再展开些'
          : '队形展开太宽啦，下一道可以再收拢些';
      sound('hit');
    }
    if (lives === 0) finish(false);
    else if (gates === TWIN_FIREFLIES.total) {
      if (progress === TWIN_FIREFLIES.total) {
        message = '十二道双花门全都穿过啦，花园亮成了小星河！';
        sound('win');
        finish(true);
      } else finish(false);
    }
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      const target = Math.min(TWIN_FIREFLIES.limit, elapsed + dt);
      while (!finished && gates < course.gates.length && course.gates[gates].at <= target + 1e-9) {
        elapsed = course.gates[gates].at;
        crossGate(course.gates[gates]);
      }
      if (!finished) {
        elapsed = target;
        flash += (0 - flash) * Math.min(1, dt * 6);
        if (elapsed >= TWIN_FIREFLIES.limit - 1e-9) finish(false);
      }
    },
    input(type, payload = {}) {
      if (finished) return;
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (narrowKeys.has(key)) move(-1);
        else if (widenKeys.has(key)) move(1);
      }
      if (type === 'primary-down' && validPoint(payload)) move(payload.x < 300 ? -1 : 1);
    },
    getState() {
      return {
        elapsed,
        gap,
        score,
        progress,
        gates,
        lives,
        finished,
        won,
        nextGap: course.gates[gates]?.gap ?? null,
        lastDirection,
        extra: `${gates} / ${TWIN_FIREFLIES.total} · 护叶 ${lives}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f3ecdf';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '双萤穿花', 104, 34, 23);
      label(ctx, `花门 ${gates}/12 · 护叶 ${lives}`, 476, 34, 16, '#59705d');

      const sky = ctx.createLinearGradient(0, 58, 0, 425);
      sky.addColorStop(0, '#dcebdc');
      sky.addColorStop(1, '#aac7ad');
      roundRect(ctx, 24, 60, 552, 368, 38, sky);
      drawGarden(ctx);

      for (let index = gates; index < Math.min(course.gates.length, gates + 4); index++) {
        const gate = course.gates[index];
        const y = TWIN_FIREFLIES.playerY - (gate.at - elapsed) * TWIN_FIREFLIES.gateSpeed;
        if (y > 74 && y < 418) drawGate(ctx, gate, y, index === gates);
      }

      const left = 300 - gap / 2;
      const right = 300 + gap / 2;
      drawFirefly(ctx, left, TWIN_FIREFLIES.playerY, '#d99a62', flash);
      drawFirefly(ctx, right, TWIN_FIREFLIES.playerY, '#c78372', flash);
      ctx.strokeStyle = '#f5dc86';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(left + 18, TWIN_FIREFLIES.playerY + 26);
      ctx.lineTo(right - 18, TWIN_FIREFLIES.playerY + 26);
      ctx.stroke();

      roundRect(ctx, 56, 390, 488, 34, 17, '#fff9e8');
      label(ctx, message, 300, 408, 13, flash < 0 ? '#a85f55' : '#586d5b');
      roundRect(ctx, 162, 440, 276, 28, 14, '#f4dfb8');
      label(ctx, '点左边收拢 · 点右边展开 · ← → / A D', 300, 454, 13, '#6e6558');
    },
    destroy() {
      finished = true;
    },
  };
}

function drawGarden(ctx) {
  ctx.fillStyle = '#95b49a';
  ctx.beginPath();
  ctx.moveTo(24, 322);
  ctx.quadraticCurveTo(142, 274, 265, 319);
  ctx.quadraticCurveTo(424, 262, 576, 309);
  ctx.lineTo(576, 428);
  ctx.lineTo(24, 428);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f8f1c9';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 11]);
  ctx.beginPath();
  ctx.moveTo(300, 70);
  ctx.lineTo(300, 374);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawGate(ctx, gate, y, active) {
  const color = ['#d88982', '#cb8ea0', '#dfaa70', '#9d91b1'][gate.flower];
  const left = 300 - gate.gap / 2;
  const right = 300 + gate.gap / 2;
  ctx.strokeStyle = active ? '#fff2aa' : '#e7ddae';
  ctx.lineWidth = active ? 5 : 3;
  ctx.beginPath();
  ctx.moveTo(left, y + 23);
  ctx.lineTo(left, y + 49);
  ctx.moveTo(right, y + 23);
  ctx.lineTo(right, y + 49);
  ctx.stroke();
  drawFlower(ctx, left, y, color, active);
  drawFlower(ctx, right, y, color, active);
}

function drawFlower(ctx, x, y, color, active) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  for (let petal = 0; petal < 6; petal++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.ellipse(0, -17, active ? 9 : 7, active ? 15 : 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffe19a';
  ctx.beginPath();
  ctx.arc(0, 0, active ? 10 : 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFirefly(ctx, x, y, color, flash) {
  const glow = flash > 0 ? 34 : 27;
  ctx.fillStyle = flash < 0 ? 'rgba(194,91,82,.28)' : 'rgba(255,239,132,.3)';
  ctx.beginPath();
  ctx.arc(x, y, glow, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7f0d8';
  ctx.beginPath();
  ctx.ellipse(x - 11, y - 3, 11, 7, -0.28, 0, Math.PI * 2);
  ctx.ellipse(x + 11, y - 3, 11, 7, 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#587062';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, 11, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffe66f';
  ctx.beginPath();
  ctx.arc(x, y + 10, 5, 0, Math.PI * 2);
  ctx.fill();
}
