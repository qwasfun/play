import { createCampaignGame } from './campaign-engine.js';
import { rng, roundRect, label } from '@playground/game-sdk';
export function createGame({ level: campaignLevel, seed, onFinish = () => {}, sound = () => {} }) {
  if (campaignLevel) return createCampaignGame({ level: campaignLevel, onFinish, sound });
  let elapsed = 0,
    score = 0,
    finished = false,
    won = false,
    cursor = 0,
    pressed = -1;
  const random = rng(`${seed}:windmill:v1`);
  let angle = 0,
    target = random() * Math.PI * 2,
    hits = 0,
    lives = 3;
  function finish(success = false) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score, elapsed, won, hits, lives });
  }
  function cell(p) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return -1;
    return p.x >= 60 && p.x <= 540 && p.y >= 65 && p.y <= 455 ? 0 : -1;
  }
  function act(i) {
    if (finished || i < 0) return;
    const delta = Math.abs(Math.atan2(Math.sin(angle - target), Math.cos(angle - target)));
    if (delta <= 0.32) {
      hits++;
      score = hits * 50;
      target = (target + 1.4 + random() * 2) % (Math.PI * 2);
      sound('win');
      if (hits === 12) finish(true);
    } else {
      lives--;
      sound('tap');
      if (!lives) finish();
    }
  }
  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      elapsed = Math.min(75, elapsed + dt);
      angle = (angle + dt * (1.5 + hits * 0.12)) % (Math.PI * 2);
      if (elapsed >= 75) finish();
    },
    input(type, p = {}) {
      if (type === 'primary-cancel') {
        pressed = -1;
        return;
      }
      if (finished) return;
      if (type === 'primary-down') pressed = cell(p);
      if (type === 'primary-up') {
        const i = cell(p);
        if (i === pressed) act(i);
        pressed = -1;
      }
      if (type === 'key-down' && !p.repeat) {
        const k = String(p.key).toLowerCase();
        if (k === ' ' || k === 'enter') act(0);
      }
    },
    getState() {
      return {
        elapsed,
        score,
        finished,
        won,
        cursor,
        angle,
        target,
        hits,
        lives,
        extra: `${hits} / 12`,
        hint: '指针进入金色扇区时采蜜',
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f5eddb';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '风车采蜜', 300, 32, 26);
      ctx.strokeStyle = '#e1d2b2';
      ctx.lineWidth = 35;
      ctx.beginPath();
      ctx.arc(300, 250, 145, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#e9b953';
      ctx.beginPath();
      ctx.arc(300, 250, 145, target - 0.32, target + 0.32);
      ctx.stroke();
      ctx.strokeStyle = '#658b78';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(300, 250);
      ctx.lineTo(300 + 140 * Math.cos(angle), 250 + 140 * Math.sin(angle));
      ctx.stroke();
      roundRect(ctx, 280, 230, 40, 40, 20, '#bc855d');
      label(ctx, `采蜜 ${hits}/12 · 机会 ${lives}`, 300, 430, 21);
    },
    destroy() {
      finished = true;
      pressed = -1;
    },
  };
}
