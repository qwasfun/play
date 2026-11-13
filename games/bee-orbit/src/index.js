import { label, roundRect } from '@playground/game-sdk';
import { BEE_ORBIT, gateWindow, generateGates, LANES } from './course.js';

export { BEE_ORBIT, gateWindow, generateGates, LANES } from './course.js';

const switchKeys = new Set([' ', 'Enter', 'Space', 'Spacebar', 'ArrowUp', 'ArrowDown', 'w', 's']);
const validPoint = (point) =>
  Number.isFinite(point?.x) &&
  Number.isFinite(point?.y) &&
  point.x >= 0 &&
  point.x <= 600 &&
  point.y >= 0 &&
  point.y <= 480;

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const gates = generateGates(seed);
  let elapsed = 0;
  let score = 0;
  let progress = 0;
  let lives = BEE_ORBIT.lives;
  let lane = 0;
  let phase = 'approach';
  let gateLeft = gateWindow(0);
  let transition = 0;
  let gateAngle = gateLeft * BEE_ORBIT.angularSpeed;
  let finished = false;
  let won = false;
  let flash = 0;
  let message = `花粉落在${LANES[gates[0].lane].name}，抵达花桥前换好环`;

  function currentGate() {
    return gates[progress] ?? null;
  }

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score, elapsed, won, progress, lives });
  }

  function loadGate() {
    phase = 'approach';
    gateLeft = gateWindow(progress);
    gateAngle = elapsed * BEE_ORBIT.angularSpeed + gateLeft * BEE_ORBIT.angularSpeed;
    const gate = currentGate();
    message = `花粉落在${LANES[gate.lane].name}，露珠守着${LANES[1 - gate.lane].name}`;
  }

  function resolveGate() {
    const gate = currentGate();
    if (lane === gate.lane) {
      progress++;
      score = progress * BEE_ORBIT.score;
      flash = 1;
      sound('collect');
      if (progress === BEE_ORBIT.total) {
        message = '十二簇花粉都收进蜜囊啦！';
        sound('win');
        finish(true);
        return;
      }
      phase = 'bloom';
      transition = BEE_ORBIT.bloomTime;
      message = '采到啦，下一座花桥正在前方亮起';
      return;
    }
    lives--;
    flash = -1;
    sound('hit');
    message = `碰到一颗露珠，下一次记得换到${LANES[gate.lane].name}`;
    if (lives === 0) {
      finish(false);
      return;
    }
    phase = 'reset';
    transition = BEE_ORBIT.resetTime;
  }

  function switchLane() {
    if (finished || phase !== 'approach') return;
    lane = 1 - lane;
    sound('move');
    const target = currentGate().lane;
    message =
      lane === target
        ? `已飞到${LANES[lane].name}，稳稳跟住金色花粉`
        : `现在在${LANES[lane].name}，花粉还在${LANES[target].name}`;
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, BEE_ORBIT.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        const step = Math.min(remaining, 0.02);
        remaining -= step;
        elapsed += step;
        flash += (0 - flash) * Math.min(1, step * 7);
        if (phase === 'approach') {
          gateLeft -= step;
          if (gateLeft <= 0) resolveGate();
        } else {
          transition -= step;
          if (transition <= 0) loadGate();
        }
        if (!finished && elapsed >= BEE_ORBIT.limit) finish(false);
      }
    },
    input(type, payload = {}) {
      if (finished || phase !== 'approach') return;
      if (type === 'key-down' && !payload.repeat && switchKeys.has(payload.key)) switchLane();
      if (type === 'primary-down' && validPoint(payload)) switchLane();
    },
    getState() {
      const gate = currentGate();
      return {
        elapsed,
        score,
        progress,
        lives,
        lane,
        gate: gate ? { ...gate } : null,
        gateLeft,
        phase,
        finished,
        won,
        extra: `${progress} / ${BEE_ORBIT.total} · 机会 ${lives}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f3eadf';
      ctx.fillRect(0, 0, 600, 480);
      const garden = ctx.createLinearGradient(0, 64, 0, 436);
      garden.addColorStop(0, '#e8efdf');
      garden.addColorStop(1, '#b8d1bb');
      roundRect(ctx, 22, 68, 556, 362, 34, garden);
      label(ctx, '蜂环逐蜜', 98, 34, 23);
      label(ctx, `花粉 ${progress}/12 · 机会 ${lives}`, 484, 34, 16, '#56705d');

      const cx = 300;
      const cy = 245;
      drawGarden(ctx, cx, cy);
      const angle = elapsed * BEE_ORBIT.angularSpeed - Math.PI / 2;
      if (!finished && currentGate()) {
        const gate = currentGate();
        const targetAngle = gateAngle - Math.PI / 2;
        drawPollen(ctx, cx, cy, targetAngle, gate.lane, gate.petal);
        drawDew(ctx, cx, cy, targetAngle, 1 - gate.lane);
        drawBridge(ctx, cx, cy, targetAngle);
      }
      drawBee(ctx, cx, cy, angle, lane, flash);

      roundRect(ctx, 54, 394, 492, 34, 16, '#fff9e9');
      label(ctx, message, 300, 411, 14, flash < 0 ? '#a65c50' : '#566e5b');
      roundRect(ctx, 185, 440, 230, 28, 14, '#f5e3bd');
      label(ctx, '轻点 / 空格 / ↑↓  换环', 300, 454, 13, '#6f6558');
    },
    destroy() {
      finished = true;
    },
  };
}

function drawGarden(ctx, cx, cy) {
  ctx.fillStyle = '#7aa18c';
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 28, 211, 178, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (const lane of LANES) {
    ctx.strokeStyle = lane.color;
    ctx.lineWidth = 22;
    ctx.globalAlpha = 0.36;
    ctx.beginPath();
    ctx.arc(cx, cy, lane.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff8e4';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 11]);
    ctx.beginPath();
    ctx.arc(cx, cy, lane.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = '#f0c86e';
  ctx.strokeStyle = '#9d7447';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff5c9';
  for (let index = 0; index < 8; index++) {
    const angle = (index * Math.PI) / 4;
    ctx.beginPath();
    ctx.ellipse(
      cx + Math.cos(angle) * 62,
      cy + Math.sin(angle) * 62,
      16,
      29,
      angle,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  label(ctx, '内', cx, cy - 104, 12, '#87584d');
  label(ctx, '外', cx, cy - 157, 12, '#3f6d53');
}

function orbitPoint(cx, cy, angle, lane) {
  const radius = LANES[lane].radius;
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function drawBridge(ctx, cx, cy, angle) {
  const inner = orbitPoint(cx, cy, angle, 0);
  const outer = orbitPoint(cx, cy, angle, 1);
  ctx.strokeStyle = '#a77f55';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(inner.x, inner.y);
  ctx.lineTo(outer.x, outer.y);
  ctx.stroke();
  ctx.strokeStyle = '#f7e8c9';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawPollen(ctx, cx, cy, angle, lane, petal) {
  const { x, y } = orbitPoint(cx, cy, angle, lane);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.fillStyle = ['#d98578', '#e2b85b', '#9b88ae', '#efc875'][petal];
  for (let index = 0; index < 5; index++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, -17, 8, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowColor = '#f4d56e';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffe69a';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDew(ctx, cx, cy, angle, lane) {
  const { x, y } = orbitPoint(cx, cy, angle, lane);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.fillStyle = '#b9dfe4';
  ctx.strokeStyle = '#5f8889';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.bezierCurveTo(14, -1, 16, 7, 16, 14);
  ctx.arc(0, 14, 16, 0, Math.PI, true);
  ctx.bezierCurveTo(-16, 7, -14, -1, 0, -18);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBee(ctx, cx, cy, angle, lane, flash) {
  const { x, y } = orbitPoint(cx, cy, angle, lane);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.shadowColor = flash < 0 ? '#b85f58' : flash > 0 ? '#fff0a8' : '#65744f';
  ctx.shadowBlur = 10 + Math.abs(flash) * 12;
  ctx.fillStyle = '#f6e9cf';
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.ellipse(-14, -4, 12, 7, -0.5, 0, Math.PI * 2);
  ctx.ellipse(14, -4, 12, 7, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#efc45f';
  ctx.strokeStyle = '#6e5a3d';
  ctx.lineWidth = 3;
  roundRect(ctx, -13, -17, 26, 34, 12, '#efc45f');
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.lineTo(12, -4);
  ctx.moveTo(-12, 7);
  ctx.lineTo(12, 7);
  ctx.stroke();
  ctx.fillStyle = '#4f493b';
  ctx.beginPath();
  ctx.arc(-5, -10, 2, 0, Math.PI * 2);
  ctx.arc(5, -10, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
