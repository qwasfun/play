import { createCampaignGame } from './campaign-engine.js';
import { rng, roundRect, label } from '@playground/game-sdk';
const lines = [];
for (let a = 0; a < 25; a++)
  for (const delta of [1, -1, 5, -5]) {
    const b = a + delta,
      c = a + 2 * delta;
    if (c >= 0 && c < 25 && (Math.abs(delta) === 5 || Math.floor(a / 5) === Math.floor(c / 5)))
      lines.push([a, b, c]);
  }
export function legalMoves(board) {
  return lines.filter(([a, b, c]) => board[a] && board[b] && !board[c]);
}
export function makeBoards(seed) {
  const random = rng(`${seed}:pebble:v1`);
  return Array.from({ length: 3 }, (_, level) => {
    let best;
    for (let attempt = 0; attempt < 100; attempt++) {
      const board = Array(25).fill(0),
        solution = [];
      board[12] = 1;
      for (let n = 0; n < 5 + level; n++) {
        const possible = lines.filter(([a, b, c]) => !board[a] && !board[b] && board[c]);
        if (!possible.length) break;
        const [a, b, c] = possible[Math.floor(random() * possible.length)];
        board[c] = 0;
        board[a] = board[b] = 1;
        solution.unshift([a, b, c]);
      }
      if (!best || solution.length > best.solution.length) best = { board: [...board], solution };
      if (solution.length === 5 + level) break;
    }
    return best;
  });
}
export function createGame({ level: campaignLevel, seed, onFinish = () => {}, sound = () => {} }) {
  if (campaignLevel) return createCampaignGame({ level: campaignLevel, onFinish, sound });
  const boards = makeBoards(seed);
  let board = [...boards[0].board],
    rounds = 0,
    cleared = 0,
    elapsed = 0,
    score = 0,
    cursor = 12,
    selected = -1,
    history = [],
    finished = false,
    won = false,
    pressed = null,
    notice = '先选茶点，再选隔一颗的空位';
  function finish() {
    if (finished) return;
    finished = true;
    won = rounds === 3;
    onFinish({ score, elapsed, rounds, cleared, won });
  }
  function choose(i) {
    if (i < 0) return;
    cursor = i;
    if (board[i]) {
      selected = i;
      return;
    }
    const move = legalMoves(board).find(([a, , c]) => a === selected && c === i);
    if (!move) {
      notice = '要直线跳过一颗茶点，落在两格外的空位';
      return;
    }
    history.push([...board]);
    const [a, b, c] = move;
    board[a] = board[b] = 0;
    board[c] = 1;
    selected = -1;
    cleared++;
    score += 10;
    sound('collect');
    if (board.reduce((s, v) => s + v, 0) === 1) {
      rounds++;
      score += 100;
      history = [];
      if (rounds === 3) {
        finish();
        return;
      }
      board = [...boards[rounds].board];
      notice = '茶点收好啦，下一盘继续';
    } else
      notice = legalMoves(board).length ? '轻轻一跳，再想下一步' : '暂时无路可走，点撤销退回想一想';
  }
  const cell = (p) =>
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= 125 &&
    p.x < 475 &&
    p.y >= 85 &&
    p.y < 435
      ? Math.floor((p.y - 85) / 70) * 5 + Math.floor((p.x - 125) / 70)
      : -1;
  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      elapsed = Math.min(180, elapsed + dt);
      if (elapsed >= 180) finish();
    },
    input(type, p = {}) {
      if (type === 'primary-cancel') {
        pressed = null;
        return;
      }
      if (finished) return;
      if (type === 'undo') {
        if (history.length) {
          board = history.pop();
          selected = -1;
          cleared--;
          score -= 10;
          notice = '回到上一步，再试一条路';
        }
        return;
      }
      if (type === 'primary-down') pressed = cell(p);
      if (type === 'primary-up') {
        const c = cell(p);
        if (c === pressed) choose(c);
        pressed = null;
      }
      if (type === 'key-down' && !p.repeat) {
        const k = String(p.key).toLowerCase();
        if (k === 'arrowleft' || k === 'a') cursor = (cursor + 24) % 25;
        if (k === 'arrowright' || k === 'd') cursor = (cursor + 1) % 25;
        if (k === 'arrowup' || k === 'w') cursor = (cursor + 20) % 25;
        if (k === 'arrowdown' || k === 's') cursor = (cursor + 5) % 25;
        if (k === ' ' || k === 'enter') choose(cursor);
      }
    },
    getState() {
      return {
        elapsed,
        score,
        rounds,
        cleared,
        finished,
        won,
        cursor,
        selected,
        board: [...board],
        extra: `${rounds} / 3`,
        hint: notice,
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#f1e4d7';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '一盘茶点，最后留下一颗', 300, 38, 24);
      roundRect(ctx, 112, 72, 376, 376, 30, '#d6b99c');
      for (let i = 0; i < 25; i++) {
        const x = 160 + (i % 5) * 70,
          y = 120 + Math.floor(i / 5) * 70;
        roundRect(
          ctx,
          x - 29,
          y - 29,
          58,
          58,
          20,
          selected === i ? '#9ab19b' : '#e9d6bd',
          cursor === i ? '#6c846e' : null,
        );
        ctx.beginPath();
        ctx.arc(x, y, board[i] ? 20 : 7, 0, Math.PI * 2);
        ctx.fillStyle = board[i] ? '#b17a58' : '#c5aa8b';
        ctx.fill();
        if (board[i]) label(ctx, '✿', x, y, 21, '#fff1d2');
      }
      label(ctx, '直线跳一颗 · 空位接住它 · 可撤销', 300, 466, 15);
    },
    destroy() {
      finished = true;
      pressed = null;
      history = [];
    },
  };
}
