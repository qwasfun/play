import { label, roundRect } from '@playground/game-sdk';
import { ACORN_SHUFFLE, generateRounds, SLOT_X, swapDuration } from './course.js';

export {
  ACORN_SHUFFLE,
  finalSlot,
  generateRounds,
  SLOT_X,
  swapCount,
  swapDuration,
} from './course.js';

const leftKeys = new Set(['arrowleft', 'a']);
const rightKeys = new Set(['arrowright', 'd']);
const confirmKeys = new Set([' ', 'space', 'spacebar', 'enter']);

function numberSlot(key) {
  const match = /^(?:digit|numpad)?([123])$/.exec(key);
  return match ? Number(match[1]) - 1 : -1;
}

export function validPoint(point) {
  return (
    Number.isFinite(point?.x) &&
    Number.isFinite(point?.y) &&
    point.x >= 60 &&
    point.x <= 540 &&
    point.y >= 145 &&
    point.y <= 390
  );
}

export function slotFromPoint(point) {
  if (!validPoint(point)) return -1;
  if (point.x < 225) return 0;
  if (point.x < 375) return 1;
  return 2;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const rounds = generateRounds(seed);
  let elapsed = 0;
  let score = 0;
  let progress = 0;
  let attempts = 0;
  let lives = ACORN_SHUFFLE.lives;
  let finished = false;
  let won = false;
  let phase = 'reveal';
  let phaseTime = 0;
  let swapIndex = 0;
  let currentRoundIndex = 0;
  let positions = [0, 1, 2];
  let selection = 1;
  let chosen = -1;
  let flash = 0;
  let message = '记住金色橡果藏在哪只叶篮下面';

  const round = () => rounds[currentRoundIndex];

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    if (success) message = '十二颗金色橡果全都找到啦，林间亮起暖暖微光！';
    else if (lives === 0) message = '护叶用完啦，歇一歇再来追踪叶篮吧';
    else if (elapsed >= ACORN_SHUFFLE.limit - 0.02) message = '晚风到啦，这次寻果先走到这里';
    else message = `找对 ${progress} 轮，下次一定能跟得更稳`;
    onFinish({ score, elapsed, won, progress, attempts, lives });
  }

  function startRound() {
    currentRoundIndex = Math.min(attempts, rounds.length - 1);
    phase = 'reveal';
    phaseTime = 0;
    swapIndex = 0;
    positions = [0, 1, 2];
    selection = 1;
    chosen = -1;
    message = `第 ${attempts + 1} 轮：记住金色橡果藏在哪只叶篮`;
  }

  function completeSwap() {
    const [left, right] = round().swaps[swapIndex];
    [positions[left], positions[right]] = [positions[right], positions[left]];
    swapIndex++;
    phaseTime = 0;
    if (swapIndex === round().swaps.length) {
      phase = 'choose';
      message = '交换停下啦，金色橡果在哪只叶篮下面？';
      sound('ready');
    }
  }

  function settle(slot) {
    if (finished || phase !== 'choose') return;
    const current = round();
    chosen = slot;
    attempts++;
    if (slot === current.finalSlot) {
      progress++;
      score = progress * ACORN_SHUFFLE.score;
      flash = 1;
      message = `找对啦！金色橡果在第 ${slot + 1} 只叶篮下面`;
      sound('collect');
    } else {
      lives--;
      flash = -1;
      message =
        slot < 0
          ? `没有及时选择，橡果在第 ${current.finalSlot + 1} 只叶篮下面`
          : `这只叶篮是空的，橡果在第 ${current.finalSlot + 1} 只下面`;
      sound('hit');
    }
    phase = 'feedback';
    phaseTime = 0;
    if (lives === 0) finish(false);
    else if (attempts === ACORN_SHUFFLE.total) finish(progress === ACORN_SHUFFLE.total);
  }

  function moveSelection(direction) {
    if (finished || phase !== 'choose') return;
    const next = Math.max(0, Math.min(2, selection + direction));
    if (next === selection) {
      message = direction < 0 ? '已经选到最左边的叶篮啦' : '已经选到最右边的叶篮啦';
      return;
    }
    selection = next;
    message = `现在指向第 ${selection + 1} 只叶篮，按空格确认`;
    sound('move');
  }

  function phaseBoundary() {
    if (phase === 'reveal') return ACORN_SHUFFLE.revealTime;
    if (phase === 'shuffle') return swapDuration(attempts);
    if (phase === 'choose') return ACORN_SHUFFLE.chooseTime;
    return ACORN_SHUFFLE.feedbackTime;
  }

  function advancePhase() {
    phaseTime = 0;
    if (phase === 'reveal') {
      phase = 'shuffle';
      message = `盯住叶篮，它要交换 ${round().swaps.length} 次`;
      return;
    }
    if (phase === 'shuffle') {
      completeSwap();
      return;
    }
    if (phase === 'choose') {
      settle(-1);
      return;
    }
    if (phase === 'feedback' && !finished) startRound();
  }

  function basketLocations() {
    const locations = positions.map(() => ({ x: 0, y: 246 }));
    positions.forEach((identity, slot) => {
      locations[identity] = { x: SLOT_X[slot], y: 246 };
    });
    if (phase === 'shuffle' && swapIndex < round().swaps.length) {
      const [left, right] = round().swaps[swapIndex];
      const leftIdentity = positions[left];
      const rightIdentity = positions[right];
      const raw = Math.min(1, phaseTime / swapDuration(attempts));
      const t = raw * raw * (3 - 2 * raw);
      const arc = Math.sin(t * Math.PI);
      locations[leftIdentity] = {
        x: SLOT_X[left] + (SLOT_X[right] - SLOT_X[left]) * t,
        y: 246 - 38 * arc,
      };
      locations[rightIdentity] = {
        x: SLOT_X[right] + (SLOT_X[left] - SLOT_X[right]) * t,
        y: 246 + 22 * arc,
      };
    }
    const targetIdentity = round().targetSlot;
    if (phase === 'reveal' || phase === 'feedback') locations[targetIdentity].y -= 54;
    return locations;
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      const target = Math.min(ACORN_SHUFFLE.limit, elapsed + dt);
      while (!finished && elapsed < target - 1e-9) {
        const remaining = target - elapsed;
        const toBoundary = Math.max(0, phaseBoundary() - phaseTime);
        const step = Math.min(remaining, toBoundary || remaining);
        elapsed += step;
        phaseTime += step;
        flash += (0 - flash) * Math.min(1, step * 5);
        if (toBoundary <= step + 1e-9) advancePhase();
      }
      if (!finished && elapsed >= ACORN_SHUFFLE.limit - 1e-9) finish(false);
    },
    input(type, payload = {}) {
      if (finished || phase !== 'choose') return;
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (leftKeys.has(key)) moveSelection(-1);
        else if (rightKeys.has(key)) moveSelection(1);
        else if (confirmKeys.has(key)) settle(selection);
        else {
          const slot = numberSlot(key);
          if (slot >= 0) settle(slot);
        }
      }
      if (type === 'primary-down') {
        const slot = slotFromPoint(payload);
        if (slot >= 0) settle(slot);
      }
    },
    getState() {
      return {
        elapsed,
        score,
        progress,
        attempts,
        lives,
        finished,
        won,
        phase,
        phaseTime,
        swapIndex,
        positions: [...positions],
        selection,
        chosen,
        answer: round().finalSlot,
        extra: `${attempts} / ${ACORN_SHUFFLE.total} · 护叶 ${lives}`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f4ede1';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '叶篮寻果', 100, 34, 23);
      label(ctx, `轮次 ${attempts}/12 · 护叶 ${lives}`, 474, 34, 16, '#59705d');

      const glade = ctx.createLinearGradient(0, 58, 0, 421);
      glade.addColorStop(0, '#e4eedc');
      glade.addColorStop(1, '#a9c49f');
      roundRect(ctx, 24, 60, 552, 364, 38, glade);
      drawGlade(ctx);

      if (phase === 'choose' || phase === 'feedback') {
        const x = SLOT_X[phase === 'feedback' && chosen >= 0 ? chosen : selection];
        ctx.strokeStyle = phase === 'feedback' && flash < 0 ? '#b85f57' : '#efca6c';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(x, 260, 67, 0, Math.PI * 2);
        ctx.stroke();
        label(
          ctx,
          String((phase === 'feedback' && chosen >= 0 ? chosen : selection) + 1),
          x,
          347,
          17,
          '#665f4f',
        );
      }

      const locations = basketLocations();
      const targetIdentity = round().targetSlot;
      if (phase === 'reveal' || phase === 'feedback') {
        const target = locations[targetIdentity];
        drawAcorn(ctx, target.x, 275, flash);
      }
      for (let identity = 0; identity < 3; identity++) {
        const location = locations[identity];
        drawBasket(ctx, location.x, location.y, (round().leaf + identity) % 4);
      }

      roundRect(ctx, 56, 382, 488, 34, 17, '#fff9e8');
      label(ctx, message, 300, 400, 13, flash < 0 ? '#a85f55' : '#586d5b');
      roundRect(ctx, 135, 438, 330, 28, 14, '#f3ddb4');
      label(ctx, '点叶篮 · ← → 选择 · 空格确认 · 1 2 3 直选', 300, 452, 13, '#6e6558');
    },
    destroy() {
      finished = true;
    },
  };
}

function drawGlade(ctx) {
  ctx.fillStyle = '#93b28b';
  ctx.beginPath();
  ctx.moveTo(24, 317);
  ctx.quadraticCurveTo(140, 276, 274, 313);
  ctx.quadraticCurveTo(425, 268, 576, 306);
  ctx.lineTo(576, 424);
  ctx.lineTo(24, 424);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,249,220,.55)';
  for (const x of SLOT_X) {
    ctx.beginPath();
    ctx.ellipse(x, 306, 66, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBasket(ctx, x, y, leaf) {
  const colors = ['#7da37c', '#8ead82', '#759b78', '#98b586'];
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#c99a64';
  ctx.strokeStyle = '#64705a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-48, 11);
  ctx.quadraticCurveTo(0, -19, 48, 11);
  ctx.lineTo(36, 63);
  ctx.quadraticCurveTo(0, 80, -36, 63);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#f0d6a0';
  ctx.lineWidth = 5;
  for (const row of [23, 39, 54]) {
    ctx.beginPath();
    ctx.moveTo(-36 + row / 6, row);
    ctx.quadraticCurveTo(0, row - 14, 36 - row / 6, row);
    ctx.stroke();
  }
  ctx.fillStyle = colors[leaf];
  ctx.strokeStyle = '#5f795f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 5, 51, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.quadraticCurveTo(0, -18, 18, -31);
  ctx.stroke();
  ctx.restore();
}

function drawAcorn(ctx, x, y, flash) {
  ctx.fillStyle = flash < 0 ? 'rgba(190,91,82,.2)' : 'rgba(248,218,119,.3)';
  ctx.beginPath();
  ctx.arc(x, y + 6, 35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d99857';
  ctx.strokeStyle = '#6b5e4e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 18, 23, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8c6a4e';
  ctx.beginPath();
  ctx.moveTo(x - 19, y + 2);
  ctx.quadraticCurveTo(x, y - 13, x + 19, y + 2);
  ctx.lineTo(x + 15, y + 10);
  ctx.quadraticCurveTo(x, y + 3, x - 15, y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
