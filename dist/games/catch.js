import { rng, roundRect, label } from '../core.js';

const BASKET_Y = 405, BASKET_WIDTH = 104;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const direction = key => ['ArrowLeft', 'a', 'A'].includes(key) ? -1 : ['ArrowRight', 'd', 'D'].includes(key) ? 1 : 0;

export function generateHarvest(seed) {
  const random = rng(`${seed}:orchard`);
  const schedule = [];
  let time = 0.65;
  for (let index = 0; time < 56.8; index++) {
    const type = index % 5 === 4 ? 'rock' : 'fruit';
    schedule.push({
      id: index, time, type, x: 60 + random() * 480,
      speed: 125 + random() * 35 + time * 0.5,
      variety: Math.floor(random() * 3), rotation: random() * Math.PI,
    });
    time += 0.62 + random() * 0.22;
  }
  return schedule;
}

export function catchesAtRim(item, previousY, basketX) {
  const radius = item.type === 'rock' ? 16 : 15;
  return previousY + radius < BASKET_Y && item.y + radius >= BASKET_Y
    && Math.abs(item.x - basketX) <= BASKET_WIDTH / 2 + radius * 0.35;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const schedule = generateHarvest(seed);
  const keys = new Set();
  let basketX = 300, dragging = false, elapsed = 0, score = 0, lives = 3;
  let nextItem = 0, items = [], bubbles = [], flash = 0, done = false;

  function move(x) { if (Number.isFinite(x)) basketX = clamp(x, 62, 538); }
  function finish(reason) {
    if (done) return;
    done = true; dragging = false; keys.clear();
    onFinish({ score, elapsed, lives, won: lives > 0, reason });
  }

  return {
    update(dt) {
      if (done || !Number.isFinite(dt) || dt <= 0) return;
      const previousTime = elapsed;
      elapsed = Math.min(60, elapsed + dt);
      const step = elapsed - previousTime;
      if (!dragging) move(basketX + clamp([...keys].reduce((sum, key) => sum + direction(key), 0), -1, 1) * 440 * step);
      flash = Math.max(0, flash - step);
      for (const bubble of bubbles) bubble.life -= step;
      bubbles = bubbles.filter(bubble => bubble.life > 0);
      while (nextItem < schedule.length && schedule[nextItem].time <= elapsed) {
        const item = schedule[nextItem++];
        items.push({ ...item, y: -24 + item.speed * Math.max(0, previousTime - item.time), checked: false });
      }
      for (const item of items) {
        const previousY = item.y;
        // Newly spawned objects only fall for the part of this step after their spawn.
        item.y += item.speed * Math.min(step, Math.max(0, elapsed - item.time));
        if (!item.checked && item.y + (item.type === 'rock' ? 16 : 15) >= BASKET_Y) {
          item.checked = true;
          if (catchesAtRim(item, previousY, basketX)) {
            item.removed = true;
            if (item.type === 'fruit') {
              score += 10; sound('collect');
              bubbles.push({ x: item.x, life: 0.65, text: '+10', color: '#477553' });
            } else {
              lives--; flash = 0.45; sound('hit');
              bubbles.push({ x: item.x, life: 0.8, text: '躲开小石头', color: '#a55342' });
              if (!lives) { finish('lives'); return; }
            }
          }
        }
      }
      items = items.filter(item => !item.removed && item.y < 510);
      if (elapsed >= 60) { sound('win'); finish('time'); }
    },
    input(type, payload = {}) {
      if (done) return;
      if (type === 'primary-down') { dragging = true; move(payload.x); }
      if (type === 'primary-move' && dragging) move(payload.x);
      if (type === 'primary-up') { if (dragging) move(payload.x); dragging = false; }
      if (type === 'key-down' && direction(payload.key)) keys.add(payload.key);
      if (type === 'key-up') keys.delete(payload.key);
      if (type === 'primary-cancel') { dragging = false; keys.clear(); }
    },
    getState() {
      return {
        score, elapsed, lives, done, progress: elapsed / 60, extra: `${score / 10} 份收获`,
        basket: { x: basketX, y: BASKET_Y, width: BASKET_WIDTH, dragging },
        items: items.map(item => ({ ...item })),
        hint: '左右拖动篮子 / ← → · 接水果，躲石头',
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#fbecd7'; ctx.fillRect(0, 0, 600, 480);
      ctx.fillStyle = '#f5d99f'; ctx.beginPath(); ctx.arc(501, 103, 43, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#edcf98'; ctx.lineWidth = 2;
      for (let index = 0; index < 8; index++) {
        const angle = index * Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(501 + Math.cos(angle) * 52, 103 + Math.sin(angle) * 52); ctx.lineTo(501 + Math.cos(angle) * 60, 103 + Math.sin(angle) * 60); ctx.stroke();
      }
      for (const [x, y] of [[129, 99], [356, 63]]) {
        ctx.fillStyle = '#fffbeb'; ctx.beginPath(); ctx.ellipse(x, y, 49, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x - 11, y - 8, 25, 14, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#dbe3b8'; ctx.beginPath(); ctx.moveTo(0, 425); ctx.quadraticCurveTo(140, 320, 296, 421); ctx.quadraticCurveTo(452, 344, 600, 416); ctx.lineTo(600, 480); ctx.lineTo(0, 480); ctx.fill();
      ctx.fillStyle = '#b7c68c'; ctx.fillRect(0, 450, 600, 30);
      for (const side of [-18, 619]) {
        roundRect(ctx, side - 9, 292, 18, 170, 7, '#be9467');
        ctx.fillStyle = '#a8bf8a'; ctx.beginPath(); ctx.arc(side, 313, 58, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#bfd099'; ctx.beginPath(); ctx.arc(side - 11, 288, 42, 0, Math.PI * 2); ctx.fill();
      }
      roundRect(ctx, 20, 18, 143, 32, 16, '#fff9eb');
      label(ctx, `${score / 10} 份甜甜的收获`, 91, 35, 13, '#8b7151');
      label(ctx, '水果 +10  /  石头 −1 次', 576, 35, 12, '#947c61', 'right');
      for (const item of items) {
        if (item.y > 451) continue;
        ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(Math.sin(item.rotation + elapsed * 2) * 0.12);
        if (item.type === 'rock') {
          ctx.fillStyle = '#697580'; ctx.strokeStyle = '#f9f0db'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(-17, -5); ctx.lineTo(-8, -17); ctx.lineTo(8, -15); ctx.lineTo(18, -2); ctx.lineTo(12, 13); ctx.lineTo(-8, 17); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = '#bac1c5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.moveTo(5, -5); ctx.lineTo(-5, 5); ctx.stroke();
        } else if (item.variety === 2) {
          ctx.fillStyle = '#d5b64d'; ctx.beginPath(); ctx.moveTo(0, -15); ctx.bezierCurveTo(-9, -16, -5, -5, -13, 5); ctx.bezierCurveTo(-20, 22, 20, 22, 13, 5); ctx.bezierCurveTo(5, -5, 9, -16, 0, -15); ctx.fill();
          ctx.fillStyle = '#f1d875'; ctx.beginPath(); ctx.ellipse(-5, 6, 3, 6, -0.3, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = item.variety ? '#eda258' : '#d97d68';
          ctx.beginPath(); ctx.arc(0, 2, 16, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = item.variety ? '#f7c584' : '#eda28a';
          ctx.beginPath(); ctx.ellipse(-6, -3, 4, 6, 0.35, 0, Math.PI * 2); ctx.fill();
        }
        if (item.type === 'fruit') {
          ctx.strokeStyle = '#846c42'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(2, -21); ctx.stroke();
          ctx.fillStyle = '#6f9460'; ctx.beginPath(); ctx.ellipse(8, -17, 7, 3.5, -0.45, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      const shake = flash > 0 ? Math.sin(flash * 60) * 3 : 0;
      ctx.save(); ctx.translate(basketX + shake, BASKET_Y);
      ctx.fillStyle = '#788b5a44'; ctx.beginPath(); ctx.ellipse(0, 47, 56, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ad7e4d'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(0, 1, 38, 26, 0, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = flash > 0 ? '#d9957b' : '#cf9c60';
      ctx.beginPath(); ctx.moveTo(-50, 3); ctx.lineTo(50, 3); ctx.lineTo(39, 39); ctx.quadraticCurveTo(0, 51, -39, 39); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.clip(); ctx.strokeStyle = '#b98750'; ctx.lineWidth = 2;
      for (let x = -55; x < 65; x += 13) { ctx.beginPath(); ctx.moveTo(x, 3); ctx.lineTo(x + 12, 47); ctx.stroke(); }
      for (let y = 13; y < 46; y += 11) { ctx.beginPath(); ctx.moveTo(-50, y); ctx.lineTo(50, y); ctx.stroke(); }
      ctx.restore();
      roundRect(ctx, -54, -1, 108, 12, 5, flash > 0 ? '#bf7b63' : '#b88750');
      ctx.restore();
      for (const bubble of bubbles) {
        ctx.save(); ctx.globalAlpha = Math.min(1, bubble.life * 3);
        label(ctx, bubble.text, bubble.x, BASKET_Y - 34 - (0.8 - bubble.life) * 28, 17, bubble.color, 'center', 800); ctx.restore();
      }
      label(ctx, '左右拖动接水果 · 小石头要躲开', 300, 469, 12, '#66794e');
    },
    destroy() { done = true; dragging = false; keys.clear(); }
  };
}
