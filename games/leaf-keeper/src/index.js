import { label, roundRect } from '@playground/game-sdk';
import { generateTargets, LEAF_KEEPER } from './course.js';

export { generateTargets, LEAF_KEEPER } from './course.js';

const leftKeys = new Set(['ArrowLeft', 'a']);
const rightKeys = new Set(['ArrowRight', 'd']);
const validPoint = (point) =>
  Number.isFinite(point?.x) &&
  Number.isFinite(point?.y) &&
  point.x >= 0 &&
  point.x <= 600 &&
  point.y >= 0 &&
  point.y <= 480;

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const targets = generateTargets(seed);
  const keys = new Set();
  let position = 0;
  let elapsed = 0;
  let score = 0;
  let progress = 0;
  let lives = LEAF_KEEPER.lives;
  let targetLeft = LEAF_KEEPER.targetTime;
  let transition = 0;
  let pointerDirection = 0;
  let phase = 'balance';
  let finished = false;
  let won = false;
  let flash = 0;
  let message = '按住左边或右边，让露珠滑向金色微光';

  function direction() {
    const left = [...keys].some((key) => leftKeys.has(key));
    const right = [...keys].some((key) => rightKeys.has(key));
    return left === right ? pointerDirection : left ? -1 : 1;
  }

  function clearInput() {
    keys.clear();
    pointerDirection = 0;
  }

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    clearInput();
    onFinish({ score, elapsed, won, progress, lives });
  }

  function collect() {
    progress++;
    score = progress * 100;
    sound('collect');
    clearInput();
    if (progress === LEAF_KEEPER.targets) {
      message = '十二点花粉光都映进露珠啦！';
      sound('win');
      finish(true);
      return;
    }
    phase = 'bloom';
    transition = LEAF_KEEPER.bloomTime;
    message = '接住啦，下一点微光正在亮起';
  }

  function miss(reason) {
    lives--;
    flash = 0.45;
    clearInput();
    sound('hit');
    message = reason;
    if (lives === 0) {
      finish(false);
      return;
    }
    phase = 'reset';
    transition = LEAF_KEEPER.resetTime;
  }

  function stepBalance(dt) {
    const move = direction();
    position += move * LEAF_KEEPER.speed * dt;
    targetLeft -= dt;
    if (Math.abs(position) > LEAF_KEEPER.edge) {
      miss('露珠滑出叶沿啦，回到叶心再试一次');
      return;
    }
    if (Math.abs(position - targets[progress]) <= LEAF_KEEPER.targetRadius) {
      collect();
      return;
    }
    if (targetLeft <= 0) miss('这点微光等久啦，稳住露珠再追下一次');
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, LEAF_KEEPER.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        const step = Math.min(remaining, 0.02);
        remaining -= step;
        elapsed += step;
        flash = Math.max(0, flash - step);
        if (phase === 'balance') stepBalance(step);
        else {
          transition -= step;
          if (transition <= 0) {
            if (phase === 'reset') position = 0;
            phase = 'balance';
            targetLeft = LEAF_KEEPER.targetTime;
            message = '微光亮起来了，轻轻摇向它';
          }
        }
        if (!finished && elapsed >= LEAF_KEEPER.limit) finish(false);
      }
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        clearInput();
        return;
      }
      if (finished) return;
      if (type === 'key-up') {
        keys.delete(payload.key);
        return;
      }
      if (phase !== 'balance') return;
      if (type === 'primary-down' && validPoint(payload)) {
        pointerDirection = payload.x < 300 ? -1 : 1;
        keys.clear();
      }
      if (type === 'primary-move' && pointerDirection && validPoint(payload))
        pointerDirection = payload.x < 300 ? -1 : 1;
      if (type === 'primary-up') pointerDirection = 0;
      if (
        type === 'key-down' &&
        !payload.repeat &&
        (leftKeys.has(payload.key) || rightKeys.has(payload.key))
      ) {
        keys.add(payload.key);
        pointerDirection = 0;
      }
    },
    getState() {
      return {
        elapsed,
        score,
        lives,
        progress,
        position,
        target: targets[progress] ?? null,
        targets: [...targets],
        targetLeft,
        phase,
        finished,
        won,
        extra: `${progress} / ${LEAF_KEEPER.targets} · 机会 ${lives}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#eee8dc';
      ctx.fillRect(0, 0, 600, 480);
      const sky = ctx.createLinearGradient(0, 72, 0, 420);
      sky.addColorStop(0, '#dfe9df');
      sky.addColorStop(1, '#b8d0bd');
      ctx.fillStyle = sky;
      roundRect(ctx, 24, 72, 552, 340, 34);
      label(ctx, '叶舟托露', 102, 35, 23);
      label(ctx, `微光 ${progress}/12 · 机会 ${lives}`, 478, 35, 16, '#587060');

      ctx.fillStyle = '#95b9b3';
      ctx.beginPath();
      ctx.ellipse(300, 350, 242, 52, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b9d6ce';
      ctx.beginPath();
      ctx.ellipse(300, 341, 207, 31, 0, 0, Math.PI * 2);
      ctx.fill();

      const tilt = direction() * 0.08;
      const leafX = (value) => 300 + value * 190 * Math.cos(tilt);
      const leafY = (value) => 282 + value * 190 * Math.sin(tilt);
      ctx.save();
      ctx.translate(300, 282);
      ctx.rotate(tilt);
      ctx.fillStyle = flash ? '#c98375' : '#72977d';
      ctx.beginPath();
      ctx.moveTo(-222, 12);
      ctx.bezierCurveTo(-145, -78, 34, -99, 222, -13);
      ctx.bezierCurveTo(127, 93, -70, 111, -222, 12);
      ctx.fill();
      ctx.fillStyle = '#a5c69e';
      ctx.beginPath();
      ctx.moveTo(-198, 7);
      ctx.bezierCurveTo(-121, -54, 37, -77, 194, -12);
      ctx.bezierCurveTo(104, 59, -55, 79, -198, 7);
      ctx.fill();
      ctx.strokeStyle = '#5c806a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-181, 6);
      ctx.quadraticCurveTo(-8, 1, 174, -17);
      ctx.stroke();
      ctx.restore();

      if (!finished && progress < targets.length) {
        const target = targets[progress];
        const x = leafX(target);
        const y = leafY(target) - 10;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(elapsed * 1.2);
        ctx.fillStyle = '#f2c963';
        for (let petal = 0; petal < 6; petal++) {
          ctx.rotate(Math.PI / 3);
          ctx.beginPath();
          ctx.ellipse(14, 0, 11, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#fff2b7';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const dewX = leafX(position);
      const dewY = leafY(position) - 30;
      ctx.save();
      ctx.shadowColor = '#8bc8cf';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#bce1e4';
      ctx.strokeStyle = '#5e8584';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(dewX, dewY, 21, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f8ffff';
      ctx.beginPath();
      ctx.ellipse(dewX - 7, dewY - 8, 5, 8, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      roundRect(ctx, 55, 417, 490, 34, 16, '#fff9e9');
      label(ctx, message, 300, 434, 15, flash ? '#a65c50' : '#587060');
      const timeWidth = Math.max(0, (targetLeft / LEAF_KEEPER.targetTime) * 352);
      roundRect(ctx, 124, 457, 352, 8, 4, '#d8d2bd');
      if (phase === 'balance') roundRect(ctx, 124, 457, timeWidth, 8, 4, '#d7ad58');
      label(ctx, '按住左 / 右 · ← → / A D', 300, 477, 11, '#737267');
    },
    destroy() {
      finished = true;
      clearInput();
    },
  };
}
