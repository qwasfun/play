import { rng, roundRect, label } from '@playground/game-sdk';

const WIDTH = 600, HEIGHT = 480, LEFT = 22, RIGHT = 578, TOP = 55;
const RADIUS = 8, PADDLE_Y = 426, PADDLE_WIDTH = 112;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const direction = key => ['ArrowLeft', 'a', 'A'].includes(key) ? -1 : ['ArrowRight', 'd', 'D'].includes(key) ? 1 : 0;

export function createBounceState(seed) {
  const random = rng(`${seed}:candy-bricks`);
  const bricks = Array.from({ length: 24 }, (_, index) => ({
    x: 52 + index % 6 * 84, y: 78 + Math.floor(index / 6) * 34,
    width: 76, height: 24, alive: true, row: Math.floor(index / 6), detail: Math.floor(random() * 3),
  }));
  const launches = Array.from({ length: 3 }, () => {
    const vx = (random() < 0.5 ? -1 : 1) * (100 + random() * 55);
    return { vx, vy: -Math.sqrt(270 * 270 - vx * vx) };
  });
  return {
    elapsed: 0, score: 0, lives: 3, remaining: 24, done: false,
    phase: 'serve', countdown: 1.2, launches, bricks,
    ball: { x: 300, y: PADDLE_Y - RADIUS - 2, vx: 0, vy: 0, radius: RADIUS },
    paddle: { x: 300, y: PADDLE_Y, width: PADDLE_WIDTH, height: 15 },
    keys: new Set(), dragging: false, trail: [], flash: 0, bursts: [],
  };
}

export function applyBounceInput(state, type, payload = {}) {
  if (state.done) return;
  const move = x => { if (Number.isFinite(x)) state.paddle.x = clamp(x, LEFT + PADDLE_WIDTH / 2, RIGHT - PADDLE_WIDTH / 2); };
  if (type === 'primary-down') { state.dragging = true; move(payload.x); }
  if (type === 'primary-move' && state.dragging) move(payload.x);
  if (type === 'primary-up') { if (state.dragging) move(payload.x); state.dragging = false; }
  if (type === 'key-down' && direction(payload.key)) state.keys.add(payload.key);
  if (type === 'key-up') state.keys.delete(payload.key);
  if (type === 'primary-cancel') { state.dragging = false; state.keys.clear(); }
}

function result(state, reason) {
  state.done = true; state.phase = 'finished'; state.keys.clear(); state.dragging = false;
  return { score: state.score, elapsed: state.elapsed, lives: state.lives, won: state.remaining === 0, reason };
}

function collideBrick(ball, brick, previousX, previousY) {
  const closeX = clamp(ball.x, brick.x, brick.x + brick.width);
  const closeY = clamp(ball.y, brick.y, brick.y + brick.height);
  const dx = ball.x - closeX, dy = ball.y - closeY;
  if (dx * dx + dy * dy >= RADIUS * RADIUS) return false;
  if (previousY + RADIUS <= brick.y && ball.vy > 0) {
    ball.y = brick.y - RADIUS; ball.vy = -Math.abs(ball.vy);
  } else if (previousY - RADIUS >= brick.y + brick.height && ball.vy < 0) {
    ball.y = brick.y + brick.height + RADIUS; ball.vy = Math.abs(ball.vy);
  } else if (previousX + RADIUS <= brick.x && ball.vx > 0) {
    ball.x = brick.x - RADIUS; ball.vx = -Math.abs(ball.vx);
  } else if (previousX - RADIUS >= brick.x + brick.width && ball.vx < 0) {
    ball.x = brick.x + brick.width + RADIUS; ball.vx = Math.abs(ball.vx);
  } else if (dx || dy) {
    const distance = Math.hypot(dx, dy), nx = dx / distance, ny = dy / distance;
    const dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0) { ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny; }
    ball.x = closeX + nx * RADIUS; ball.y = closeY + ny * RADIUS;
  } else {
    // A defensive separation for an overlap after an unusually large external step.
    const edges = [
      { distance: ball.x - brick.x, x: brick.x - RADIUS, y: ball.y, axis: 'x', sign: -1 },
      { distance: brick.x + brick.width - ball.x, x: brick.x + brick.width + RADIUS, y: ball.y, axis: 'x', sign: 1 },
      { distance: ball.y - brick.y, x: ball.x, y: brick.y - RADIUS, axis: 'y', sign: -1 },
      { distance: brick.y + brick.height - ball.y, x: ball.x, y: brick.y + brick.height + RADIUS, axis: 'y', sign: 1 },
    ].sort((a, b) => a.distance - b.distance);
    const edge = edges[0]; ball.x = edge.x; ball.y = edge.y;
    if (edge.axis === 'x') ball.vx = edge.sign * Math.abs(ball.vx);
    else ball.vy = edge.sign * Math.abs(ball.vy);
  }
  return true;
}

export function stepBounce(state, dt, emit = () => {}) {
  if (state.done || !Number.isFinite(dt) || dt <= 0) return null;
  const previousTime = state.elapsed;
  state.elapsed = Math.min(120, state.elapsed + dt);
  dt = state.elapsed - previousTime;
  if (state.elapsed >= 120) return result(state, 'time');
  state.flash = Math.max(0, state.flash - dt);
  state.bursts = state.bursts.filter(burst => (burst.life -= dt) > 0);
  if (!state.dragging) {
    const movement = clamp([...state.keys].reduce((sum, key) => sum + direction(key), 0), -1, 1);
    state.paddle.x = clamp(state.paddle.x + movement * 450 * dt, LEFT + PADDLE_WIDTH / 2, RIGHT - PADDLE_WIDTH / 2);
  }
  if (state.phase === 'serve') {
    state.ball.x = state.paddle.x; state.ball.y = PADDLE_Y - RADIUS - 2;
    state.countdown -= dt;
    if (state.countdown <= 0) {
      const launch = state.launches[Math.min(2, 3 - state.lives)];
      state.ball.vx = launch.vx; state.ball.vy = launch.vy;
      state.phase = 'playing'; state.trail = []; emit('tap');
    }
    return null;
  }
  const ball = state.ball;
  state.trail.push({ x: ball.x, y: ball.y });
  if (state.trail.length > 9) state.trail.shift();
  // Travel is at most half a radius per substep, including on fast displays.
  const substeps = Math.max(1, Math.ceil(Math.hypot(ball.vx, ball.vy) * dt / (RADIUS * 0.5)));
  const h = dt / substeps;
  for (let sub = 0; sub < substeps; sub++) {
    const previousX = ball.x, previousY = ball.y;
    ball.x += ball.vx * h; ball.y += ball.vy * h;
    if (ball.x < LEFT + RADIUS) { ball.x = LEFT + RADIUS; ball.vx = Math.abs(ball.vx); }
    if (ball.x > RIGHT - RADIUS) { ball.x = RIGHT - RADIUS; ball.vx = -Math.abs(ball.vx); }
    if (ball.y < TOP + RADIUS) { ball.y = TOP + RADIUS; ball.vy = Math.abs(ball.vy); }
    if (ball.vy > 0 && previousY + RADIUS <= PADDLE_Y && ball.y + RADIUS >= PADDLE_Y
        && Math.abs(ball.x - state.paddle.x) < PADDLE_WIDTH / 2 + RADIUS * 0.65) {
      const speed = Math.min(345, Math.max(270, Math.hypot(ball.vx, ball.vy)));
      const offset = clamp((ball.x - state.paddle.x) / (PADDLE_WIDTH / 2), -1, 1);
      let vx = speed * Math.sin(offset * Math.PI * 0.35);
      if (Math.abs(vx) < 30) vx = Math.sign(ball.vx || 1) * 30;
      ball.vx = vx; ball.vy = -Math.sqrt(speed * speed - vx * vx); ball.y = PADDLE_Y - RADIUS;
      emit('tap');
    }
    for (const brick of state.bricks) {
      if (!brick.alive || !collideBrick(ball, brick, previousX, previousY)) continue;
      brick.alive = false; state.remaining--; state.score += 10;
      state.bursts.push({ x: brick.x + brick.width / 2, y: brick.y + brick.height / 2, life: 0.35, row: brick.row });
      emit('collect');
      if (!state.remaining) { emit('win'); return result(state, 'clear'); }
      const speed = Math.hypot(ball.vx, ball.vy), nextSpeed = Math.min(345, speed + 1.7);
      ball.vx *= nextSpeed / speed; ball.vy *= nextSpeed / speed;
      break;
    }
    if (ball.y - RADIUS > HEIGHT) {
      state.lives--; state.flash = 0.4; emit('hit');
      if (!state.lives) return result(state, 'lives');
      state.phase = 'serve'; state.countdown = 1.2; state.trail = [];
      ball.x = state.paddle.x; ball.y = PADDLE_Y - RADIUS - 2; ball.vx = 0; ball.vy = 0;
      return null;
    }
  }
  return null;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const state = createBounceState(seed);
  const colors = ['#e7bca4', '#efd68d', '#a6d2bd', '#a3cbd7'];
  return {
    update(dt) { const finished = stepBounce(state, dt, sound); if (finished) onFinish(finished); },
    input(type, payload) { applyBounceInput(state, type, payload); },
    getState() {
      return {
        score: state.score, elapsed: state.elapsed, lives: state.lives, done: state.done,
        progress: 24 - state.remaining, extra: `${state.remaining} 块糖砖`, phase: state.phase,
        countdown: state.countdown, ball: { ...state.ball }, paddle: { ...state.paddle },
        bricks: state.bricks.map(brick => ({ ...brick })), dragging: state.dragging,
        hint: '左右拖动球拍 / ← → · 接住弹珠，清空糖砖',
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#183c54'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      for (let x = 42; x < WIDTH; x += 32) {
        for (let y = 68; y < HEIGHT; y += 32) {
          ctx.fillStyle = '#285068'; ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
        }
      }
      roundRect(ctx, LEFT - 7, TOP - 6, RIGHT - LEFT + 14, 399, 14, null, '#3a6172');
      roundRect(ctx, 20, 15, 140, 30, 15, '#2c5366');
      label(ctx, `${state.remaining} 块糖砖等你敲`, 90, 31, 12, '#c5e0d6');
      label(ctx, 'CANDY BREAK', 577, 31, 10, '#86a9b5', 'right', 700);
      for (const brick of state.bricks) {
        if (!brick.alive) continue;
        roundRect(ctx, brick.x, brick.y + 3, brick.width, brick.height, 7, '#102f4566');
        roundRect(ctx, brick.x, brick.y, brick.width, brick.height, 7, colors[brick.row]);
        roundRect(ctx, brick.x + 5, brick.y + 3, brick.width - 10, 3, 2, '#ffffff55');
        ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 1.5;
        if (brick.detail === 0) {
          ctx.beginPath(); ctx.moveTo(brick.x + 31, brick.y + 10); ctx.lineTo(brick.x + 45, brick.y + 15); ctx.stroke();
        } else if (brick.detail === 1) {
          ctx.beginPath(); ctx.arc(brick.x + 38, brick.y + 13, 3, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(brick.x + 34, brick.y + 11); ctx.lineTo(brick.x + 42, brick.y + 11); ctx.moveTo(brick.x + 38, brick.y + 7); ctx.lineTo(brick.x + 38, brick.y + 15); ctx.stroke();
        }
      }
      for (const burst of state.bursts) {
        ctx.save(); ctx.globalAlpha = burst.life / 0.35; ctx.strokeStyle = colors[burst.row]; ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
          const angle = i * Math.PI / 3, radius = 10 + (0.35 - burst.life) * 70;
          ctx.beginPath(); ctx.moveTo(burst.x + Math.cos(angle) * radius, burst.y + Math.sin(angle) * radius); ctx.lineTo(burst.x + Math.cos(angle) * (radius + 6), burst.y + Math.sin(angle) * (radius + 6)); ctx.stroke();
        }
        ctx.restore();
      }
      for (let i = 0; i < state.trail.length; i++) {
        const point = state.trail[i]; ctx.fillStyle = `rgba(247,234,180,${(i + 1) / state.trail.length * 0.3})`;
        ctx.beginPath(); ctx.arc(point.x, point.y, 2 + i / 3, 0, Math.PI * 2); ctx.fill();
      }
      const paddle = state.paddle;
      roundRect(ctx, paddle.x - PADDLE_WIDTH / 2, PADDLE_Y + 4, PADDLE_WIDTH, 15, 7, '#102b40');
      roundRect(ctx, paddle.x - PADDLE_WIDTH / 2, PADDLE_Y, PADDLE_WIDTH, 15, 7, state.flash > 0 ? '#eab49c' : '#add8c2');
      roundRect(ctx, paddle.x - PADDLE_WIDTH / 2 + 9, PADDLE_Y + 3, PADDLE_WIDTH - 18, 3, 2, '#e6f3d6');
      ctx.save(); ctx.shadowColor = '#f4df9e'; ctx.shadowBlur = 15;
      ctx.fillStyle = '#f8eac0'; ctx.beginPath(); ctx.arc(state.ball.x, state.ball.y, RADIUS, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff9e1'; ctx.beginPath(); ctx.arc(state.ball.x - 2, state.ball.y - 3, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (state.phase === 'serve') {
        label(ctx, state.lives === 3 ? '准备好，弹珠要出发了' : '没关系，再接一球', 300, 291, 17, '#d7e7d8');
        label(ctx, Math.max(1, Math.ceil(state.countdown)), 300, 335, 31, '#f0da9b', 'center', 800);
        label(ctx, '拖动球拍，决定你的起点', 300, 368, 12, '#8fb3be');
      }
      label(ctx, '左右拖动球拍 · 别让弹珠落下', 300, 468, 12, '#97bbbf');
    },
    destroy() { state.done = true; state.dragging = false; state.keys.clear(); }
  };
}
