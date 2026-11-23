import { label, roundRect } from '@playground/game-sdk';
import { generateCourse, LANE_Y, MOON_MOTH } from './course.js';

export { generateCourse, LANE_Y, MOON_MOTH } from './course.js';

const upKeys = new Set(['arrowup', 'w']);
const downKeys = new Set(['arrowdown', 's']);

function numberLane(key) {
  const match = /^(?:digit|numpad)?([123])$/.exec(key);
  return match ? Number(match[1]) - 1 : -1;
}

export function validPoint(point) {
  return (
    Number.isFinite(point?.x) &&
    Number.isFinite(point?.y) &&
    point.x >= 24 &&
    point.x <= 576 &&
    point.y >= 112 &&
    point.y <= 399
  );
}

export function laneFromPoint(point) {
  if (!validPoint(point)) return -1;
  if (point.y < 211) return 0;
  if (point.y < 305) return 1;
  return 2;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const course = generateCourse(seed);
  let elapsed = 0;
  let score = 0;
  let progress = 0;
  let gates = 0;
  let lives = MOON_MOTH.lives;
  let lane = MOON_MOTH.startLane;
  let finished = false;
  let won = false;
  let flash = 0;
  let message = '看清前方的暖黄花灯，提前换到同一条花径';

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    if (success) message = '十五盏暖灯都追上啦，月蛾停在花心轻轻歇翅！';
    else if (lives === 0) message = '护叶用完啦，等薄雾散一散再出发吧';
    else if (elapsed >= MOON_MOTH.limit - 0.02) message = '月亮要回云后啦，这次追光先到这里';
    else message = `追上 ${progress} 盏暖灯，下次会飞得更稳`;
    onFinish({ score, elapsed, won, progress, gates, lives });
  }

  function settle(gate) {
    gates++;
    if (lane === gate.lane) {
      progress++;
      score = progress * MOON_MOTH.score;
      flash = 1;
      message = `追上第 ${progress} 盏暖灯，翅尖亮起来啦`;
      sound('collect');
    } else {
      lives--;
      flash = -1;
      message = `薄雾擦过翅尖，暖灯在第 ${gate.lane + 1} 条花径`;
      sound('hit');
    }
    if (lives === 0) finish(false);
    else if (gates === MOON_MOTH.total) finish(progress === MOON_MOTH.total);
  }

  function setLane(next) {
    if (finished || next < 0 || next > 2 || next === lane) return;
    lane = next;
    message = `月蛾飞到第 ${lane + 1} 条花径，继续看前方亮灯`;
    sound('move');
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      const target = Math.min(MOON_MOTH.limit, elapsed + dt);
      while (!finished && gates < course.gates.length && course.gates[gates].at <= target + 1e-9) {
        const gate = course.gates[gates];
        elapsed = gate.at;
        settle(gate);
      }
      if (!finished) {
        const step = target - elapsed;
        elapsed = target;
        flash += (0 - flash) * Math.min(1, step * 5);
      }
      if (!finished && elapsed >= MOON_MOTH.limit - 1e-9) finish(false);
    },
    input(type, payload = {}) {
      if (finished) return;
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (upKeys.has(key)) setLane(Math.max(0, lane - 1));
        else if (downKeys.has(key)) setLane(Math.min(2, lane + 1));
        else {
          const target = numberLane(key);
          if (target >= 0) setLane(target);
        }
      }
      if (type === 'primary-down') setLane(laneFromPoint(payload));
    },
    getState() {
      return {
        elapsed,
        score,
        progress,
        gates,
        lives,
        lane,
        finished,
        won,
        nextLane: course.gates[Math.min(gates, course.gates.length - 1)].lane,
        extra: `${gates} / ${MOON_MOTH.total} · 护叶 ${lives}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f3ece8';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '月蛾追光', 100, 34, 23);
      label(ctx, `暖灯 ${progress}/15 · 护叶 ${lives}`, 466, 34, 16, '#5c6a61');

      const sky = ctx.createLinearGradient(0, 58, 0, 421);
      sky.addColorStop(0, '#e7e3e7');
      sky.addColorStop(1, '#bfd3c2');
      roundRect(ctx, 24, 60, 552, 364, 38, sky);
      drawGarden(ctx);

      for (let index = gates; index < Math.min(course.gates.length, gates + 2); index++) {
        const gate = course.gates[index];
        const remaining = gate.at - elapsed;
        const x = 118 + (remaining / MOON_MOTH.travelTime) * 482;
        if (x < 92 || x > 636) continue;
        for (let target = 0; target < 3; target++) {
          if (target === gate.lane) drawLight(ctx, x, LANE_Y[target], gate.flower);
          else drawMist(ctx, x, LANE_Y[target]);
        }
      }

      drawMoth(ctx, 118, LANE_Y[lane], flash);
      roundRect(ctx, 54, 386, 492, 31, 15, '#fff9e9');
      label(ctx, message, 300, 402, 13, flash < 0 ? '#a75d58' : '#59685e');
      roundRect(ctx, 125, 438, 350, 28, 14, '#efddbd');
      label(ctx, '点花径换轨 · ↑ ↓ / W S · 1 2 3 直达', 300, 452, 13, '#6e635b');
    },
    destroy() {
      finished = true;
    },
  };
}

function drawGarden(ctx) {
  ctx.strokeStyle = 'rgba(255,250,224,.78)';
  ctx.lineWidth = 58;
  for (const y of LANE_Y) {
    ctx.beginPath();
    ctx.moveTo(46, y);
    ctx.bezierCurveTo(204, y - 18, 392, y + 18, 554, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#8fab91';
  for (let x = 58; x < 560; x += 54) {
    ctx.beginPath();
    ctx.arc(x, 405 + Math.sin(x) * 4, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLight(ctx, x, y, flower) {
  const petals = ['#f4c96c', '#efbd72', '#f2d27a', '#eeb879'];
  ctx.fillStyle = 'rgba(248,215,105,.2)';
  ctx.beginPath();
  ctx.arc(x, y, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = petals[flower];
  ctx.strokeStyle = '#83705f';
  ctx.lineWidth = 3;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
    ctx.beginPath();
    ctx.ellipse(Math.cos(angle) * 15, Math.sin(angle) * 15, 10, 17, angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#fff1a8';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMist(ctx, x, y) {
  ctx.fillStyle = 'rgba(139,151,161,.58)';
  for (const [dx, dy, radius] of [
    [-16, 3, 17],
    [2, -7, 22],
    [21, 5, 16],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMoth(ctx, x, y, flash) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = flash < 0 ? 'rgba(185,89,82,.2)' : 'rgba(248,217,112,.25)';
  ctx.beginPath();
  ctx.arc(0, 0, 37, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f1c66f';
  ctx.strokeStyle = '#625c68';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.bezierCurveTo(-20, -29, -48, -27, -52, 2);
  ctx.bezierCurveTo(-31, 7, -24, 22, -16, 30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#edb47a';
  ctx.beginPath();
  ctx.moveTo(3, 0);
  ctx.bezierCurveTo(20, -29, 48, -27, 52, 2);
  ctx.bezierCurveTo(31, 7, 24, 22, 16, 30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#716475';
  ctx.beginPath();
  ctx.ellipse(0, 5, 7, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
