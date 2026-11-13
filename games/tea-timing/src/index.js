import { label, roundRect } from '@playground/game-sdk';
import { generateCourse, TEA_TIMING } from './course.js';

export { generateCourse, TEA_TIMING } from './course.js';

const STATIONS = [150, 300, 450];
const NAMES = ['左炉', '中炉', '右炉'];
const COLORS = ['#d98679', '#dfb45b', '#7ca18a'];
const directKeys = { a: 0, s: 1, d: 2 };

export const kettlePoint = (station) => ({ x: STATIONS[station], y: 225 });

function stationAt(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return -1;
  if (point.y < 118 || point.y > 322) return -1;
  return STATIONS.findIndex((x) => Math.abs(point.x - x) <= 63);
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const course = generateCourse(seed);
  let elapsed = 0;
  let roundTime = 0;
  let cups = 0;
  let handled = 0;
  let lives = 3;
  let cursor = 1;
  let pressed = -1;
  let phase = 'play';
  let transition = 0;
  let finished = false;
  let won = false;
  let message = '看冒着蒸汽的茶壶，等指针进入金色适温区';

  const current = () => course[Math.min(handled, course.length - 1)];
  const heat = () => Math.min(1, roundTime / current().duration);

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score: cups * 100, elapsed, won, cups, handled, lives });
  }

  function settle(success, reason = '') {
    if (finished || phase !== 'play') return;
    if (success) {
      cups++;
      message = `火候正好，第 ${cups} 壶清茶温柔出炉`;
      sound('collect');
    } else {
      lives--;
      message = reason || '火候差了一点，换一壶再试试';
      sound('hit');
    }
    handled++;
    pressed = -1;
    if (cups === TEA_TIMING.rounds) {
      message = '十二壶清茶都候好了，满室正是茶香！';
      finish(true);
      return;
    }
    if (lives === 0 || handled === TEA_TIMING.rounds) {
      finish(false);
      return;
    }
    phase = 'transition';
    transition = 0.45;
  }

  function tap(station) {
    if (finished || phase !== 'play' || station < 0 || station > 2) return;
    cursor = station;
    if (station !== current().station) {
      settle(false, `${NAMES[station]}还没烧水，机会留给冒着蒸汽的茶壶`);
      return;
    }
    if (heat() < TEA_TIMING.zone[0]) {
      settle(false, '揭盖早了一点，再等指针走进金色适温区');
      return;
    }
    if (heat() > TEA_TIMING.zone[1]) {
      settle(false, '茶水有些过火，下一壶早点揭盖');
      return;
    }
    settle(true);
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, TEA_TIMING.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        if (phase === 'transition') {
          const step = Math.min(remaining, transition);
          transition -= step;
          elapsed += step;
          remaining -= step;
          if (transition <= 1e-9) {
            phase = 'play';
            roundTime = 0;
            cursor = current().station;
            message = `第 ${handled + 1} 壶开始升温，留意${NAMES[current().station]}`;
          }
          continue;
        }
        const untilOverheat = current().duration - roundTime;
        const step = Math.min(remaining, untilOverheat);
        roundTime += step;
        elapsed += step;
        remaining -= step;
        if (roundTime >= current().duration - 1e-9)
          settle(false, '茶水滚过头啦，下一壶记得在金色适温区揭盖');
      }
      if (!finished && elapsed >= TEA_TIMING.limit - 1e-9) finish(false);
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = -1;
        return;
      }
      if (finished || phase !== 'play') return;
      if (type === 'primary-down') pressed = stationAt(payload);
      if (type === 'primary-up') {
        const station = stationAt(payload);
        if (station === pressed) tap(station);
        pressed = -1;
      }
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (key in directKeys) tap(directKeys[key]);
        if (key === 'arrowleft') cursor = (cursor + 2) % 3;
        if (key === 'arrowright') cursor = (cursor + 1) % 3;
        if (key === ' ' || key === 'enter') tap(cursor);
      }
    },
    getState() {
      return {
        elapsed,
        roundTime,
        heat: phase === 'play' ? heat() : 0,
        score: cups * 100,
        cups,
        handled,
        lives,
        cursor,
        target: current().station,
        phase,
        finished,
        won,
        course: course.map((entry) => ({ ...entry })),
        extra: `${cups} / 12 · ${'♥'.repeat(lives) || '—'}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f4eddf';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '茶炉候火', 300, 26, 27);
      label(
        ctx,
        `第 ${Math.min(handled + 1, 12)} 壶 · 等指针进入金色适温区`,
        300,
        54,
        14,
        '#68766a',
      );
      roundRect(ctx, 52, 76, 496, 284, 30, '#e4d8c2');
      roundRect(ctx, 63, 87, 474, 262, 24, '#fff8e8');

      for (let station = 0; station < 3; station++) {
        const x = STATIONS[station];
        const active = !finished && phase === 'play' && station === current().station;
        ctx.beginPath();
        ctx.ellipse(x, 298, 65, 18, 0, 0, Math.PI * 2);
        ctx.fillStyle = active ? '#f2ce76' : '#d4c5aa';
        ctx.fill();
        roundRect(
          ctx,
          x - 57,
          184,
          114,
          98,
          27,
          COLORS[station],
          cursor === station ? '#566d5c' : '#806957',
        );
        ctx.lineWidth = cursor === station ? 5 : 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x, 184, 57, 18, 0, 0, Math.PI * 2);
        ctx.fillStyle = station === 1 ? '#f0d38d' : '#f4c1aa';
        ctx.fill();
        ctx.strokeStyle = '#806957';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 32, 173);
        ctx.quadraticCurveTo(x, 136, x + 32, 173);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, 145, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#efd07b';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 58, 227, 25, -Math.PI / 2, Math.PI / 2);
        ctx.strokeStyle = '#806957';
        ctx.lineWidth = 6;
        ctx.stroke();
        label(ctx, NAMES[station], x, 251, 16, '#fff8e7');
        label(ctx, ['A', 'S', 'D'][station], x, 326, 14, '#6c6d60');
        if (active) {
          for (let puff = 0; puff < 3; puff++) {
            ctx.beginPath();
            ctx.arc(x - 18 + puff * 18, 115 - (puff % 2) * 12, 9, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(126, 164, 151, 0.55)';
            ctx.fill();
          }
        }
      }

      roundRect(ctx, 82, 375, 436, 28, 14, '#d7cab1');
      roundRect(ctx, 82 + 436 * TEA_TIMING.zone[0], 375, 436 * 0.2, 28, 14, '#efc969');
      const gauge = phase === 'play' ? heat() : 0;
      ctx.beginPath();
      ctx.arc(82 + 436 * gauge, 389, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#fff8e6';
      ctx.fill();
      ctx.strokeStyle = '#765f4e';
      ctx.lineWidth = 4;
      ctx.stroke();
      label(ctx, '适温', 82 + 436 * 0.72, 389, 12, '#75591e');

      roundRect(ctx, 50, 421, 500, 27, 14, '#fff8e7');
      label(ctx, message, 300, 435, 13, '#617064');
      label(ctx, '点茶壶 · A S D 选炉 · 左右键选择 · 空格揭盖', 300, 466, 12, '#76736a');
    },
    destroy() {
      finished = true;
      pressed = -1;
    },
  };
}
