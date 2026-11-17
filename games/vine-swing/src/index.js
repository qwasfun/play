import { label, roundRect } from '@playground/game-sdk';
import { generateCourse, phaseDistance, releaseWindow, swingPoint, VINE_SWING } from './course.js';

export {
  generateCourse,
  phaseDistance,
  releaseWindow,
  swingPoint,
  timeToPhase,
  VINE_SWING,
} from './course.js';

const releaseKeys = new Set([' ', 'space', 'enter', 'arrowup', 'w']);

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
  let score = 0;
  let progress = 0;
  let lives = VINE_SWING.lives;
  let phase = VINE_SWING.initialPhase;
  let mode = 'swing';
  let transition = 0;
  let finished = false;
  let won = false;
  let flightFrom = null;
  let lastError = 0;
  let flash = 0;
  let message = '跟着花藤轻轻摆动，等金色微光靠近中央';

  const currentTransfer = () => course.transfers[progress] ?? null;

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score, elapsed, won, progress, lives });
  }

  function release() {
    if (finished || mode !== 'swing') return;
    const transfer = currentTransfer();
    const error = phaseDistance(phase, transfer.releasePhase);
    lastError = error;
    if (error > releaseWindow(progress)) {
      lives--;
      flash = -1;
      sound('hit');
      message =
        error > 0.22
          ? '这次松手偏远啦，花瓣软垫会把你送回花藤'
          : '只差一点点，等微光更靠近中央再松手';
      if (lives === 0) {
        finish(false);
        return;
      }
      mode = 'recover';
      transition = VINE_SWING.resetTime;
      return;
    }

    flightFrom = swingPoint(transfer.anchor, phase);
    progress++;
    score = progress * VINE_SWING.score;
    flash = 1;
    sound('collect');
    if (progress === VINE_SWING.total) {
      message = '十朵花都稳稳接住啦，小种子正随风发着光！';
      sound('win');
      finish(true);
      return;
    }
    mode = 'flight';
    transition = VINE_SWING.flightTime;
    message = `第 ${progress} 次接力成功，下一朵花正在轻轻招手`;
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, VINE_SWING.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        if (mode === 'swing') {
          elapsed += remaining;
          phase = (phase + remaining / VINE_SWING.cycle) % 1;
          flash += (0 - flash) * Math.min(1, remaining * 7);
          remaining = 0;
        } else {
          const step = Math.min(remaining, transition);
          elapsed += step;
          remaining -= step;
          transition -= step;
          flash += (0 - flash) * Math.min(1, step * 7);
          if (transition <= 1e-9) {
            const completedMode = mode;
            phase = VINE_SWING.initialPhase;
            mode = 'swing';
            message =
              completedMode === 'recover'
                ? '重新抓稳花藤啦，慢慢等金色微光靠近中央'
                : '抓住新花藤啦，看清下一朵花在左边还是右边';
          }
        }
        if (!finished && elapsed >= VINE_SWING.limit - 1e-9) finish(false);
      }
    },
    input(type, payload = {}) {
      if (finished || mode !== 'swing') return;
      if (type === 'key-down' && !payload.repeat) {
        if (releaseKeys.has(String(payload.key).toLowerCase())) release();
      }
      if (type === 'primary-down' && validPoint(payload)) release();
    },
    getState() {
      const transfer = currentTransfer();
      return {
        elapsed,
        score,
        progress,
        lives,
        phase,
        mode,
        transition,
        releasePhase: transfer?.releasePhase ?? null,
        releaseWindow: transfer ? releaseWindow(progress) : 0,
        lastError,
        finished,
        won,
        extra: `${progress} / ${VINE_SWING.total} · 花瓣 ${lives}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f3ecdf';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '藤蔓轻荡', 102, 34, 23);
      label(ctx, `接力 ${progress}/10 · 花瓣 ${lives}`, 474, 34, 16, '#59705d');

      const sky = ctx.createLinearGradient(0, 58, 0, 420);
      sky.addColorStop(0, '#dcead9');
      sky.addColorStop(1, '#afcdb4');
      roundRect(ctx, 24, 60, 552, 366, 38, sky);
      drawHills(ctx);

      const currentIndex = Math.min(progress, VINE_SWING.total);
      for (let offset = -1; offset <= 2; offset++) {
        const index = currentIndex + offset;
        if (index >= 0 && index < course.anchors.length)
          drawAnchor(ctx, course.anchors[index], index === currentIndex, index);
      }

      const transfer = currentTransfer();
      let player;
      if (mode === 'flight' && transfer && flightFrom) {
        const amount = 1 - transition / VINE_SWING.flightTime;
        const target = swingPoint(course.anchors[progress], VINE_SWING.initialPhase);
        player = {
          x: flightFrom.x + (target.x - flightFrom.x) * amount,
          y: flightFrom.y + (target.y - flightFrom.y) * amount - Math.sin(amount * Math.PI) * 70,
        };
        drawTrail(ctx, flightFrom, player);
      } else {
        const anchor = course.anchors[Math.min(progress, VINE_SWING.total)];
        player = swingPoint(anchor, phase);
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(player.x, player.y);
        ctx.strokeStyle = flash < 0 ? '#b56a60' : '#57795d';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      drawSeed(ctx, player.x, player.y, flash);

      if (transfer && mode === 'swing') {
        const good = phaseDistance(phase, transfer.releasePhase) <= releaseWindow(progress);
        const arrow = transfer.direction > 0 ? '→' : '←';
        roundRect(ctx, 235, 75, 130, 34, 17, good ? '#f3d686' : '#fff8df');
        label(ctx, good ? `${arrow} 现在松手` : `${arrow} 等待微光`, 300, 92, 14, '#65705a');
      }

      roundRect(ctx, 55, 392, 490, 34, 17, '#fff9e8');
      label(ctx, message, 300, 410, 13, flash < 0 ? '#a85f55' : '#586d5b');
      roundRect(ctx, 170, 440, 260, 28, 14, '#f4dfb8');
      label(ctx, '轻点画布 · 空格 / 回车 / ↑ / W', 300, 454, 13, '#6e6558');
    },
    destroy() {
      finished = true;
    },
  };
}

function drawHills(ctx) {
  ctx.fillStyle = '#9ab89d';
  ctx.beginPath();
  ctx.moveTo(24, 330);
  ctx.quadraticCurveTo(150, 268, 276, 323);
  ctx.quadraticCurveTo(430, 255, 576, 304);
  ctx.lineTo(576, 426);
  ctx.lineTo(24, 426);
  ctx.closePath();
  ctx.fill();
}

function drawAnchor(ctx, anchor, active, index) {
  ctx.strokeStyle = active ? '#668b69' : '#83a785';
  ctx.lineWidth = active ? 8 : 6;
  ctx.beginPath();
  ctx.moveTo(anchor.x, 60);
  ctx.quadraticCurveTo(anchor.x + (index % 2 ? 18 : -18), anchor.y - 24, anchor.x, anchor.y);
  ctx.stroke();
  ctx.save();
  ctx.translate(anchor.x, anchor.y - 3);
  ctx.rotate(anchor.flower * 0.22);
  ctx.fillStyle = active ? '#d98578' : '#cf9b82';
  for (let petal = 0; petal < 6; petal++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.ellipse(0, -18, 8, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fillStyle = active ? '#ffe092' : '#ead6a2';
  ctx.fill();
  ctx.restore();
}

function drawSeed(ctx, x, y, flash) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = flash < 0 ? '#d58c78' : '#e9b86e';
  ctx.strokeStyle = '#58725d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.bezierCurveTo(18, -7, 21, 8, 17, 18);
  ctx.bezierCurveTo(10, 31, -10, 31, -17, 18);
  ctx.bezierCurveTo(-21, 8, -18, -7, 0, -22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff5cf';
  ctx.beginPath();
  ctx.arc(-6, 5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTrail(ctx, from, player) {
  ctx.strokeStyle = '#fff0a8';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.setLineDash([7, 11]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(player.x, player.y);
  ctx.stroke();
  ctx.setLineDash([]);
}
