import { label, roundRect } from '@playground/game-sdk';
import { GARDEN_SPRINKLER, generateCourse } from './course.js';

export { GARDEN_SPRINKLER, generateCourse, responseWindow } from './course.js';

const CENTER_X = 300;
const CENTER_Y = 220;
const POT_RADIUS = 136;
const POT_HIT = 34;

export function potPoint(slot) {
  const angle = -Math.PI / 2 + (slot * Math.PI * 2) / GARDEN_SPRINKLER.pots;
  return {
    x: CENTER_X + Math.cos(angle) * POT_RADIUS,
    y: CENTER_Y + Math.sin(angle) * POT_RADIUS,
  };
}

function potAt(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return -1;
  let closest = -1;
  let distance = Infinity;
  for (let slot = 0; slot < GARDEN_SPRINKLER.pots; slot++) {
    const target = potPoint(slot);
    const next = Math.hypot(point.x - target.x, point.y - target.y);
    if (next < distance) [closest, distance] = [slot, next];
  }
  return distance <= POT_HIT ? closest : -1;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const course = generateCourse(seed);
  let round = 0;
  let watered = 0;
  let selected = 0;
  let lives = GARDEN_SPRINKLER.lives;
  let shots = 0;
  let elapsed = 0;
  let phase = 'reveal';
  let phaseLeft = GARDEN_SPRINKLER.reveal;
  let activeLeft = course[0].window;
  let pressed = -1;
  let finished = false;
  let won = false;
  let spraySlot = -1;
  let sprayLeft = 0;
  let message = '看看哪只花盆亮起金色水滴';

  const target = () => course[Math.min(round, course.length - 1)];

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    message = success
      ? '十二盆小花都喝饱啦，花圃里升起一阵清凉的香气！'
      : '叶片轻轻合上了，休息一下再来浇花吧';
    onFinish({ score: watered * GARDEN_SPRINKLER.score, elapsed, won, watered, shots, lives });
  }

  function prepare(delay, text) {
    phase = 'reveal';
    phaseLeft = delay;
    activeLeft = target().window;
    message = text;
  }

  function loseLeaf(reason) {
    lives--;
    sound('hit');
    if (lives === 0) {
      finish(false);
      return;
    }
    prepare(0.62, `${reason}，还剩 ${lives} 片叶子；再看准金色水滴`);
  }

  function spray(slot) {
    if (finished || phase !== 'active' || slot < 0 || slot >= GARDEN_SPRINKLER.pots) return;
    selected = slot;
    shots++;
    spraySlot = slot;
    sprayLeft = 0.24;
    if (slot !== target().pot) {
      loseLeaf('水珠落进了空花盆');
      return;
    }
    watered++;
    sound('win');
    if (watered === GARDEN_SPRINKLER.rounds) {
      finish(true);
      return;
    }
    round++;
    prepare(GARDEN_SPRINKLER.reveal, `第 ${watered} 盆小花舒展开啦，找找下一滴金光`);
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, GARDEN_SPRINKLER.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        if (sprayLeft > 0) sprayLeft = Math.max(0, sprayLeft - remaining);
        if (phase === 'reveal') {
          const step = Math.min(remaining, phaseLeft);
          elapsed += step;
          phaseLeft -= step;
          remaining -= step;
          if (phaseLeft <= 1e-9) {
            phase = 'active';
            activeLeft = target().window;
            message = '金色水滴亮起来了，快把花洒转向它！';
          }
          continue;
        }
        const step = Math.min(remaining, activeLeft);
        elapsed += step;
        activeLeft -= step;
        remaining -= step;
        if (activeLeft <= 1e-9) loseLeaf('金色水滴悄悄收拢了');
      }
      if (!finished && elapsed >= GARDEN_SPRINKLER.limit - 1e-9) finish(false);
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = -1;
        return;
      }
      if (finished || phase !== 'active') return;
      if (type === 'primary-down') pressed = potAt(payload);
      if (type === 'primary-up') {
        const slot = potAt(payload);
        if (slot === pressed) spray(slot);
        pressed = -1;
      }
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (key === 'arrowleft' || key === 'a')
          selected = (selected + GARDEN_SPRINKLER.pots - 1) % GARDEN_SPRINKLER.pots;
        if (key === 'arrowright' || key === 'd') selected = (selected + 1) % GARDEN_SPRINKLER.pots;
        if (key === ' ' || key === 'space' || key === 'spacebar' || key === 'enter')
          spray(selected);
      }
    },
    getState() {
      return {
        elapsed,
        score: watered * GARDEN_SPRINKLER.score,
        watered,
        round,
        selected,
        target: { ...target() },
        lives,
        shots,
        phase,
        activeLeft,
        finished,
        won,
        extra: `${watered} / ${GARDEN_SPRINKLER.rounds} · ${'●'.repeat(lives)}${'○'.repeat(GARDEN_SPRINKLER.lives - lives)}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f4eadc';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '花洒浇园', 107, 31, 25);
      label(ctx, `${watered * GARDEN_SPRINKLER.score} 分 · 叶子 ${lives}`, 478, 31, 15, '#6d665d');
      roundRect(ctx, 24, 53, 552, 364, 30, '#c8b69c');
      roundRect(ctx, 32, 61, 536, 348, 24, '#eff1d3');

      ctx.strokeStyle = '#c5d3ad';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, POT_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      for (let slot = 0; slot < GARDEN_SPRINKLER.pots; slot++) drawPot(ctx, slot);
      drawSprinkler(ctx);

      if (phase === 'active') {
        const ratio = Math.max(0, activeLeft / target().window);
        ctx.strokeStyle = '#e6b452';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, 49, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
        ctx.stroke();
      }

      roundRect(ctx, 57, 431, 486, 27, 14, '#fff9e9');
      label(ctx, message, 300, 444, 12, '#665f57');
      label(ctx, '点亮起的花盆 · 左右键或 A/D 转向 · 空格喷水', 300, 472, 11, '#756e65');
    },
    destroy() {
      finished = true;
      pressed = -1;
    },
  };

  function drawPot(ctx, slot) {
    const point = potPoint(slot);
    const active = phase === 'active' && slot === target().pot;
    const selectedPot = slot === selected;
    if (active) {
      ctx.fillStyle = 'rgba(239,190,92,.28)';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 38, 0, Math.PI * 2);
      ctx.fill();
    }
    roundRect(ctx, point.x - 27, point.y - 18, 54, 38, 13, active ? '#e89a87' : '#d49a83');
    ctx.strokeStyle = selectedPot ? '#547c72' : '#a97668';
    ctx.lineWidth = selectedPot ? 5 : 2;
    ctx.stroke();
    ctx.strokeStyle = '#71926f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y - 16);
    ctx.lineTo(point.x, point.y - 31);
    ctx.stroke();
    ctx.fillStyle = active ? '#efc45d' : '#8fad83';
    ctx.beginPath();
    ctx.arc(point.x, point.y - 34, active ? 10 : 7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSprinkler(ctx) {
    const angle = -Math.PI / 2 + (selected * Math.PI * 2) / GARDEN_SPRINKLER.pots;
    ctx.fillStyle = '#74a9a0';
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4f7972';
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CENTER_X, CENTER_Y);
    ctx.lineTo(CENTER_X + Math.cos(angle) * 78, CENTER_Y + Math.sin(angle) * 78);
    ctx.stroke();
    if (sprayLeft > 0) {
      ctx.fillStyle = '#6cbcc5';
      const end = potPoint(spraySlot);
      for (let index = 0; index < 4; index++) {
        const t = 0.55 + index * 0.1;
        ctx.beginPath();
        ctx.arc(
          CENTER_X + (end.x - CENTER_X) * t,
          CENTER_Y + (end.y - CENTER_Y) * t,
          5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
}
