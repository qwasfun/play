import { label, roundRect } from '@playground/game-sdk';
import { distanceToSegment, generateRoutes, GLOW_PATH } from './course.js';

export { distanceToSegment, generateRoutes, GLOW_PATH } from './course.js';

const validPoint = (point) =>
  Number.isFinite(point?.x) &&
  Number.isFinite(point?.y) &&
  point.x >= 0 &&
  point.x <= 600 &&
  point.y >= 0 &&
  point.y <= 480;
const keyDirections = {
  ArrowLeft: [-1, 0],
  a: [-1, 0],
  ArrowRight: [1, 0],
  d: [1, 0],
  ArrowUp: [0, -1],
  w: [0, -1],
  ArrowDown: [0, 1],
  s: [0, 1],
};
const copyPoint = (point) => ({ x: point.x, y: point.y });

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const routes = generateRoutes(seed);
  let route = 0;
  let checkpoint = 1;
  let position = copyPoint(routes[0].points[0]);
  let elapsed = 0;
  let score = 0;
  let lives = GLOW_PATH.lives;
  let rounds = 0;
  let dragging = false;
  let phase = 'guide';
  let transition = 0;
  let flash = 0;
  let finished = false;
  let won = false;
  let message = '从亮起的花心出发，沿花径慢慢走';
  const keys = new Set();

  const progress = () => route * GLOW_PATH.checkpoints + checkpoint - 1;

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    dragging = false;
    keys.clear();
    onFinish({ score, elapsed, won, progress: progress(), rounds, lives });
  }

  function currentSegment() {
    const points = routes[route].points;
    return [points[checkpoint - 1], points[checkpoint]];
  }

  function miss() {
    lives--;
    flash = 0.45;
    dragging = false;
    keys.clear();
    position = copyPoint(routes[route].points[checkpoint - 1]);
    message = '碰到花沿啦，从上一朵花再试一次';
    sound('hit');
    if (lives === 0) finish(false);
  }

  function reachCheckpoint() {
    score += 50;
    sound('collect');
    if (checkpoint < GLOW_PATH.checkpoints) {
      checkpoint++;
      message = '很好，继续沿着花径走';
      return;
    }
    checkpoint++;
    rounds++;
    dragging = false;
    keys.clear();
    if (route === GLOW_PATH.routes - 1) {
      message = '三段花径都亮起来啦！';
      sound('win');
      finish(true);
      return;
    }
    phase = 'transition';
    transition = 0.7;
    message = `第 ${rounds} 段完成，下一段更细一点`;
  }

  function moveTo(target) {
    if (finished || phase !== 'guide' || !validPoint(target)) return;
    const distance = Math.hypot(target.x - position.x, target.y - position.y);
    const steps = Math.max(1, Math.ceil(distance / 4));
    const start = copyPoint(position);
    for (let step = 1; step <= steps && !finished && phase === 'guide'; step++) {
      const point = {
        x: start.x + ((target.x - start.x) * step) / steps,
        y: start.y + ((target.y - start.y) * step) / steps,
      };
      const [from, to] = currentSegment();
      if (distanceToSegment(point, from, to) > routes[route].radius) {
        miss();
        return;
      }
      position = point;
      if (Math.hypot(position.x - to.x, position.y - to.y) <= 18) reachCheckpoint();
    }
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      const step = Math.min(dt, GLOW_PATH.limit - elapsed);
      elapsed += step;
      flash = Math.max(0, flash - step);
      if (phase === 'transition') {
        transition -= step;
        if (transition <= 0) {
          route++;
          checkpoint = 1;
          position = copyPoint(routes[route].points[0]);
          phase = 'guide';
          message = '找到新的起点，继续牵着微光前进';
        }
      } else if (keys.size) {
        let x = 0;
        let y = 0;
        for (const key of keys) {
          const direction = keyDirections[key];
          if (direction) {
            x += direction[0];
            y += direction[1];
          }
        }
        const length = Math.hypot(x, y);
        if (length)
          moveTo({
            x: position.x + (x / length) * GLOW_PATH.speed * step,
            y: position.y + (y / length) * GLOW_PATH.speed * step,
          });
      }
      if (!finished && elapsed >= GLOW_PATH.limit) finish(false);
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        dragging = false;
        keys.clear();
        return;
      }
      if (finished) return;
      if (type === 'key-up') {
        keys.delete(payload.key);
        return;
      }
      if (phase !== 'guide') return;
      if (type === 'primary-down' && validPoint(payload)) {
        if (Math.hypot(payload.x - position.x, payload.y - position.y) <= 48) dragging = true;
        else message = '请从发光的小萤点按住出发';
      }
      if (type === 'primary-move' && dragging) moveTo(payload);
      if (type === 'primary-up' && dragging) {
        moveTo(payload);
        dragging = false;
      }
      if (type === 'key-down' && !payload.repeat && keyDirections[payload.key]) {
        keys.add(payload.key);
        dragging = false;
      }
    },
    getState() {
      return {
        elapsed,
        score,
        lives,
        rounds,
        progress: progress(),
        route,
        checkpoint,
        position: copyPoint(position),
        routes: routes.map((entry) => ({
          radius: entry.radius,
          points: entry.points.map(copyPoint),
        })),
        dragging,
        phase,
        finished,
        won,
        extra: `${progress()} / ${GLOW_PATH.routes * GLOW_PATH.checkpoints} · 机会 ${lives}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#eee8dc';
      ctx.fillRect(0, 0, 600, 480);
      const gradient = ctx.createLinearGradient(0, 72, 0, 430);
      gradient.addColorStop(0, '#dce8df');
      gradient.addColorStop(1, '#b9d0bd');
      ctx.fillStyle = gradient;
      roundRect(ctx, 24, 72, 552, 340, 34);
      for (const [x, y, color] of [
        [70, 105, '#df9b8d'],
        [532, 116, '#d7b65f'],
        [91, 380, '#a79ab4'],
        [515, 373, '#d68978'],
      ]) {
        ctx.fillStyle = color;
        for (let petal = 0; petal < 5; petal++) {
          const angle = (petal * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.ellipse(
            x + Math.cos(angle) * 12,
            y + Math.sin(angle) * 12,
            10,
            5,
            angle,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      label(ctx, '微光花径', 105, 35, 23);
      label(ctx, `花标 ${progress()}/24 · 机会 ${lives}`, 480, 35, 16, '#5d7666');
      const current = routes[route];
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      current.points.forEach((point, index) =>
        index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y),
      );
      ctx.strokeStyle = flash ? '#c98174' : '#8ca391';
      ctx.lineWidth = current.radius * 2 + 12;
      ctx.stroke();
      ctx.strokeStyle = '#fff7df';
      ctx.lineWidth = current.radius * 2;
      ctx.stroke();
      ctx.setLineDash([4, 12]);
      ctx.strokeStyle = '#d7bb74';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
      current.points.forEach((point, index) => {
        const reached = index < checkpoint || phase === 'transition' || finished;
        ctx.fillStyle = reached ? '#efc86d' : '#fffaf0';
        ctx.strokeStyle = '#a68d67';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, index ? 12 : 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (index) label(ctx, String(index), point.x, point.y + 1, 10, '#725f48');
      });
      ctx.save();
      ctx.shadowColor = '#f2ce61';
      ctx.shadowBlur = 20;
      ctx.fillStyle = flash ? '#d47868' : '#f6d66f';
      ctx.beginPath();
      ctx.arc(position.x, position.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff7cf';
      ctx.beginPath();
      ctx.arc(position.x - 3, position.y - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      roundRect(ctx, 56, 424, 488, 34, 16, '#fff9ea');
      label(ctx, message, 300, 441, 15, flash ? '#a75e52' : '#5d7666');
      label(ctx, '按住拖动 · 方向键 / WASD', 300, 473, 12, '#74736a');
    },
    destroy() {
      finished = true;
      dragging = false;
      keys.clear();
    },
  };
}
