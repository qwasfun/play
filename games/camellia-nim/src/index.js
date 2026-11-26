import { label, roundRect } from '@playground/game-sdk';
import { bestMove, CAMELLIA_NIM, generateGardens } from './strategy.js';

export { bestMove, CAMELLIA_NIM, generateGardens, positionValue } from './strategy.js';

const PILE_X = [80, 235, 390];
const PILE_Y = 104;
const PILE_W = 130;
const PILE_H = 218;
const TAKE_X = [176, 274, 372];
const TAKE_Y = 359;
const CONFIRM = { x: 488, y: 359 };

export const pilePoint = (pile) => ({ x: PILE_X[pile] + PILE_W / 2, y: 200 });
export const takePoint = (take) => ({ x: TAKE_X[take - 1], y: TAKE_Y });
export const confirmPoint = () => ({ ...CONFIRM });

const validPoint = (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y);

function targetAt(point) {
  if (!validPoint(point)) return '';
  for (let pile = 0; pile < CAMELLIA_NIM.piles; pile++) {
    if (
      point.x >= PILE_X[pile] &&
      point.x <= PILE_X[pile] + PILE_W &&
      point.y >= PILE_Y &&
      point.y <= PILE_Y + PILE_H
    )
      return `pile:${pile}`;
  }
  for (let take = 1; take <= CAMELLIA_NIM.maxTake; take++)
    if (Math.hypot(point.x - TAKE_X[take - 1], point.y - TAKE_Y) <= 32) return `take:${take}`;
  if (Math.hypot(point.x - CONFIRM.x, point.y - CONFIRM.y) <= 48) return 'confirm';
  return '';
}

const total = (piles) => piles.reduce((sum, count) => sum + count, 0);
const firstPile = (piles) =>
  Math.max(
    0,
    piles.findIndex((count) => count > 0),
  );

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const course = generateGardens(seed);
  let garden = 0;
  let piles = [...course[0]];
  let wins = 0;
  let gardens = 0;
  let turns = 0;
  let cursor = firstPile(piles);
  let take = 1;
  let elapsed = 0;
  let phase = 'player';
  let phaseLeft = 0;
  let pressed = '';
  let finished = false;
  let won = false;
  let lastMove = null;
  let message = '选一丛茶花，再决定拈走几片';

  function finish() {
    if (finished) return;
    finished = true;
    won = gardens === CAMELLIA_NIM.gardens && wins === CAMELLIA_NIM.gardens;
    message = won
      ? '三座花园都赢下来啦，刺猬把竹篮举得高高的！'
      : '茶花对弈结束啦，下次再把最后一片留给自己';
    onFinish({ score: wins * CAMELLIA_NIM.score, elapsed, won, gardens, wins, turns });
  }

  function startNextGarden() {
    garden++;
    if (garden >= CAMELLIA_NIM.gardens) {
      finish();
      return;
    }
    piles = [...course[garden]];
    cursor = firstPile(piles);
    take = 1;
    phase = 'player';
    phaseLeft = 0;
    lastMove = null;
    message = `第 ${garden + 1} 座花园摆好啦，轮到你先拈`;
  }

  function settleGarden(playerWon) {
    gardens++;
    if (playerWon) wins++;
    sound(playerWon ? 'win' : 'hit');
    phase = 'transition';
    phaseLeft = CAMELLIA_NIM.transitionDelay;
    message = playerWon
      ? `最后一片在你手里！已经赢下 ${wins} 座花园`
      : '小刺猬拿到了最后一片，下一座花园再想一步';
  }

  function remove(pile, count, actor) {
    piles[pile] -= count;
    lastMove = { pile, take: count, actor };
  }

  function playTurn() {
    if (finished || phase !== 'player') return;
    const count = Math.min(take, piles[cursor]);
    if (!Number.isInteger(count) || count < 1) {
      message = '这丛茶花已经空啦，换一丛看看';
      sound('error');
      return;
    }
    turns++;
    remove(cursor, count, 'player');
    sound('tap');
    if (total(piles) === 0) {
      settleGarden(true);
      return;
    }
    phase = 'hedgehog';
    phaseLeft = CAMELLIA_NIM.hedgehogDelay;
    message = `你拈走 ${count} 片，小刺猬正在认真想一步`;
  }

  function hedgehogTurn() {
    const move = bestMove(piles);
    if (!move) return;
    remove(move.pile, move.take, 'hedgehog');
    if (total(piles) === 0) {
      settleGarden(false);
      return;
    }
    cursor = firstPile(piles);
    take = 1;
    phase = 'player';
    message = `小刺猬从第 ${move.pile + 1} 丛拈走 ${move.take} 片，轮到你啦`;
  }

  function selectPile(pile) {
    if (piles[pile] < 1) {
      message = '这丛茶花已经空啦，换一丛看看';
      sound('error');
      return;
    }
    cursor = pile;
    take = Math.min(take, CAMELLIA_NIM.maxTake, piles[cursor]);
    sound('tap');
  }

  function selectTake(count) {
    if (count > piles[cursor]) {
      message = `这一丛只剩 ${piles[cursor]} 片花瓣`;
      sound('error');
      return;
    }
    take = count;
    sound('tap');
  }

  function activate(target) {
    if (target.startsWith('pile:')) selectPile(Number(target.slice(5)));
    else if (target.startsWith('take:')) selectTake(Number(target.slice(5)));
    else if (target === 'confirm') playTurn();
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, CAMELLIA_NIM.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        const timed = phase === 'hedgehog' || phase === 'transition';
        if (!timed) {
          elapsed += remaining;
          break;
        }
        const step = Math.min(remaining, phaseLeft);
        elapsed += step;
        phaseLeft -= step;
        remaining -= step;
        if (phaseLeft <= 1e-9) {
          if (phase === 'hedgehog') hedgehogTurn();
          else startNextGarden();
        }
      }
      if (!finished && elapsed >= CAMELLIA_NIM.limit - 1e-9) finish();
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = '';
        return;
      }
      if (finished || phase !== 'player') return;
      if (type === 'primary-down') pressed = targetAt(payload);
      if (type === 'primary-up') {
        const target = targetAt(payload);
        if (target && target === pressed) activate(target);
        pressed = '';
      }
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (['1', '2', '3'].includes(key)) selectPile(Number(key) - 1);
        if (key === 'arrowleft' || key === 'a') selectPile((cursor + 2) % 3);
        if (key === 'arrowright' || key === 'd') selectPile((cursor + 1) % 3);
        if (key === 'arrowup' || key === 'w') selectTake(Math.min(3, take + 1));
        if (key === 'arrowdown' || key === 's') selectTake(Math.max(1, take - 1));
        if (key === ' ' || key === 'space' || key === 'spacebar' || key === 'enter') playTurn();
      }
    },
    getState() {
      return {
        piles: [...piles],
        course: course.map((item) => [...item]),
        garden,
        gardens,
        wins,
        turns,
        cursor,
        take,
        phase,
        elapsed,
        score: wins * CAMELLIA_NIM.score,
        finished,
        won,
        lastMove: lastMove ? { ...lastMove } : null,
        extra: `${wins} / ${CAMELLIA_NIM.gardens} 座 · 第 ${Math.min(garden + 1, CAMELLIA_NIM.gardens)} 座`,
        hint: message,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f5ecdc';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '茶花拈数', 120, 28, 26);
      label(
        ctx,
        `第 ${Math.min(garden + 1, CAMELLIA_NIM.gardens)} / ${CAMELLIA_NIM.gardens} 座 · 已赢 ${wins} 座`,
        472,
        28,
        15,
        '#6e665b',
      );
      label(
        ctx,
        phase === 'hedgehog' ? '小刺猬回合' : phase === 'transition' ? '花园结算' : '你的回合',
        300,
        61,
        15,
        '#587467',
      );

      for (let pile = 0; pile < CAMELLIA_NIM.piles; pile++) drawPile(ctx, pile);

      label(ctx, '拈几片', 98, TAKE_Y, 14, '#746b60');
      for (let count = 1; count <= CAMELLIA_NIM.maxTake; count++) {
        const enabled = count <= piles[cursor] && phase === 'player';
        roundRect(
          ctx,
          TAKE_X[count - 1] - 29,
          TAKE_Y - 27,
          58,
          54,
          18,
          take === count ? '#d78d90' : enabled ? '#fff9ed' : '#e4d8c6',
          take === count ? '#9e686d' : '#c4b49d',
        );
        label(ctx, count, TAKE_X[count - 1], TAKE_Y, 21, take === count ? '#fffaf0' : '#6c665e');
      }
      roundRect(ctx, 430, 331, 116, 56, 19, '#6f9485', '#527365');
      label(ctx, '放进竹篮', CONFIRM.x, CONFIRM.y, 16, '#fffaf0');

      drawHedgehog(ctx);
      roundRect(ctx, 50, 423, 500, 30, 15, '#fff9ed');
      label(ctx, message, 300, 438, 13, '#665f56');
      label(ctx, '点花丛、数量和竹篮 · 方向键选择 · 空格确认', 300, 470, 11, '#756f66');
    },
    destroy() {
      finished = true;
      pressed = '';
    },
  };

  function drawPile(ctx, pile) {
    const x = PILE_X[pile];
    const selected = pile === cursor;
    roundRect(
      ctx,
      x,
      PILE_Y,
      PILE_W,
      PILE_H,
      24,
      selected ? '#fff7e8' : '#eee3cf',
      selected ? '#55766a' : '#c7b79f',
    );
    label(ctx, `第 ${pile + 1} 丛`, x + PILE_W / 2, PILE_Y + 24, 13, '#786e62');
    ctx.strokeStyle = '#759578';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + PILE_W / 2, PILE_Y + 182);
    ctx.lineTo(x + PILE_W / 2, PILE_Y + 71);
    ctx.stroke();
    for (let index = 0; index < piles[pile]; index++) {
      const row = Math.floor(index / 3);
      const column = index % 3;
      const px = x + 38 + column * 27 + (row % 2) * 8;
      const py = PILE_Y + 78 + row * 36;
      drawFlower(ctx, px, py);
    }
    label(
      ctx,
      `${piles[pile]} 片`,
      x + PILE_W / 2,
      PILE_Y + 202,
      16,
      selected ? '#55766a' : '#786e62',
    );
  }
}

function drawFlower(ctx, x, y, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#d98a90';
  for (let petal = 0; petal < 5; petal++) {
    const angle = (petal * Math.PI * 2) / 5 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * 8, y + Math.sin(angle) * 8, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#efc66c';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHedgehog(ctx) {
  ctx.fillStyle = '#967c69';
  ctx.beginPath();
  ctx.ellipse(86, 401, 40, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9a27d';
  ctx.beginPath();
  ctx.arc(119, 401, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4f4842';
  ctx.beginPath();
  ctx.arc(126, 395, 3, 0, Math.PI * 2);
  ctx.fill();
  roundRect(ctx, 51, 405, 69, 19, 8, '#d6ae72', '#9f7d55');
}
