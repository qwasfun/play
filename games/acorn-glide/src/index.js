import { label, roundRect } from '@playground/game-sdk';
import { ACORN_GLIDE, generateCourse, speedFor, START, targetPoint } from './course.js';

export { ACORN_GLIDE, generateCourse, pullPoint, speedFor, START, targetPoint } from './course.js';

const validPoint = (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const radians = (degrees) => (degrees * Math.PI) / 180;

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const course = generateCourse(seed);
  let round = 0;
  let shots = 0;
  let rings = 0;
  let bullseyes = 0;
  let score = 0;
  let elapsed = 0;
  let phase = 'aim';
  let phaseLeft = 0;
  let angle = 0;
  let power = 0.75;
  let pressed = false;
  let dragPoint = null;
  let position = { ...START };
  let velocity = { x: 0, y: 0 };
  let flightLeft = 0;
  let finished = false;
  let won = false;
  let lastAward = 0;
  let message = '向后拖动松果，瞄准远处的花环';

  const target = () => course[Math.min(round, course.length - 1)];

  function finish() {
    if (finished) return;
    finished = true;
    won = shots === ACORN_GLIDE.shots && bullseyes === ACORN_GLIDE.shots;
    message = won
      ? '六枚松果都稳稳停在花心，晨露亮起一圈金光！'
      : '叶片滑道安静下来啦，下次再试试更轻巧的力度';
    onFinish({ score, elapsed, won, shots, rings, bullseyes });
  }

  function setAimFromPoint(point) {
    if (!validPoint(point)) return 0;
    const dx = START.x - point.x;
    const dy = START.y - point.y;
    const pull = Math.hypot(dx, dy);
    if (pull < 1) return pull;
    angle = clamp((Math.atan2(dx, -dy) * 180) / Math.PI, -20, 20);
    const nextSpeed = clamp(
      pull * ACORN_GLIDE.launchScale,
      ACORN_GLIDE.minSpeed + ACORN_GLIDE.minPower * (ACORN_GLIDE.maxSpeed - ACORN_GLIDE.minSpeed),
      ACORN_GLIDE.maxSpeed,
    );
    power = clamp(
      (nextSpeed - ACORN_GLIDE.minSpeed) / (ACORN_GLIDE.maxSpeed - ACORN_GLIDE.minSpeed),
      ACORN_GLIDE.minPower,
      ACORN_GLIDE.maxPower,
    );
    return pull;
  }

  function launch() {
    if (finished || phase !== 'aim') return;
    const direction = radians(angle);
    const speed = speedFor(power);
    velocity = { x: Math.sin(direction) * speed, y: -Math.cos(direction) * speed };
    position = { ...START };
    flightLeft = Math.log(speed / ACORN_GLIDE.stopSpeed) / ACORN_GLIDE.friction;
    phase = 'flight';
    pressed = false;
    dragPoint = null;
    message = '松果沿着露叶滑出去啦……';
    sound('tap');
  }

  function settle() {
    const center = targetPoint(target());
    const distance = Math.hypot(position.x - center.x, position.y - center.y);
    shots++;
    if (distance <= 24) {
      bullseyes++;
      rings++;
      lastAward = ACORN_GLIDE.bullScore;
      score += lastAward;
      message = '正中花心，金色花粉轻轻亮起来啦！';
      sound('win');
    } else if (distance <= 52) {
      rings++;
      lastAward = ACORN_GLIDE.ringScore;
      score += lastAward;
      message = '滑进花环啦，再靠近花心一点点';
      sound('win');
    } else {
      lastAward = 0;
      message = '松果停在花环旁边，下一枚再调一调力度';
      sound('hit');
    }
    if (shots === ACORN_GLIDE.shots) {
      finish();
      return;
    }
    phase = 'rest';
    phaseLeft = ACORN_GLIDE.restDelay;
  }

  function nextShot() {
    round++;
    phase = 'aim';
    phaseLeft = 0;
    angle = 0;
    power = 0.75;
    position = { ...START };
    velocity = { x: 0, y: 0 };
    lastAward = 0;
    message = `第 ${round + 1} 条叶片滑道摆好啦，重新瞄准花环`;
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, ACORN_GLIDE.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        if (phase === 'aim') {
          elapsed += remaining;
          break;
        }
        if (phase === 'flight') {
          const step = Math.min(remaining, flightLeft);
          const decay = Math.exp(-ACORN_GLIDE.friction * step);
          position.x += (velocity.x * (1 - decay)) / ACORN_GLIDE.friction;
          position.y += (velocity.y * (1 - decay)) / ACORN_GLIDE.friction;
          velocity.x *= decay;
          velocity.y *= decay;
          flightLeft -= step;
          elapsed += step;
          remaining -= step;
          if (flightLeft <= 1e-9) settle();
          continue;
        }
        const step = Math.min(remaining, phaseLeft);
        phaseLeft -= step;
        elapsed += step;
        remaining -= step;
        if (phaseLeft <= 1e-9) nextShot();
      }
      if (!finished && elapsed >= ACORN_GLIDE.limit - 1e-9) finish();
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = false;
        dragPoint = null;
        return;
      }
      if (finished || phase !== 'aim') return;
      if (type === 'primary-down' && validPoint(payload)) {
        pressed = Math.hypot(payload.x - START.x, payload.y - START.y) <= 38;
        dragPoint = pressed ? { x: payload.x, y: payload.y } : null;
      }
      if (type === 'primary-move' && pressed && validPoint(payload)) {
        dragPoint = { x: payload.x, y: payload.y };
        setAimFromPoint(payload);
      }
      if (type === 'primary-up') {
        if (pressed && validPoint(payload)) {
          dragPoint = { x: payload.x, y: payload.y };
          const pull = setAimFromPoint(payload);
          if (pull >= 38) launch();
          else message = '再向后多拉一点，松果才会滑出去';
        }
        pressed = false;
        dragPoint = null;
      }
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (key === 'arrowleft' || key === 'a')
          angle = clamp(angle - ACORN_GLIDE.angleStep, -20, 20);
        if (key === 'arrowright' || key === 'd')
          angle = clamp(angle + ACORN_GLIDE.angleStep, -20, 20);
        if (key === 'arrowup' || key === 'w')
          power = clamp(
            Number((power + ACORN_GLIDE.powerStep).toFixed(2)),
            ACORN_GLIDE.minPower,
            ACORN_GLIDE.maxPower,
          );
        if (key === 'arrowdown' || key === 's')
          power = clamp(
            Number((power - ACORN_GLIDE.powerStep).toFixed(2)),
            ACORN_GLIDE.minPower,
            ACORN_GLIDE.maxPower,
          );
        if (key === ' ' || key === 'space' || key === 'spacebar' || key === 'enter') launch();
      }
    },
    getState() {
      return {
        course: course.map((item) => ({ ...item })),
        round,
        shots,
        rings,
        bullseyes,
        score,
        elapsed,
        phase,
        angle,
        power,
        position: { ...position },
        target: { ...target() },
        lastAward,
        finished,
        won,
        extra: `${shots} / ${ACORN_GLIDE.shots} 枚 · 花心 ${bullseyes}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f4eadb';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '松果滑盘', 112, 29, 25);
      label(
        ctx,
        `${score} 分 · 第 ${Math.min(round + 1, ACORN_GLIDE.shots)} 枚`,
        477,
        29,
        15,
        '#6c655b',
      );
      roundRect(ctx, 68, 52, 464, 361, 70, '#aac498', '#769671');
      roundRect(ctx, 82, 64, 436, 337, 58, '#dfe7bd', '#91aa7f');
      ctx.strokeStyle = 'rgba(255,255,239,.75)';
      ctx.lineWidth = 4;
      ctx.setLineDash([4, 14]);
      ctx.beginPath();
      ctx.moveTo(START.x, START.y - 18);
      const guide = targetPoint({ angle, power });
      ctx.lineTo(guide.x, guide.y);
      ctx.stroke();
      ctx.setLineDash([]);
      drawTarget(ctx, targetPoint(target()));
      if (phase === 'aim') drawAim(ctx);
      drawAcorn(ctx, phase === 'aim' ? START : position);
      roundRect(ctx, 53, 425, 494, 29, 15, '#fff9e9');
      label(ctx, message, 300, 440, 12, '#655e55');
      label(ctx, '向后拖动松果 · 方向键调方向与力度 · 空格发射', 300, 469, 11, '#756e65');
    },
    destroy() {
      finished = true;
      pressed = false;
      dragPoint = null;
    },
  };

  function drawAim(ctx) {
    const direction = radians(angle);
    const pull = speedFor(power) / ACORN_GLIDE.launchScale;
    const end = dragPoint || {
      x: START.x - Math.sin(direction) * pull,
      y: START.y + Math.cos(direction) * pull,
    };
    ctx.strokeStyle = '#bd8066';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(START.x - 13, START.y + 3);
    ctx.lineTo(end.x, end.y);
    ctx.lineTo(START.x + 13, START.y + 3);
    ctx.stroke();
    label(
      ctx,
      `方向 ${angle > 0 ? '+' : ''}${angle}° · 力度 ${Math.round(power * 100)}%`,
      300,
      388,
      12,
      '#5e6d58',
    );
  }
}

function drawTarget(ctx, point) {
  ctx.fillStyle = '#fff8df';
  ctx.beginPath();
  ctx.arc(point.x, point.y, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d58b8d';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.fillStyle = '#e9bd68';
  ctx.beginPath();
  ctx.arc(point.x, point.y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff8df';
  ctx.beginPath();
  ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawAcorn(ctx, point) {
  ctx.fillStyle = '#9a704d';
  ctx.beginPath();
  ctx.ellipse(point.x, point.y, 19, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6d503d';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#78906d';
  ctx.beginPath();
  ctx.ellipse(point.x, point.y - 20, 21, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}
