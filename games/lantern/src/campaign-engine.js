import { rng, roundRect, label } from '@playground/game-sdk';
export function makeSchedule(seed) {
  const random = rng(`${seed}:lantern:v1`);
  return Array.from({ length: 24 }, () => Math.floor(random() * 9));
}
export function createCampaignGame({
  level: config,
  seed: _seed,
  onFinish = () => {},
  sound = () => {},
}) {
  _seed = config.seed;
  const emitFinish = onFinish;
  onFinish = (result) =>
    emitFinish({
      ...result,
      reason: result.won ? 'complete' : result.lives <= 0 ? 'lives' : 'target-shortfall',
      mistakes: Math.max(0, 3 - (result.lives ?? 3)),
    });
  const schedule = config.schedule;
  let elapsed = 0,
    score = 0,
    lives = 3,
    handled = 0,
    hits = 0,
    cursor = 4,
    finished = false,
    won = false,
    pressed = null,
    hit = false,
    notice = '等金色亮灯再点，灰色小花请放过';
  function finish() {
    if (finished) return;
    finished = true;
    won = hits >= config.target;
    onFinish({ score, elapsed, lives, handled, hits, won });
  }
  function settle() {
    if (!hit) {
      lives--;
      notice = '萤灯飞走了，下一盏再试试';
    }
    handled++;
    hit = false;
    if (!lives || handled === config.schedule.length) finish();
  }
  function tap(cell) {
    if (finished || cell < 0) return;
    cursor = cell;
    const phase = elapsed - handled * config.period;
    if (phase >= config.preview && phase < config.period && cell === schedule[handled] && !hit) {
      hit = true;
      hits++;
      score = hits * 25;
      notice = '点亮了！+25';
      sound('collect');
      if (hits >= config.target) finish();
    } else if (!hit) {
      lives--;
      notice = '轻一点，等金色萤灯出现';
      sound('hit');
      if (!lives) finish();
    }
  }
  const cell = (p) => {
    if (
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y) ||
      p.x < 30 ||
      p.x >= 570 ||
      p.y < 65 ||
      p.y >= 440
    )
      return -1;
    return Math.floor((p.y - 65) / 125) * 3 + Math.floor((p.x - 30) / 180);
  };
  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      const end = elapsed + dt;
      while (!finished && (handled + 1) * config.period <= end + 1e-9) {
        elapsed = (handled + 1) * config.period;
        settle();
      }
      if (!finished) elapsed = end;
    },
    input(type, p = {}) {
      if (type === 'primary-cancel') {
        pressed = null;
        return;
      }
      if (finished) return;
      if (type === 'primary-down') pressed = cell(p);
      if (type === 'primary-up') {
        const c = cell(p);
        if (c === pressed) tap(c);
        pressed = null;
      }
      if (type === 'key-down' && !p.repeat) {
        const k = String(p.key).toLowerCase();
        if (['arrowleft', 'a'].includes(k)) cursor = (cursor + 8) % 9;
        if (['arrowright', 'd'].includes(k)) cursor = (cursor + 1) % 9;
        if (['arrowup', 'w'].includes(k)) cursor = (cursor + 6) % 9;
        if (['arrowdown', 's'].includes(k)) cursor = (cursor + 3) % 9;
        if (k === ' ' || k === 'enter') tap(cursor);
      }
    },
    getState() {
      return {
        elapsed,
        score,
        lives,
        handled,
        hits,
        finished,
        won,
        cursor,
        schedule: [...schedule],
        active:
          !hit && elapsed - handled * config.period >= config.preview ? schedule[handled] : -1,
        extra: `${hits} / ${config.target}`,
        hint: notice,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#303f50';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '萤灯巡夜 · 等一束小小的光', 300, 40, 23, '#f4dfab');
      for (let i = 0; i < 9; i++) {
        const x = 120 + (i % 3) * 180,
          y = 127.5 + Math.floor(i / 3) * 125,
          active =
            !finished &&
            !hit &&
            i === schedule[handled] &&
            elapsed - handled * config.period >= config.preview;
        roundRect(
          ctx,
          x - 84,
          y - 56,
          168,
          112,
          23,
          active ? '#f3d27a' : '#526575',
          cursor === i ? '#f9edd0' : null,
        );
        label(ctx, active ? '✦' : '✿', x, y, active ? 42 : 26, active ? '#80683b' : '#8faaa7');
      }
      label(ctx, hit ? '这一盏已点亮，等等下一轮' : '金灯才点 · 灰花不碰', 300, 450, 16, '#f4dfab');
    },
    destroy() {
      finished = true;
      pressed = null;
    },
  };
}
