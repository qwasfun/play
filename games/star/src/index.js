import {generateStarSchedule} from './model.js';
import { rng, roundRect, label } from '@playground/game-sdk';

const TAU = Math.PI * 2;
const RADII = [112, 175];
const CX = 300, CY = 245;
const SPACE = new Set([' ', 'Space', 'Spacebar']);

export {generateStarSchedule} from './model.js';

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const schedule = generateStarSchedule(seed);
  const stars = Array.from({ length: 54 }, (_, index) => {
    const random = rng(`${seed}:sky:${index}`);
    return { x: 22 + random() * 556, y: 20 + random() * 420, radius: random() * 1.5 + 0.5 };
  });
  let elapsed = 0, score = 0, lives = 3, lane = 1, radius = RADII[1];
  let nextEvent = 0, done = false, flash = 0, notice = '收集信件，避开碎石', noticeTime = 3;

  function finish(reason) {
    if (done) return;
    done = true;
    onFinish({ score, elapsed, lives, won: lives > 0, reason });
  }

  function switchLane() {
    if (done) return;
    lane = 1 - lane;
    sound('tap');
  }

  return {
    update(dt) {
      if (done) return;
      elapsed = Math.min(60, elapsed + dt);
      radius += (RADII[lane] - radius) * Math.min(1, dt * 17);
      flash = Math.max(0, flash - dt);
      noticeTime = Math.max(0, noticeTime - dt);
      while (nextEvent < schedule.length && schedule[nextEvent].time <= elapsed) {
        const event = schedule[nextEvent++];
        if (event.lane !== lane) continue;
        if (event.type === 'mail') {
          score += 10;
          notice = '+10  信件已签收'; noticeTime = 0.65;
          sound('collect');
        } else {
          lives--;
          flash = 0.4;
          notice = lives > 0 ? '碰到碎石了！换条轨道' : '飞船需要休息一下'; noticeTime = 1.1;
          sound('hit');
          if (lives === 0) { finish('lives'); return; }
        }
      }
      if (elapsed >= 60) { sound('win'); finish('time'); }
    },
    input(type, payload = {}) {
      if (type === 'primary-down' || (type === 'key-down' && SPACE.has(payload.key) && !payload.repeat)) switchLane();
    },
    getState() {
      return { score, elapsed, lives, progress: Math.min(1, elapsed / 60), lane, done, hint: '点击 / 空格 · 切换轨道' };
    },
    draw(ctx) {
      ctx.fillStyle = '#153e43'; ctx.fillRect(0, 0, 600, 480);
      for (const star of stars) {
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(star.x + elapsed);
        ctx.fillStyle = '#c7ddd2'; ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const r of RADII) {
        ctx.strokeStyle = '#427078'; ctx.lineWidth = 2; ctx.setLineDash([4, 9]);
        ctx.beginPath(); ctx.arc(CX, CY, r, 0, TAU); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = '#24565b'; ctx.beginPath(); ctx.arc(CX, CY, 76, 0, TAU); ctx.fill();
      ctx.fillStyle = '#347075'; ctx.beginPath(); ctx.arc(CX - 14, CY - 13, 56, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(CX, CY - 2); ctx.rotate(-0.13);
      roundRect(ctx, -31, -23, 62, 46, 9, '#f5d885');
      ctx.strokeStyle = '#ae8547'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-27, -18); ctx.lineTo(0, 2); ctx.lineTo(27, -18); ctx.stroke();
      ctx.restore();
      label(ctx, 'ORBIT POST', CX, CY + 99, 10, '#8eb9b5', 'center', 700);
      const angle = -Math.PI / 2 + elapsed * 0.88;
      for (let i = nextEvent; i < schedule.length; i++) {
        const event = schedule[i];
        const ahead = event.time - elapsed;
        if (ahead > 3.5) break;
        const a = angle + ahead * 0.88;
        const r = RADII[event.lane];
        const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
        ctx.globalAlpha = Math.min(1, (3.5 - ahead) * 2);
        if (event.type === 'mail') {
          ctx.shadowColor = '#f3d47b'; ctx.shadowBlur = 12;
          roundRect(ctx, -13, -10, 26, 20, 4, '#ffdc7b');
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#9c702e'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(0, 1); ctx.lineTo(10, -6); ctx.stroke();
        } else {
          ctx.fillStyle = '#d28b78'; ctx.strokeStyle = '#f0b49c'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-13, -8); ctx.lineTo(-5, -15); ctx.lineTo(10, -11); ctx.lineTo(15, 2); ctx.lineTo(7, 13); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#aa695d'; ctx.beginPath(); ctx.arc(-3, 0, 4, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
      for (let i = 7; i > 0; i--) {
        const a = angle - i * 0.045;
        ctx.globalAlpha = (1 - i / 8) * 0.26;
        ctx.fillStyle = '#7ed4e4'; ctx.beginPath(); ctx.arc(CX + Math.cos(a) * radius, CY + Math.sin(a) * radius, 8 - i * 0.5, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(CX + Math.cos(angle) * radius, CY + Math.sin(angle) * radius); ctx.rotate(angle + Math.PI / 2);
      ctx.shadowBlur = 18; ctx.shadowColor = '#80cbd7';
      ctx.fillStyle = flash > 0 ? '#ffb89b' : '#8ed9e8';
      ctx.beginPath(); ctx.moveTo(0, -21); ctx.quadraticCurveTo(8, -11, 16, 14); ctx.lineTo(0, 8); ctx.lineTo(-16, 14); ctx.quadraticCurveTo(-8, -11, 0, -21); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#fdf4db'; ctx.beginPath(); ctx.ellipse(0, -3, 5, 8, 0, 0, TAU); ctx.fill(); ctx.restore();
      roundRect(ctx, 20, 18, 122, 33, 16, '#27575a');
      label(ctx, `${Math.max(0, Math.ceil(60 - elapsed))} 秒送信时间`, 81, 40, 13, '#d7e9df');
      label(ctx, '● '.repeat(lives).trim(), 559, 40, 17, '#efae92', 'right');
      roundRect(ctx, 114, 438, 372, 29, 14, '#24575b');
      label(ctx, noticeTime > 0 ? notice : '点击 / 空格 · 切换内外轨道', 300, 458, 13, '#e8eed9');
      if (flash > 0) { ctx.fillStyle = `rgba(246,127,106,${flash * 0.2})`; ctx.fillRect(0, 0, 600, 480); }
    },
    destroy() { done = true; }
  };
}
