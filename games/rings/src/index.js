import { createCampaignGame } from './campaign-engine.js';
import { rng, roundRect, label } from '@playground/game-sdk';

const ORIGIN = { x: 88, y: 390 },
  GRAVITY = 330,
  GROUND = 431;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const DEFAULT_AIM = { angle: 0.96, power: 410 };

export function generateRings(seed) {
  const random = rng(`${seed}:reachable-rings`);
  return Array.from({ length: 8 }, (_, index) => {
    const vx = 185 + random() * 100,
      vy = -(285 + random() * 95);
    const time = 0.92 + random() * 0.38,
      wind = (random() - 0.5) * 36;
    return {
      target: {
        x: ORIGIN.x + vx * time + (wind * time * time) / 2,
        y: ORIGIN.y + vy * time + (GRAVITY * time * time) / 2,
        radius: 33 - index * 0.55,
      },
      wind,
      solution: { vx, vy, time },
    };
  });
}

export function segmentHitsRing(from, to, target) {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    lengthSquared = dx * dx + dy * dy;
  const time = lengthSquared
    ? clamp(((target.x - from.x) * dx + (target.y - from.y) * dy) / lengthSquared, 0, 1)
    : 0;
  return Math.hypot(from.x + time * dx - target.x, from.y + time * dy - target.y) <= target.radius;
}

export function createRingState(seed) {
  return {
    rings: generateRings(seed),
    elapsed: 0,
    score: 0,
    lives: 3,
    progress: 0,
    done: false,
    phase: 'aim',
    phaseTime: 0,
    aim: { ...DEFAULT_AIM },
    ball: null,
    trail: [],
    keys: new Set(),
    drag: null,
    message: '向左下拉，松手把小球送进金环',
    lastHit: false,
  };
}

function velocity(aim) {
  return { vx: Math.cos(aim.angle) * aim.power, vy: -Math.sin(aim.angle) * aim.power };
}
function updateDrag(state, point) {
  if (!state.drag || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
  state.drag.current = { x: point.x, y: point.y };
  const dx = state.drag.start.x - point.x,
    dy = point.y - state.drag.start.y;
  if (Math.hypot(dx, dy) < 5) return;
  state.aim.angle = clamp(Math.atan2(Math.max(5, dy), Math.max(5, dx)), 0.55, 1.27);
  state.aim.power = clamp(Math.hypot(dx, dy) * 3.7, 300, 490);
}
function launch(state) {
  if (state.done || state.phase !== 'aim') return;
  state.ball = { ...ORIGIN, ...velocity(state.aim), flightTime: 0 };
  state.phase = 'flight';
  state.drag = null;
  state.keys.clear();
  state.trail = [];
  state.message = '飞呀，飞进金环里';
}

export function applyRingInput(state, type, payload = {}) {
  if (state.done) return;
  if (type === 'primary-cancel') {
    state.drag = null;
    state.keys.clear();
    return;
  }
  if (type === 'key-up') {
    state.keys.delete(payload.key);
    return;
  }
  if (state.phase !== 'aim') return;
  if (type === 'primary-down' && Number.isFinite(payload.x) && Number.isFinite(payload.y)) {
    state.drag = { start: { x: payload.x, y: payload.y }, current: { x: payload.x, y: payload.y } };
  }
  if (type === 'primary-move') updateDrag(state, payload);
  if (type === 'primary-up' && state.drag) {
    updateDrag(state, payload);
    const distance = Math.hypot(
      state.drag.start.x - state.drag.current.x,
      state.drag.start.y - state.drag.current.y,
    );
    if (distance >= 8) launch(state);
    else {
      state.drag = null;
      state.message = '按住画布向左下拉，再松手投出';
    }
  }
  if (type === 'key-down' && !payload.repeat) {
    if ([' ', 'Enter', 'Space', 'Spacebar'].includes(payload.key)) launch(state);
    else if (
      [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'a',
        'd',
        'w',
        's',
        'A',
        'D',
        'W',
        'S',
      ].includes(payload.key)
    )
      state.keys.add(payload.key);
  }
}

function settle(state, reason) {
  if (state.done) return null;
  state.done = true;
  state.phase = 'finished';
  state.drag = null;
  state.keys.clear();
  return {
    score: state.score,
    elapsed: state.elapsed,
    lives: state.lives,
    progress: state.progress,
    won: state.progress === 8,
    reason,
  };
}

export function stepRings(state, dt, emit = () => {}) {
  if (state.done || !Number.isFinite(dt) || dt <= 0) return null;
  const previousTime = state.elapsed;
  state.elapsed = Math.min(120, state.elapsed + dt);
  dt = state.elapsed - previousTime;
  if (state.elapsed >= 120) return settle(state, 'time');
  if (state.phase === 'aim' && !state.drag) {
    const has = (keys) => keys.some((key) => state.keys.has(key));
    const turn = Number(has(['ArrowLeft', 'a', 'A'])) - Number(has(['ArrowRight', 'd', 'D']));
    const power = Number(has(['ArrowUp', 'w', 'W'])) - Number(has(['ArrowDown', 's', 'S']));
    state.aim.angle = clamp(state.aim.angle + turn * 0.85 * dt, 0.55, 1.27);
    state.aim.power = clamp(state.aim.power + power * 130 * dt, 300, 490);
  }
  if (state.phase === 'flight') {
    const ring = state.rings[Math.min(7, state.progress)],
      ball = state.ball;
    const before = { x: ball.x, y: ball.y };
    ball.x += ball.vx * dt + (ring.wind * dt * dt) / 2;
    ball.vx += ring.wind * dt;
    ball.y += ball.vy * dt + (GRAVITY * dt * dt) / 2;
    ball.vy += GRAVITY * dt;
    ball.flightTime += dt;
    state.trail.push({ x: ball.x, y: ball.y });
    if (state.trail.length > 16) state.trail.shift();
    if (segmentHitsRing(before, ball, ring.target)) {
      state.score += 100;
      state.progress++;
      state.lastHit = true;
      emit('collect');
      state.message = state.progress === 8 ? '八个金环，全都收好啦！' : '漂亮！再来一个金环';
      state.phase = 'feedback';
      state.phaseTime = 0;
    } else if (ball.y > GROUND || ball.x > 640 || ball.x < -40 || ball.flightTime > 5) {
      state.lives--;
      state.lastHit = false;
      emit('hit');
      state.message = '差一点点，调整角度再投一次';
      state.phase = 'feedback';
      state.phaseTime = 0;
    }
  } else if (state.phase === 'feedback') {
    state.phaseTime += dt;
    if (state.phaseTime >= 0.65) {
      if (state.progress === 8) {
        emit('win');
        return settle(state, 'complete');
      }
      if (state.lives === 0) return settle(state, 'lives');
      state.phase = 'aim';
      state.ball = null;
      state.trail = [];
      state.drag = null;
      state.aim = { ...DEFAULT_AIM };
      state.keys.clear();
      state.message = '向左下拉，松手把小球送进金环';
    }
  }
  return null;
}

export function createGame({ level: campaignLevel, seed, onFinish = () => {}, sound = () => {} }) {
  if (campaignLevel) return createCampaignGame({ level: campaignLevel, onFinish, sound });
  const state = createRingState(seed);
  return {
    update(dt) {
      const result = stepRings(state, dt, sound);
      if (result) onFinish(result);
    },
    input(type, payload) {
      applyRingInput(state, type, payload);
    },
    getState() {
      const index =
        state.phase === 'feedback' && state.lastHit ? state.progress - 1 : state.progress;
      const ring = state.rings[Math.min(7, index)];
      return {
        score: state.score,
        elapsed: state.elapsed,
        lives: state.lives,
        progress: state.progress,
        done: state.done,
        extra: `${state.progress} / 8`,
        phase: state.phase,
        aim: { ...state.aim, ...velocity(state.aim) },
        target: { ...ring.target },
        wind: ring.wind,
        ball: state.ball ? { ...state.ball } : null,
        dragging: !!state.drag,
        hint: '向左下拉后松手 · ← → 调角度，↑ ↓ 调力度，空格投球',
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#dcecf0';
      ctx.fillRect(0, 0, 600, 480);
      ctx.fillStyle = '#f8f4da';
      ctx.beginPath();
      ctx.arc(492, 108, 43, 0, Math.PI * 2);
      ctx.fill();
      for (const [x, y] of [
        [112, 113],
        [343, 62],
      ]) {
        ctx.fillStyle = '#f8fcf8';
        ctx.beginPath();
        ctx.ellipse(x, y, 43, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x - 8, y - 8, 22, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#bdd8dc';
      ctx.beginPath();
      ctx.moveTo(0, 424);
      ctx.quadraticCurveTo(94, 335, 221, 425);
      ctx.quadraticCurveTo(438, 336, 600, 419);
      ctx.lineTo(600, 480);
      ctx.lineTo(0, 480);
      ctx.fill();
      ctx.fillStyle = '#a9c7c9';
      ctx.fillRect(0, GROUND, 600, 49);
      roundRect(ctx, 20, 17, 120, 33, 16, '#f8fcf5');
      label(ctx, `${state.progress} / 8 个金环`, 80, 35, 13, '#50717a');
      const displayIndex =
        state.phase === 'feedback' && state.lastHit ? state.progress - 1 : state.progress;
      const ring = state.rings[Math.min(7, displayIndex)],
        target = ring.target;
      label(
        ctx,
        Math.abs(ring.wind) < 5 ? '风很轻，放心投' : ring.wind > 0 ? '轻风 →' : '← 轻风',
        571,
        35,
        13,
        '#63818b',
        'right',
      );
      ctx.strokeStyle = '#a8c5c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(target.x, target.y + target.radius + 3);
      ctx.lineTo(target.x, GROUND);
      ctx.stroke();
      ctx.fillStyle = '#90b5ba';
      ctx.beginPath();
      ctx.ellipse(target.x, GROUND + 2, 26, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c79b43';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(target.x, target.y + 3, target.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = state.phase === 'feedback' && state.lastHit ? '#f9e8a9' : '#efcf79';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#fff5c8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius - 1, Math.PI * 1.06, Math.PI * 1.65);
      ctx.stroke();
      label(ctx, '✦', target.x + target.radius + 17, target.y - 21, 19, '#d8b859');
      if (state.phase === 'aim') {
        const v = velocity(state.aim);
        for (let i = 1; i <= 13; i++) {
          const time = i * 0.085,
            x = ORIGIN.x + v.vx * time + (ring.wind * time * time) / 2,
            y = ORIGIN.y + v.vy * time + (GRAVITY * time * time) / 2;
          if (y > GROUND || x > 592) break;
          ctx.fillStyle = `rgba(78,125,140,${0.6 - i * 0.028})`;
          ctx.beginPath();
          ctx.arc(x, y, 3 - i * 0.06, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let index = 0; index < state.trail.length; index++) {
        const point = state.trail[index];
        ctx.fillStyle = `rgba(214,125,103,${(index / state.trail.length) * 0.27})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2 + index * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      roundRect(ctx, 52, 410, 72, 22, 8, '#6d9699');
      roundRect(ctx, 61, 400, 54, 17, 7, '#8db3b3');
      const ball = state.ball || ORIGIN;
      ctx.fillStyle = '#cf816b';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f6b99c';
      ctx.beginPath();
      ctx.arc(ball.x - 3, ball.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      if (state.drag) {
        ctx.save();
        ctx.setLineDash([5, 6]);
        ctx.strokeStyle = '#6d949b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(state.drag.start.x, state.drag.start.y);
        ctx.lineTo(state.drag.current.x, state.drag.current.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(state.drag.start.x, state.drag.start.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      label(
        ctx,
        `角度 ${Math.round((state.aim.angle * 180) / Math.PI)}° · 力度 ${Math.round(((state.aim.power - 300) / 190) * 100)}%`,
        300,
        451,
        12,
        '#4c7076',
      );
      label(ctx, state.message, 300, 472, 12, '#486e74');
    },
    destroy() {
      state.done = true;
      state.drag = null;
      state.keys.clear();
    },
  };
}
