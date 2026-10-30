import { rng, roundRect, label } from '@playground/game-sdk';

const TARGET = 12,
  MIN_X = 120,
  MAX_X = 480,
  SPAN = MAX_X - MIN_X;
const COLORS = ['#9dc7b4', '#f0ce8d', '#e9ad98', '#b5afd0', '#93bccb', '#d2cc9f'];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function generateTower(seed) {
  const random = rng(`${seed}:tiny-skyline`);
  return Array.from({ length: TARGET }, (_, index) => ({
    id: index,
    speed: 136 + index * 8 + random() * 8,
    offset: random() < 0.5 ? 0 : SPAN,
    color: (index + Math.floor(random() * COLORS.length)) % COLORS.length,
  }));
}

export function towerPositionAt(stage, time) {
  const distance =
    (((stage.offset + stage.speed * Math.max(0, time)) % (SPAN * 2)) + SPAN * 2) % (SPAN * 2);
  return MIN_X + (distance <= SPAN ? distance : SPAN * 2 - distance);
}

// Absolute game time, so normal input can target a seeded floor regardless of
// the browser's frame rate or the preceding placement animation.
export function nextPerfectTowerTime(stage, target = 300, after = 0) {
  const distance = clamp(target, MIN_X, MAX_X) - MIN_X,
    phase = stage.offset + stage.speed * Math.max(0, after);
  return Math.min(
    ...[distance, SPAN * 2 - distance].map((residue) => {
      let next = residue + Math.ceil((phase - residue) / (SPAN * 2)) * (SPAN * 2);
      if (next < phase - 1e-8) next += SPAN * 2;
      return Math.max(0, (next - stage.offset) / stage.speed);
    }),
  );
}

export function towerOverlap(top, moving) {
  if (Math.abs(moving.x - top.x) <= 6 + 1e-9) return { x: top.x, width: top.width, perfect: true };
  const left = Math.max(top.x - top.width / 2, moving.x - moving.width / 2),
    right = Math.min(top.x + top.width / 2, moving.x + moving.width / 2);
  return { x: (left + right) / 2, width: Math.max(0, right - left), perfect: false };
}

export function createCampaignGame({
  level: config,
  seed: _seed,
  onFinish = () => {},
  sound = () => {},
}) {
  _seed = config.seed;
  const emitFinish = onFinish;
  onFinish = (result) => emitFinish({ ...result, mistakes: Math.max(0, 3 - (result.lives ?? 3)) });
  const stages = config.stages,
    blocks = [{ x: 300, width: config.width, color: 0, perfect: true }],
    pieces = [];
  let elapsed = 0,
    score = 0,
    lives = 3,
    level = 0,
    phase = 'moving',
    cooldown = 0,
    finished = false,
    won = false;
  let notice = '对准下方楼层，轻轻一按落下来';
  const top = () => blocks.at(-1);
  const moving = () => ({
    x: towerPositionAt(stages[Math.min(level, config.target - 1)], elapsed),
    width: top().width,
  });
  function finish(reason) {
    if (finished) return;
    finished = true;
    onFinish({ score, elapsed, lives, level, won, reason });
  }
  function place() {
    if (finished || phase !== 'moving') return;
    const previous = top(),
      current = moving(),
      overlap = towerOverlap(previous, current);
    if (overlap.width <= 1e-9) {
      lives--;
      notice = lives ? '这一层落空了，找准位置再来' : '先把快乐收好，下次再叠高一点';
      sound('hit');
      pieces.push({
        ...current,
        y: 410 - (level + 1) * 25,
        velocity: 0,
        color: stages[level].color,
        life: 0.65,
      });
      if (!lives) {
        finish('lives');
        return;
      }
    } else {
      if (!overlap.perfect) {
        const left = current.x - current.width / 2,
          right = current.x + current.width / 2;
        const cutLeft = overlap.x - overlap.width / 2,
          cutRight = overlap.x + overlap.width / 2;
        if (cutLeft > left)
          pieces.push({
            x: (left + cutLeft) / 2,
            width: cutLeft - left,
            y: 410 - (level + 1) * 25,
            velocity: 0,
            color: stages[level].color,
            life: 0.65,
          });
        if (cutRight < right)
          pieces.push({
            x: (cutRight + right) / 2,
            width: right - cutRight,
            y: 410 - (level + 1) * 25,
            velocity: 0,
            color: stages[level].color,
            life: 0.65,
          });
      }
      blocks.push({ ...overlap, color: stages[level].color });
      level++;
      score += overlap.perfect ? 150 : 100;
      notice = overlap.perfect
        ? '完美对齐！ +150 · 楼层宽度保留'
        : '稳稳叠好了！ +100 · 下一层再对准一点';
      sound(overlap.perfect ? 'collect' : 'tap');
      if (level === config.target) {
        won = true;
        sound('win');
        finish('complete');
        return;
      }
    }
    phase = 'settle';
    cooldown = 0.45;
  }
  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      const step = Math.min(dt, Infinity - elapsed);
      elapsed += step;
      for (const piece of pieces) {
        piece.life -= step;
        piece.velocity += 360 * step;
        piece.y += piece.velocity * step;
      }
      for (let i = pieces.length - 1; i >= 0; i--) if (pieces[i].life <= 0) pieces.splice(i, 1);
      if (phase === 'settle') {
        cooldown = Math.max(0, cooldown - step);
        if (!cooldown) phase = 'moving';
      }
      if (elapsed >= Infinity) finish('time');
    },
    input(type, payload = {}) {
      if (type === 'primary-down') place();
      if (
        type === 'key-down' &&
        !payload.repeat &&
        [' ', 'Enter', 'Space', 'Spacebar'].includes(payload.key)
      )
        place();
    },
    getState() {
      return {
        score,
        elapsed,
        lives,
        level,
        phase,
        cooldown,
        finished,
        won,
        top: { ...top() },
        moving: moving(),
        blocks: blocks.map((block) => ({ ...block })),
        stages: stages.map((stage) => ({ ...stage })),
        extra: `${level} / ${config.target}`,
        hint: notice,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#e8e6ef';
      ctx.fillRect(0, 0, 600, 480);
      ctx.fillStyle = '#f3dc98';
      ctx.beginPath();
      ctx.arc(487, 75, 35, 0, Math.PI * 2);
      ctx.fill();
      for (const [x, y] of [
        [74, 100],
        [379, 140],
        [179, 52],
      ]) {
        roundRect(ctx, x, y, 90, 16, 8, '#f9f7ec');
        roundRect(ctx, x + 26, y - 13, 41, 22, 11, '#f9f7ec');
      }
      ctx.fillStyle = '#d4d5dc';
      ctx.beginPath();
      ctx.moveTo(0, 393);
      ctx.lineTo(50, 393);
      ctx.lineTo(50, 299);
      ctx.lineTo(109, 299);
      ctx.lineTo(109, 354);
      ctx.lineTo(165, 354);
      ctx.lineTo(165, 326);
      ctx.lineTo(226, 326);
      ctx.lineTo(226, 480);
      ctx.lineTo(0, 480);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(388, 480);
      ctx.lineTo(388, 355);
      ctx.lineTo(434, 355);
      ctx.lineTo(434, 278);
      ctx.lineTo(483, 278);
      ctx.lineTo(483, 341);
      ctx.lineTo(548, 341);
      ctx.lineTo(548, 317);
      ctx.lineTo(600, 317);
      ctx.lineTo(600, 480);
      ctx.fill();
      const camera = Math.max(0, level - 7) * 25;
      function floor(block, y, alpha = 1) {
        ctx.save();
        ctx.globalAlpha = alpha;
        const x = block.x - block.width / 2;
        roundRect(ctx, x, y + 4, block.width, 25, 5, '#81918f');
        roundRect(ctx, x, y, block.width, 24, 5, COLORS[block.color]);
        if (block.width > 35) {
          ctx.strokeStyle = '#fff7e8';
          ctx.globalAlpha = alpha * 0.6;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + 9, y + 5);
          ctx.lineTo(x + block.width - 9, y + 5);
          ctx.stroke();
        }
        if (block.width > 55) {
          for (let wx = x + 16; wx < x + block.width - 12; wx += 35)
            roundRect(ctx, wx, y + 10, 12, 9, 3, '#fff5db');
        }
        ctx.restore();
      }
      roundRect(ctx, 118, 437 + camera, 364, 17, 7, '#b8c7b9');
      blocks.forEach((block, index) => floor(block, 410 - index * 25 + camera));
      for (const piece of pieces) floor(piece, piece.y + camera, Math.min(1, piece.life * 2));
      if (!finished && phase === 'moving') {
        const block = { ...moving(), color: stages[level].color };
        floor(block, 410 - (level + 1) * 25 + camera - 30);
        ctx.save();
        ctx.setLineDash([5, 6]);
        ctx.strokeStyle = '#a9b5ac';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(top().x - top().width / 2, 410 - level * 25 + camera - 3);
        ctx.lineTo(top().x - top().width / 2, 104);
        ctx.moveTo(top().x + top().width / 2, 410 - level * 25 + camera - 3);
        ctx.lineTo(top().x + top().width / 2, 104);
        ctx.stroke();
        ctx.restore();
        const perfect = Math.abs(block.x - top().x) <= 6;
        roundRect(ctx, 181, 62, 238, 39, 14, perfect ? '#fff0bb' : '#f8f5ed');
        label(
          ctx,
          perfect ? '现在落！完美对齐' : '点击 / 空格，叠好这一层',
          300,
          82,
          15,
          perfect ? '#9a763c' : '#7e8b82',
          'center',
          700,
        );
      }
      label(ctx, 'TINY SKYLINE', 25, 28, 11, '#8b8b9b', 'left', 750);
      label(
        ctx,
        `${level} / ${config.target} 层 · 宽 ${Math.round(top().width)}`,
        574,
        28,
        13,
        '#818a8b',
        'right',
        650,
      );
      roundRect(ctx, 75, 448, 450, 25, 12, '#f8f5ed');
      label(ctx, notice, 300, 461, 12, '#7a8a7c', 'center', 600);
    },
    destroy() {
      finished = true;
      pieces.length = 0;
    },
  };
}
