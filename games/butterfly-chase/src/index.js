import { label, roundRect } from '@playground/game-sdk';
import { BUTTERFLY_CHASE, generateGarden, responseWindow, TRAITS } from './course.js';

export { BUTTERFLY_CHASE, generateGarden, responseWindow, TRAITS } from './course.js';

const leftKeys = new Set(['ArrowLeft', 'a']);
const rightKeys = new Set(['ArrowRight', 'd']);
const upKeys = new Set(['ArrowUp', 'w']);
const downKeys = new Set(['ArrowDown', 's']);
const catchKeys = new Set([' ', 'Enter']);
const validPoint = (point) =>
  Number.isFinite(point?.x) &&
  Number.isFinite(point?.y) &&
  point.x >= 0 &&
  point.x <= 600 &&
  point.y >= 0 &&
  point.y <= 480;

function copyButterflies(butterflies) {
  return butterflies.map((butterfly) => ({ ...butterfly }));
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const keys = new Set();
  const net = { x: 300, y: 405 };
  let elapsed = 0;
  let score = 0;
  let progress = 0;
  let lives = BUTTERFLY_CHASE.lives;
  let phase = 'chase';
  let transition = 0;
  let roundLeft = responseWindow(0);
  let garden = generateGarden(seed, 0);
  let butterflies = copyButterflies(garden.butterflies);
  let finished = false;
  let won = false;
  let pulse = 0;
  let message = `请找 ${TRAITS[garden.target].name}，看清颜色和翅纹`;

  function clearInput() {
    keys.clear();
  }

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    clearInput();
    onFinish({ score, elapsed, won, progress, lives });
  }

  function loadRound() {
    garden = generateGarden(seed, progress);
    butterflies = copyButterflies(garden.butterflies);
    roundLeft = responseWindow(progress);
    phase = 'chase';
    message = `请找 ${TRAITS[garden.target].name}，看清颜色和翅纹`;
  }

  function collect() {
    progress++;
    score = progress * 100;
    pulse = 1;
    sound('collect');
    if (progress === BUTTERFLY_CHASE.total) {
      message = '十二只花蝶都找到啦，花香一路跟来了！';
      sound('win');
      finish(true);
      return;
    }
    phase = 'rest';
    transition = BUTTERFLY_CHASE.bloomTime;
    message = '找到啦，下一张花笺正在展开';
  }

  function miss(reason) {
    lives--;
    pulse = -1;
    clearInput();
    sound('hit');
    message = reason;
    if (lives === 0) {
      finish(false);
      return;
    }
    phase = 'rest';
    transition = BUTTERFLY_CHASE.resetTime;
  }

  function attempt() {
    if (finished || phase !== 'chase') return;
    let closest = null;
    let distance = Infinity;
    for (const butterfly of butterflies) {
      const next = Math.hypot(net.x - butterfly.x, net.y - butterfly.y);
      if (next < distance) {
        closest = butterfly;
        distance = next;
      }
    }
    if (distance > BUTTERFLY_CHASE.catchRadius) {
      miss('花环落空啦，稳一稳再看清蝶影');
      return;
    }
    if (closest.id !== garden.target) {
      miss(`这是${TRAITS[closest.id].name}，花笺要找的不是它`);
      return;
    }
    collect();
  }

  function stepChase(dt) {
    const horizontal =
      ([...keys].some((key) => leftKeys.has(key)) ? -1 : 0) +
      ([...keys].some((key) => rightKeys.has(key)) ? 1 : 0);
    const vertical =
      ([...keys].some((key) => upKeys.has(key)) ? -1 : 0) +
      ([...keys].some((key) => downKeys.has(key)) ? 1 : 0);
    const length = Math.hypot(horizontal, vertical) || 1;
    net.x = Math.max(
      42,
      Math.min(558, net.x + (horizontal / length) * BUTTERFLY_CHASE.netSpeed * dt),
    );
    net.y = Math.max(
      95,
      Math.min(425, net.y + (vertical / length) * BUTTERFLY_CHASE.netSpeed * dt),
    );
    for (const butterfly of butterflies) {
      butterfly.x += butterfly.vx * dt;
      butterfly.y += butterfly.vy * dt;
      if (butterfly.x < 64 || butterfly.x > 536) {
        butterfly.x = Math.max(64, Math.min(536, butterfly.x));
        butterfly.vx *= -1;
      }
      if (butterfly.y < 112 || butterfly.y > 344) {
        butterfly.y = Math.max(112, Math.min(344, butterfly.y));
        butterfly.vy *= -1;
      }
    }
    roundLeft -= dt;
    if (roundLeft <= 0) miss('这只蝶影飞远啦，花笺重新为你指路');
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, BUTTERFLY_CHASE.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        const step = Math.min(remaining, 0.02);
        remaining -= step;
        elapsed += step;
        pulse += (0 - pulse) * Math.min(1, step * 5);
        if (phase === 'chase') stepChase(step);
        else {
          transition -= step;
          if (transition <= 0) loadRound();
        }
        if (!finished && elapsed >= BUTTERFLY_CHASE.limit) finish(false);
      }
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        clearInput();
        return;
      }
      if (type === 'key-up') {
        keys.delete(payload.key);
        return;
      }
      if (finished || phase !== 'chase') return;
      if (type === 'primary-move' && validPoint(payload)) {
        net.x = payload.x;
        net.y = payload.y;
      }
      if (type === 'primary-down' && validPoint(payload)) {
        net.x = payload.x;
        net.y = payload.y;
        attempt();
      }
      if (type === 'key-down' && !payload.repeat) {
        if (
          leftKeys.has(payload.key) ||
          rightKeys.has(payload.key) ||
          upKeys.has(payload.key) ||
          downKeys.has(payload.key)
        )
          keys.add(payload.key);
        if (catchKeys.has(payload.key)) attempt();
      }
    },
    getState() {
      return {
        elapsed,
        score,
        progress,
        lives,
        net: { ...net },
        butterflies: copyButterflies(butterflies),
        target: garden.target,
        targetName: TRAITS[garden.target].name,
        roundLeft,
        phase,
        finished,
        won,
        extra: `${progress} / ${BUTTERFLY_CHASE.total} · 机会 ${lives}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f2eadb';
      ctx.fillRect(0, 0, 600, 480);
      const sky = ctx.createLinearGradient(0, 60, 0, 440);
      sky.addColorStop(0, '#e7eddf');
      sky.addColorStop(1, '#b8d1b6');
      roundRect(ctx, 22, 70, 556, 360, 34, sky);
      label(ctx, '蝶影寻芳', 103, 33, 23);
      label(ctx, `寻芳 ${progress}/12 · 机会 ${lives}`, 480, 33, 16, '#587060');

      ctx.fillStyle = '#fff8e9';
      roundRect(ctx, 176, 82, 248, 54, 22);
      label(ctx, '花笺请找', 236, 109, 14, '#80674f');
      drawButterfly(ctx, { id: garden.target, x: 326, y: 109 }, elapsed, 0.58);
      label(ctx, TRAITS[garden.target].name, 386, 109, 14, '#5e6256');

      ctx.fillStyle = '#86aa86';
      ctx.beginPath();
      ctx.ellipse(102, 385, 86, 38, -0.12, 0, Math.PI * 2);
      ctx.ellipse(498, 388, 95, 42, 0.1, 0, Math.PI * 2);
      ctx.fill();
      for (const [x, y, color] of [
        [72, 358, '#d98278'],
        [138, 397, '#d2a348'],
        [470, 363, '#8d7fa4'],
        [529, 402, '#d98278'],
      ]) {
        ctx.fillStyle = color;
        for (let petal = 0; petal < 5; petal++) {
          const angle = (petal * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.ellipse(
            x + Math.cos(angle) * 10,
            y + Math.sin(angle) * 10,
            9,
            5,
            angle,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }

      for (const butterfly of butterflies) drawButterfly(ctx, butterfly, elapsed, 1);

      ctx.save();
      ctx.translate(net.x, net.y);
      ctx.strokeStyle = pulse < 0 ? '#c36f67' : pulse > 0 ? '#e0b74d' : '#9b7459';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, 0, 35 + Math.abs(pulse) * 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#86634e';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(25, 25);
      ctx.lineTo(72, 72);
      ctx.stroke();
      ctx.restore();

      label(ctx, `${Math.max(0, roundLeft).toFixed(1)} 秒`, 514, 451, 14, '#667767');
    },
    destroy() {
      finished = true;
      clearInput();
    },
  };
}

function drawButterfly(ctx, butterfly, elapsed, scale) {
  const trait = TRAITS[butterfly.id];
  const flap = 0.82 + Math.sin(elapsed * 8 + butterfly.id) * 0.14;
  ctx.save();
  ctx.translate(butterfly.x, butterfly.y);
  ctx.scale(scale, scale);
  ctx.fillStyle = trait.color;
  ctx.beginPath();
  ctx.ellipse(-17, -7, 22 * flap, 15, -0.35, 0, Math.PI * 2);
  ctx.ellipse(17, -7, 22 * flap, 15, 0.35, 0, Math.PI * 2);
  ctx.ellipse(-13, 13, 15 * flap, 11, 0.35, 0, Math.PI * 2);
  ctx.ellipse(13, 13, 15 * flap, 11, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = trait.accent;
  ctx.fillStyle = trait.accent;
  ctx.lineWidth = 4;
  if (trait.mark === 'dot') {
    ctx.beginPath();
    ctx.arc(-19, -7, 4, 0, Math.PI * 2);
    ctx.arc(19, -7, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (trait.mark === 'stripe') {
    ctx.beginPath();
    ctx.moveTo(-31, -12);
    ctx.lineTo(-8, -2);
    ctx.moveTo(31, -12);
    ctx.lineTo(8, -2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-18, -8, 8, -Math.PI / 2, Math.PI / 2);
    ctx.arc(18, -8, 8, Math.PI / 2, -Math.PI / 2);
    ctx.stroke();
  }
  ctx.strokeStyle = '#594f49';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(0, 20);
  ctx.stroke();
  ctx.restore();
}
