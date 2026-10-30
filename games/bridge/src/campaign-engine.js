import { rng, roundRect, label } from '@playground/game-sdk';

const SPACE = new Set([' ', 'Space', 'Spacebar']);
const BASE_X = 160,
  BASE_Y = 333;

export function generateIslands(seed) {
  const random = rng(`${seed}:islands`);
  return Array.from({ length: 12 }, (_, index) => ({
    gap: Math.round(95 + random() * (135 + index * 4)),
    width: Math.round(83 - index * 2 + random() * 11),
    speed: 143 + index * 6,
  }));
}

export function evaluateBridge(length, island) {
  const success = length >= island.gap && length <= island.gap + island.width;
  const perfect =
    success && Math.abs(length - island.gap - island.width / 2) <= island.width * 0.16;
  return { success, perfect, points: success ? (perfect ? 150 : 100) : 0 };
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
  const islands = config.islands;
  let elapsed = 0,
    lives = 3,
    score = 0,
    progress = 0,
    length = 0;
  let holding = false,
    phase = 'idle',
    phaseTime = 0,
    done = false;
  let verdict = null,
    message = '按住长桥，松手搭上云岛';
  const current = () => islands[Math.min(progress, islands.length - 1)];

  function finish(reason) {
    if (done) return;
    done = true;
    onFinish({ score, elapsed, lives, progress, won: progress === config.target, reason });
  }
  function press() {
    if (done || phase !== 'idle' || holding) return;
    holding = true;
    length = 0;
    message = '看准距离，松手落桥';
  }
  function release() {
    if (done || !holding) return;
    holding = false;
    if (length < 2) {
      length = 0;
      return;
    }
    phase = 'fall';
    phaseTime = 0;
    sound('tap');
  }
  function cancel() {
    if (!holding) return;
    holding = false;
    length = 0;
    message = '准备好了就再试一次';
  }

  return {
    update(dt) {
      if (done || !Number.isFinite(dt) || dt <= 0) return;
      elapsed = elapsed + dt;

      if (holding) length = Math.min(390, length + current().speed * dt);
      if (phase === 'fall') {
        phaseTime += dt;
        if (phaseTime >= 0.36) {
          verdict = evaluateBridge(length, current());
          score += verdict.points;
          if (verdict.success) {
            progress++;
            message = verdict.perfect ? '正中岛心！ +150' : '成功搭桥！ +100';
            sound('collect');
          } else {
            lives--;
            message = length < current().gap ? '桥短了一点，下次再长些' : '桥太长了，下次早些松手';
            sound('hit');
          }
          phase = 'feedback';
          phaseTime = 0;
        }
      } else if (phase === 'feedback') {
        phaseTime += dt;
        if (phaseTime >= 0.9) {
          if (progress === config.target) {
            sound('win');
            finish('complete');
            return;
          }
          if (lives === 0) {
            finish('lives');
            return;
          }
          length = 0;
          phase = 'idle';
          phaseTime = 0;
          verdict = null;
          message = '按住长桥，松手搭上云岛';
        }
      }
    },
    input(type, payload = {}) {
      if (
        type === 'primary-down' ||
        (type === 'key-down' && SPACE.has(payload.key) && !payload.repeat)
      )
        press();
      if (type === 'primary-up' || (type === 'key-up' && SPACE.has(payload.key))) release();
      if (type === 'primary-cancel') cancel();
    },
    getState() {
      return {
        score,
        elapsed,
        lives,
        progress,
        holding,
        length,
        phase,
        done,
        target: { ...current() },
        hint: '按住增长 · 松手落桥',
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#e5f2ec';
      ctx.fillRect(0, 0, 600, 480);
      ctx.fillStyle = '#fff4ce';
      ctx.beginPath();
      ctx.arc(498, 95, 42, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const x = ((i * 153 - elapsed * (2 + (i % 2)) + 650) % 780) - 80;
        const y = 93 + (i % 3) * 67;
        ctx.fillStyle = '#f9fcf5';
        ctx.beginPath();
        ctx.ellipse(x, y, 48 + i * 2, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x - 9, y - 8, 24, 15, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#c9e2d6';
      ctx.beginPath();
      ctx.moveTo(0, 397);
      ctx.quadraticCurveTo(70, 238, 160, 397);
      ctx.quadraticCurveTo(265, 310, 345, 397);
      ctx.quadraticCurveTo(460, 265, 600, 397);
      ctx.lineTo(600, 480);
      ctx.lineTo(0, 480);
      ctx.fill();
      const displayIndex = phase === 'feedback' && verdict?.success ? progress - 1 : progress;
      const island = islands[Math.min(displayIndex, islands.length - 1)];
      const targetX = BASE_X + island.gap;
      function drawIsland(x, width, isTarget) {
        ctx.fillStyle = '#a9c9b5';
        ctx.beginPath();
        ctx.moveTo(x, BASE_Y + 10);
        ctx.lineTo(x + width, BASE_Y + 10);
        ctx.lineTo(x + width - 12, BASE_Y + 65);
        ctx.lineTo(x + width * 0.42, BASE_Y + 83);
        ctx.lineTo(x + 13, BASE_Y + 56);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#8eb59e';
        ctx.beginPath();
        ctx.moveTo(x + width * 0.53, BASE_Y + 16);
        ctx.lineTo(x + width - 5, BASE_Y + 10);
        ctx.lineTo(x + width - 12, BASE_Y + 65);
        ctx.lineTo(x + width * 0.42, BASE_Y + 83);
        ctx.closePath();
        ctx.fill();
        roundRect(ctx, x - 4, BASE_Y - 3, width + 8, 23, 9, '#71a88b');
        roundRect(ctx, x - 4, BASE_Y - 8, width + 8, 15, 7, '#9ecb9e');
        if (isTarget) {
          const center = x + width / 2;
          roundRect(ctx, center - width * 0.16, BASE_Y - 7, width * 0.32, 10, 4, '#f6d472');
          ctx.strokeStyle = '#42665c';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(center, BASE_Y - 10);
          ctx.lineTo(center, BASE_Y - 59);
          ctx.stroke();
          ctx.fillStyle = '#ec9e80';
          ctx.beginPath();
          ctx.moveTo(center, BASE_Y - 59);
          ctx.lineTo(center + 26, BASE_Y - 49);
          ctx.lineTo(center, BASE_Y - 39);
          ctx.closePath();
          ctx.fill();
        }
      }
      drawIsland(65, BASE_X - 65, false);
      drawIsland(targetX, island.width, true);
      ctx.save();
      ctx.translate(BASE_X, BASE_Y - 7);
      let angle = -Math.PI / 2;
      if (phase === 'fall') angle += (Math.min(1, phaseTime / 0.36) ** 2 * Math.PI) / 2;
      if (phase === 'feedback') angle = verdict?.success ? 0 : Math.min(1.5, phaseTime * 2.1);
      ctx.rotate(angle);
      roundRect(ctx, 0, -7, length, 14, 5, '#d37f65');
      if (length > 10) {
        ctx.strokeStyle = '#efb28d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(6, -2);
        ctx.lineTo(length - 5, -2);
        ctx.stroke();
      }
      ctx.restore();
      const travel = phase === 'feedback' && verdict?.success ? Math.min(1, phaseTime / 0.6) : 0;
      const courierX = 132 + (targetX + island.width / 2 - 132) * travel;
      const courierY = BASE_Y - 32 - Math.sin(travel * Math.PI) * 9;
      ctx.fillStyle = '#476a62';
      ctx.beginPath();
      ctx.ellipse(courierX, BASE_Y - 6, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      roundRect(ctx, courierX - 10, courierY - 5, 20, 27, 8, '#497fa1');
      ctx.fillStyle = '#f3d8af';
      ctx.beginPath();
      ctx.arc(courierX, courierY - 9, 10, 0, Math.PI * 2);
      ctx.fill();
      roundRect(ctx, courierX - 11, courierY - 18, 23, 9, 4, '#f0bb62');
      roundRect(ctx, 20, 18, 129, 33, 16, '#f8fcf3');
      label(ctx, `已抵达 ${progress} / ${config.target} 岛`, 84, 40, 13, '#456e60');
      label(ctx, '● '.repeat(lives).trim(), 559, 40, 17, '#c67f66', 'right');
      if (holding) {
        label(ctx, '松手！让桥落下', 300, 81, 17, '#477267');
        roundRect(ctx, 218, 98, 164, 7, 3, '#c6dfd0');
        roundRect(ctx, 218, 98, (164 * length) / 390, 7, 3, '#e1a16c');
      }
      roundRect(ctx, 104, 432, 392, 33, 16, '#f7fbf0');
      label(ctx, message, 300, 455, 14, '#426c5b');
    },
    destroy() {
      done = true;
      holding = false;
    },
  };
}
