import { createCampaignGame } from './campaign-engine.js';
import { rng, roundRect, label } from '@playground/game-sdk';

const LIMIT = 50,
  TARGET = 32,
  WINDOW = 0.19,
  PERFECT = 0.08,
  LEAD = 2;
const LEFT = 68,
  WIDTH = 116,
  TOP = 58,
  HIT_Y = 361;
const KEYS = ['← / A', '↑ / W', '↓ / S', '→ / D'];
const ARROWS = ['←', '↑', '↓', '→'];
const COLORS = ['#91bca4', '#f0cd7c', '#e99f8b', '#b6a5cf'];
const DARK = ['#3e765d', '#a48438', '#aa6657', '#7c6998'];

export function generateRhythmSchedule(seed) {
  const random = rng(`${seed}:little-beat`);
  let time = 2.4;
  return Array.from({ length: TARGET }, (_, index) => {
    const note = { id: index, lane: Math.floor(random() * 4), time };
    time += index % 8 === 7 ? 1.2 : 0.78 + Math.floor(random() * 3) * 0.08;
    return note;
  });
}

export function rhythmLaneAt(x, y) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < LEFT ||
    x >= LEFT + WIDTH * 4 ||
    y < TOP ||
    y > 451
  )
    return -1;
  return Math.floor((x - LEFT) / WIDTH);
}

export function createGame({ level: campaignLevel, seed, onFinish = () => {}, sound = () => {} }) {
  if (campaignLevel) return createCampaignGame({ level: campaignLevel, onFinish, sound });
  const schedule = generateRhythmSchedule(seed);
  const states = Array(TARGET).fill('waiting');
  let elapsed = 0,
    score = 0,
    lives = 5,
    hits = 0,
    perfects = 0,
    combo = 0,
    bestCombo = 0,
    finished = false,
    won = false;
  let message = '音符靠近横线时，点亮同一条轨道',
    feedback = -1,
    feedbackTime = 0,
    feedbackKind = '';
  function finish(reason) {
    if (finished) return;
    finished = true;
    onFinish({ score, elapsed, lives, hits, perfects, combo: bestCombo, won, reason });
  }
  function settle() {
    if (states.every((state) => state !== 'waiting')) {
      won = lives > 0;
      sound(won ? 'win' : 'hit');
      finish('complete');
    }
  }
  function miss(lane, kind = 'miss') {
    lives--;
    combo = 0;
    feedback = lane;
    feedbackTime = 0.24;
    feedbackKind = kind;
    message = kind === 'wrong' ? '这一拍没对上，等音符到横线再点' : '漏了一颗音符，跟上下一拍';
    sound('hit');
    if (lives <= 0) finish('lives');
  }
  function hit(lane) {
    if (finished || lane < 0 || lane > 3) return;
    let closest = -1,
      error = Infinity;
    for (let i = 0; i < TARGET; i++) {
      if (states[i] !== 'waiting' || schedule[i].lane !== lane) continue;
      const distance = Math.abs(schedule[i].time - elapsed);
      if (distance < error) {
        closest = i;
        error = distance;
      }
    }
    if (closest < 0 || error > WINDOW + 1e-9) {
      miss(lane, 'wrong');
      return;
    }
    const perfect = error <= PERFECT + 1e-9;
    states[closest] = perfect ? 'perfect' : 'good';
    hits++;
    if (perfect) perfects++;
    score += perfect ? 100 : 50;
    combo++;
    bestCombo = Math.max(bestCombo, combo);
    feedback = lane;
    feedbackTime = 0.23;
    feedbackKind = perfect ? 'perfect' : 'good';
    message = perfect ? '正中节拍 · +100' : '接住了 · +50';
    sound('collect');
    settle();
  }
  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      const end = Math.min(LIMIT, elapsed + dt);
      feedbackTime = Math.max(0, feedbackTime - dt);
      // Resolve missed beats in timeline order, even after a long frame.
      for (let i = 0; i < TARGET && !finished; i++) {
        if (states[i] !== 'waiting' || end <= schedule[i].time + WINDOW + 1e-9) continue;
        elapsed = schedule[i].time + WINDOW;
        states[i] = 'miss';
        miss(schedule[i].lane);
      }
      if (finished) return;
      elapsed = end;
      settle();
      if (!finished && elapsed >= LIMIT) finish('time');
    },
    input(type, payload = {}) {
      if (type === 'primary-down') hit(rhythmLaneAt(payload.x, payload.y));
      if (type !== 'key-down' || payload.repeat) return;
      const key = String(payload.key).toLowerCase();
      const lane = {
        arrowleft: 0,
        a: 0,
        arrowup: 1,
        w: 1,
        arrowdown: 2,
        s: 2,
        arrowright: 3,
        d: 3,
      }[key];
      if (lane !== undefined) hit(lane);
    },
    getState() {
      return {
        score,
        elapsed,
        lives,
        hits,
        perfects,
        combo,
        bestCombo,
        finished,
        won,
        extra: `${hits} / ${TARGET}`,
        hint: message,
        schedule: schedule.map((note) => ({ ...note })),
        notes: schedule.map((note, index) => ({
          ...note,
          state: states[index],
          y: HIT_Y - ((note.time - elapsed) * (HIT_Y - TOP)) / LEAD,
        })),
        feedback,
        feedbackKind,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#283f45';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, 'LITTLE BEAT CLUB', 28, 28, 11, '#b2c4bb', 'left', 750);
      label(ctx, `${hits} / ${TARGET} 颗星光`, 572, 29, 13, '#d3dacf', 'right', 600);
      for (let lane = 0; lane < 4; lane++) {
        const x = LEFT + lane * WIDTH;
        roundRect(ctx, x + 3, TOP, WIDTH - 6, 393, 15, lane % 2 ? '#344a50' : '#30464b');
        const lit = feedback === lane && feedbackTime > 0;
        if (lit) {
          ctx.globalAlpha = feedbackKind === 'wrong' || feedbackKind === 'miss' ? 0.18 : 0.12;
          roundRect(ctx, x + 3, TOP, WIDTH - 6, 393, 15, COLORS[lane]);
          ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = '#526468';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 8]);
        ctx.beginPath();
        ctx.moveTo(x + WIDTH / 2, TOP + 11);
        ctx.lineTo(x + WIDTH / 2, 391);
        ctx.stroke();
        ctx.setLineDash([]);
        roundRect(ctx, x + 9, 391, WIDTH - 18, 54, 13, lit ? COLORS[lane] : DARK[lane]);
        label(
          ctx,
          ARROWS[lane],
          x + WIDTH / 2,
          414,
          24,
          lit ? '#253f3b' : '#fff6df',
          'center',
          800,
        );
        label(ctx, KEYS[lane], x + WIDTH / 2, 435, 10, lit ? '#36524b' : '#f1ebd8', 'center', 650);
      }
      ctx.fillStyle = '#fcf3c7';
      ctx.globalAlpha = 0.12;
      ctx.fillRect(LEFT, HIT_Y - 15, WIDTH * 4, 30);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#e6dbaf';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(LEFT, HIT_Y);
      ctx.lineTo(LEFT + WIDTH * 4, HIT_Y);
      ctx.stroke();
      label(ctx, '♪', 35, HIT_Y, 28, '#f0d18a', 'center', 750);
      label(ctx, '♪', 565, HIT_Y, 28, '#f0d18a', 'center', 750);
      for (let i = 0; i < TARGET; i++) {
        if (states[i] !== 'waiting') continue;
        const note = schedule[i],
          ahead = note.time - elapsed;
        if (ahead > LEAD || ahead < -WINDOW) continue;
        const x = LEFT + note.lane * WIDTH + WIDTH / 2,
          y = HIT_Y - (ahead * (HIT_Y - TOP)) / LEAD;
        ctx.save();
        ctx.globalAlpha = Math.min(1, Math.max(0, (LEAD - ahead) * 4));
        ctx.shadowColor = COLORS[note.lane];
        ctx.shadowBlur = ahead < 0.2 ? 12 : 0;
        roundRect(ctx, x - 37, y - 20, 74, 40, 13, DARK[note.lane]);
        roundRect(ctx, x - 37, y - 24, 74, 40, 13, COLORS[note.lane]);
        ctx.shadowBlur = 0;
        label(ctx, ARROWS[note.lane], x, y - 3, 26, '#2e4a43', 'center', 800);
        ctx.restore();
      }
      if (feedbackTime > 0) {
        label(
          ctx,
          feedbackKind === 'perfect' ? 'PERFECT' : feedbackKind === 'good' ? 'GOOD' : '再跟一拍',
          300,
          92,
          22,
          feedbackKind === 'wrong' || feedbackKind === 'miss' ? '#e6a48f' : '#f3df9f',
          'center',
          800,
        );
      } else if (elapsed < 1.5) {
        label(ctx, '等音符落到横线，再点击同一轨道', 300, 114, 16, '#dce5d7', 'center', 600);
      }
      if (combo > 1) label(ctx, `${combo} 连击`, 300, 143, 14, '#b5c9ba', 'center', 700);
      label(ctx, message, 300, 467, 12, '#b9cbbf', 'center', 500);
    },
    destroy() {
      finished = true;
    },
  };
}
