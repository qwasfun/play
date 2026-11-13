import { createCampaignGame } from './campaign-engine.js';
import { rng, roundRect, label } from '@playground/game-sdk';

const COLS = 12,
  ROWS = 10,
  STEP = 0.18,
  CELL = 36,
  BOARD_X = 84,
  BOARD_Y = 72;
const DIRECTIONS = {
  ArrowLeft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  A: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
  D: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  W: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  S: { x: 0, y: 1 },
};
const same = (a, b) => a.x === b.x && a.y === b.y;

export function generateFoodOrders(seed) {
  const random = rng(`${seed}:forest-stars`);
  return Array.from({ length: 10 }, () => {
    const order = Array.from({ length: COLS * ROWS }, (_, index) => index);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  });
}

export function createSnakeState(seed) {
  return {
    elapsed: 0,
    score: 0,
    stars: 0,
    done: false,
    accumulator: 0,
    body: [
      { x: 4, y: 5 },
      { x: 3, y: 5 },
      { x: 2, y: 5 },
    ],
    direction: { x: 1, y: 0 },
    queued: null,
    food: { x: 7, y: 5 },
    foodOrders: generateFoodOrders(seed),
    drag: null,
  };
}

export function queueSnakeTurn(state, direction) {
  if (state.done || state.queued || same(direction, state.direction)) return false;
  if (direction.x === -state.direction.x && direction.y === -state.direction.y) return false;
  state.queued = { ...direction };
  return true;
}

export function applySnakeInput(state, type, payload = {}) {
  if (state.done) return;
  if (type === 'key-down' && !payload.repeat && DIRECTIONS[payload.key])
    queueSnakeTurn(state, DIRECTIONS[payload.key]);
  if (type === 'primary-down' && Number.isFinite(payload.x) && Number.isFinite(payload.y)) {
    state.drag = { start: { x: payload.x, y: payload.y }, current: { x: payload.x, y: payload.y } };
  }
  if (
    type === 'primary-move' &&
    state.drag &&
    Number.isFinite(payload.x) &&
    Number.isFinite(payload.y)
  )
    state.drag.current = { x: payload.x, y: payload.y };
  if (type === 'primary-up' && state.drag) {
    const end =
      Number.isFinite(payload.x) && Number.isFinite(payload.y) ? payload : state.drag.current;
    const dx = end.x - state.drag.start.x,
      dy = end.y - state.drag.start.y;
    if (Math.hypot(dx, dy) >= 18)
      queueSnakeTurn(
        state,
        Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) },
      );
    state.drag = null;
  }
  if (type === 'primary-cancel') state.drag = null;
}

function settle(state, reason) {
  state.done = true;
  state.drag = null;
  state.queued = null;
  return {
    score: state.score,
    elapsed: state.elapsed,
    stars: state.stars,
    won: state.stars === 10,
    reason,
  };
}

export function stepSnake(state, dt, emit = () => {}) {
  if (state.done || !Number.isFinite(dt) || dt <= 0) return null;
  const previousTime = state.elapsed;
  state.elapsed = Math.min(90, state.elapsed + dt);
  dt = state.elapsed - previousTime;
  if (state.elapsed >= 90) return settle(state, 'time');
  state.accumulator += dt;
  while (state.accumulator + 1e-10 >= STEP) {
    state.accumulator -= STEP;
    if (state.queued) {
      state.direction = state.queued;
      state.queued = null;
    }
    const head = { x: state.body[0].x + state.direction.x, y: state.body[0].y + state.direction.y };
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      emit('hit');
      return settle(state, 'wall');
    }
    const eating = same(head, state.food);
    const occupied = eating ? state.body : state.body.slice(0, -1);
    if (occupied.some((cell) => same(cell, head))) {
      emit('hit');
      return settle(state, 'self');
    }
    state.body.unshift(head);
    if (eating) {
      state.stars++;
      state.score += 10;
      emit('collect');
      if (state.stars === 10) {
        emit('win');
        return settle(state, 'complete');
      }
      const order = state.foodOrders[state.stars];
      const index = order.find(
        (index) =>
          !state.body.some(
            (cell) => cell.x === index % COLS && cell.y === Math.floor(index / COLS),
          ),
      );
      state.food = { x: index % COLS, y: Math.floor(index / COLS) };
    } else state.body.pop();
  }
  return null;
}

export function createGame({ level: campaignLevel, seed, onFinish = () => {}, sound = () => {} }) {
  if (campaignLevel) return createCampaignGame({ level: campaignLevel, onFinish, sound });
  const state = createSnakeState(seed);
  return {
    update(dt) {
      const result = stepSnake(state, dt, sound);
      if (result) onFinish(result);
    },
    input(type, payload) {
      applySnakeInput(state, type, payload);
    },
    getState() {
      return {
        score: state.score,
        elapsed: state.elapsed,
        stars: state.stars,
        progress: state.stars,
        done: state.done,
        extra: `${state.stars} / 10`,
        body: state.body.map((cell) => ({ ...cell })),
        food: { ...state.food },
        direction: { ...state.direction },
        queued: state.queued ? { ...state.queued } : null,
        dragging: !!state.drag,
        hint: '在画布滑动 / 方向键转弯 · 吃满 10 颗星星，避开墙和自己',
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#e2e9d3';
      ctx.fillRect(0, 0, 600, 480);
      roundRect(ctx, 20, 17, 130, 32, 16, '#f8fae9');
      label(ctx, `${state.stars} / 10 颗小星星`, 85, 34, 12, '#4b7056');
      label(ctx, 'FOREST TRAIL', 575, 34, 10, '#77946c', 'right', 700);
      roundRect(ctx, BOARD_X - 9, BOARD_Y - 9, COLS * CELL + 18, ROWS * CELL + 18, 17, '#91ac82');
      roundRect(ctx, BOARD_X - 3, BOARD_Y - 3, COLS * CELL + 6, ROWS * CELL + 6, 11, '#b7cba4');
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          roundRect(
            ctx,
            BOARD_X + x * CELL + 1,
            BOARD_Y + y * CELL + 1,
            CELL - 2,
            CELL - 2,
            5,
            (x + y) % 2 ? '#bdcea9' : '#c3d3af',
          );
        }
      }
      const foodX = BOARD_X + (state.food.x + 0.5) * CELL,
        foodY = BOARD_Y + (state.food.y + 0.5) * CELL;
      ctx.fillStyle = '#a5b47a';
      ctx.beginPath();
      ctx.ellipse(foodX, foodY + 12, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(foodX, foodY - 1);
      ctx.rotate(Math.sin(state.elapsed * 3) * 0.08);
      ctx.fillStyle = '#ecd078';
      ctx.strokeStyle = '#be9c47';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5,
          r = i % 2 ? 6.2 : 14;
        const x = Math.cos(angle) * r,
          y = Math.sin(angle) * r;
        if (!i) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      for (let i = state.body.length - 1; i >= 0; i--) {
        const cell = state.body[i],
          x = BOARD_X + cell.x * CELL,
          y = BOARD_Y + cell.y * CELL;
        roundRect(ctx, x + 3, y + 6, CELL - 6, CELL - 6, i === 0 ? 10 : 8, '#72907144');
        roundRect(
          ctx,
          x + 3,
          y + 3,
          CELL - 6,
          CELL - 6,
          i === 0 ? 10 : 8,
          i === 0 ? '#285c4b' : i % 2 ? '#3b735a' : '#427d60',
        );
        if (i > 0 && i % 3 === 0) {
          ctx.fillStyle = '#6f9c70';
          ctx.beginPath();
          ctx.arc(x + 17, y + 16, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const head = state.body[0],
        headX = BOARD_X + (head.x + 0.5) * CELL,
        headY = BOARD_Y + (head.y + 0.5) * CELL;
      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(Math.atan2(state.direction.y, state.direction.x));
      for (const y of [-7, 7]) {
        ctx.fillStyle = '#f6f7dc';
        ctx.beginPath();
        ctx.arc(6, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#223e34';
        ctx.beginPath();
        ctx.arc(7.2, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      if (state.drag) {
        ctx.save();
        ctx.strokeStyle = '#608b6d';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 6]);
        ctx.beginPath();
        ctx.moveTo(state.drag.start.x, state.drag.start.y);
        ctx.lineTo(state.drag.current.x, state.drag.current.y);
        ctx.stroke();
        ctx.restore();
      }
      label(ctx, '滑动 / 方向键转弯 · 收齐星星再回家', 300, 467, 12, '#5b7958');
    },
    destroy() {
      state.done = true;
      state.drag = null;
      state.queued = null;
    },
  };
}
