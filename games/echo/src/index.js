import { rng, roundRect, label } from '@playground/game-sdk';

const LIMIT = 180;
const TARGET = 12;
const PADS = [
  { x: 108, y: 62, color: '#83b99c', dark: '#38684e', key: '↑ / W', name: '叶' },
  { x: 308, y: 62, color: '#f0c96f', dark: '#8f6e29', key: '→ / D', name: '阳' },
  { x: 308, y: 240, color: '#e9a28b', dark: '#975b47', key: '↓ / S', name: '花' },
  { x: 108, y: 240, color: '#b4a6d3', dark: '#72608f', key: '← / A', name: '月' },
];
const PAD_W = 184;
const PAD_H = 160;

export function createEchoSequence(seed) {
  const random = rng(seed);
  return Array.from({ length: TARGET }, () => Math.floor(random() * 4));
}

function padAt(x, y) {
  return PADS.findIndex(pad => x >= pad.x && x <= pad.x + PAD_W && y >= pad.y && y <= pad.y + PAD_H);
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const sequence = createEchoSequence(seed);
  let elapsed = 0;
  let rounds = 0;
  let phase = 'playback';
  let phaseTime = 0;
  let inputIndex = 0;
  let activePad = -1;
  let soundedPad = -2;
  let feedbackPad = -1;
  let feedbackTime = 0;
  let finished = false;
  let won = false;

  function finish(reason) {
    if (finished) return;
    finished = true;
    phase = 'done';
    activePad = -1;
    onFinish({ score: rounds, rounds, elapsed, won, reason });
  }

  function answer(index) {
    if (finished || phase !== 'input' || index < 0) return;
    feedbackPad = index;
    feedbackTime = 0.23;
    if (index !== sequence[inputIndex]) {
      sound('hit');
      finish('wrong');
      return;
    }
    sound('tap');
    inputIndex++;
    if (inputIndex === rounds + 1) {
      rounds++;
      sound('collect');
      if (rounds === TARGET) {
        won = true;
        sound('win');
        finish('complete');
      } else {
        phase = 'between';
        phaseTime = 0;
      }
    }
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      elapsed = Math.min(LIMIT, elapsed + dt);
      if (elapsed >= LIMIT) {
        finish('time');
        return;
      }
      if (feedbackTime > 0) {
        feedbackTime -= dt;
        if (feedbackTime <= 0) feedbackPad = -1;
      }
      phaseTime += dt;
      if (phase === 'between') {
        activePad = -1;
        if (phaseTime >= 0.8) {
          phase = 'playback';
          phaseTime = 0;
          soundedPad = -2;
          feedbackPad = -1;
        }
      } else if (phase === 'playback') {
        const playTime = phaseTime - 0.6;
        const index = Math.floor(playTime / 0.67);
        const inPulse = playTime >= 0 && playTime % 0.67 < 0.43;
        activePad = inPulse && index <= rounds ? sequence[index] : -1;
        if (activePad !== -1 && index !== soundedPad) {
          sound('tap');
          soundedPad = index;
        }
        if (playTime >= (rounds + 1) * 0.67 + 0.25) {
          phase = 'input';
          phaseTime = 0;
          inputIndex = 0;
          activePad = -1;
        }
      }
    },
    input(type, payload = {}) {
      if (type === 'primary-down') answer(padAt(payload.x, payload.y));
      if (type !== 'key-down' || payload.repeat) return;
      const key = String(payload.key).toLowerCase();
      const mapping = { arrowup: 0, w: 0, arrowright: 1, d: 1, arrowdown: 2, s: 2, arrowleft: 3, a: 3 };
      if (Object.hasOwn(mapping, key)) answer(mapping[key]);
    },
    getState() {
      return {
        score: rounds, rounds, round: Math.min(TARGET, rounds + 1), elapsed, finished, won,
        phase, activePad, inputIndex,
        progress: `${rounds} / ${TARGET} 轮`,
        hint: phase === 'playback' ? '先看一看，记住亮起的顺序' : phase === 'input' ? `轮到你啦 · ${inputIndex} / ${rounds + 1}` : phase === 'between' ? '记得真准！准备下一轮' : won ? '十二轮，全部记住了！' : '下次再听听森林的回声',
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#ecf3e9';
      ctx.fillRect(0, 0, 600, 480);
      // Quiet background motes are fixed, so animation does not distract from the sequence.
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = i % 2 ? '#dce7ce' : '#e1eacb';
        ctx.beginPath();
        ctx.arc(28 + (i * 83) % 548, 36 + (i * 131) % 410, 3 + i % 3, 0, Math.PI * 2);
        ctx.fill();
      }
      const message = phase === 'playback' ? '仔细看 · 森林正在说话' : phase === 'input' ? '轮到你 · 按顺序回应' : phase === 'between' ? '很好，下一轮会多一个声音' : won ? '你记住了整片森林' : '每一次倾听，都会更熟悉';
      label(ctx, message, 300, 29, 17, '#4e6c56', 'center', 600);
      for (let i = 0; i < 4; i++) {
        const pad = PADS[i];
        const lit = activePad === i || (feedbackTime > 0 && feedbackPad === i);
        const offset = lit ? 4 : 0;
        roundRect(ctx, pad.x, pad.y + 7, PAD_W, PAD_H, 24, pad.dark);
        ctx.save();
        if (lit) {
          ctx.shadowColor = pad.color;
          ctx.shadowBlur = 25;
        }
        roundRect(ctx, pad.x, pad.y + offset, PAD_W, PAD_H, 24, lit ? '#fff6d4' : pad.color);
        ctx.restore();
        const x = pad.x + PAD_W / 2;
        const y = pad.y + 60 + offset;
        ctx.fillStyle = pad.dark;
        ctx.strokeStyle = pad.dark;
        ctx.lineWidth = 4;
        if (i === 0) {
          ctx.beginPath();
          ctx.ellipse(x, y, 17, 26, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = lit ? '#fff6d4' : pad.color;
          ctx.beginPath();
          ctx.moveTo(x - 16, y + 16);
          ctx.lineTo(x + 12, y - 12);
          ctx.stroke();
        } else if (i === 1) {
          ctx.beginPath();
          ctx.arc(x, y, 17, 0, Math.PI * 2);
          ctx.fill();
          for (let r = 0; r < 8; r++) {
            const a = r * Math.PI / 4;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * 24, y + Math.sin(a) * 24);
            ctx.lineTo(x + Math.cos(a) * 31, y + Math.sin(a) * 31);
            ctx.stroke();
          }
        } else if (i === 2) {
          for (let r = 0; r < 5; r++) {
            const a = r * Math.PI * 2 / 5 - Math.PI / 2;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * 17, y + Math.sin(a) * 17, 12, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = lit ? '#fff6d4' : pad.color;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, 25, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = lit ? '#fff6d4' : pad.color;
          ctx.beginPath();
          ctx.arc(x + 11, y - 8, 24, 0, Math.PI * 2);
          ctx.fill();
        }
        label(ctx, pad.name, x, pad.y + 112 + offset, 20, pad.dark, 'center', 700);
        label(ctx, pad.key, x, pad.y + 139 + offset, 13, pad.dark, 'center', 600);
      }
      const length = Math.min(TARGET, rounds + 1);
      for (let i = 0; i < length; i++) {
        ctx.fillStyle = phase === 'input' && i < inputIndex ? '#42765a' : '#c4d6be';
        ctx.beginPath();
        ctx.arc(300 - (length - 1) * 7 + i * 14, 435, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      label(ctx, `第 ${Math.min(TARGET, rounds + 1)} 轮 / 12 · 点击图案或使用方向键`, 300, 463, 14, '#65816b', 'center', 500);
    },
    destroy() {},
  };
}
