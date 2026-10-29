import {
  createCampaignClock,
  cellAt,
  cellRect,
  adjacent,
  boardBackground,
  tile,
  GRID,
} from '@playground/game-sdk/campaign';
import { roundRect, label } from '@playground/game-sdk';
import { cottage } from './cottage.js';
export function createCampaignGame({ level, onFinish, sound = () => {} }) {
  const clock = createCampaignClock(onFinish, sound),
    history = [];
  let board = [...level.board],
    pressed = -1;
  function move(cell) {
    const blank = board.indexOf(0);
    if (!clock.active || !adjacent(blank, 3).includes(cell)) return;
    history.push([...board]);
    [board[blank], board[cell]] = [board[cell], board[blank]];
    clock.step();
    sound('tap');
    if (board.every((n, i) => n === (i + 1) % 9)) clock.finish(true);
  }
  return {
    update: clock.update,
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = -1;
        return;
      }
      if (!clock.active) return;
      if (type === 'undo') {
        if (history.length) board = history.pop();
        pressed = -1;
        return;
      }
      if (type === 'primary-down') pressed = cellAt(payload, 3);
      if (type === 'primary-up') {
        const at = cellAt(payload, 3);
        if (at === pressed) move(at);
        pressed = -1;
      }
      if (type === 'key-down' && !payload.repeat) {
        const delta = {
          arrowup: -3,
          w: -3,
          arrowright: 1,
          d: 1,
          arrowdown: 3,
          s: 3,
          arrowleft: -1,
          a: -1,
        }[String(payload.key).toLowerCase()];
        if (delta !== undefined) {
          const blank = board.indexOf(0),
            cell = blank + delta;
          if (Math.abs(delta) !== 1 || Math.floor(cell / 3) === Math.floor(blank / 3)) move(cell);
        }
      }
    },
    getState() {
      return {
        ...clock.state(),
        board: [...board],
        blank: board.indexOf(0),
        size: 3,
        bounds: GRID,
        canUndo: !!history.length,
        extra: `${board.filter((n, i) => n && n === i + 1).length} / 8`,
        hint: '点击空格相邻方块 · 方向键移动空格',
      };
    },
    draw(ctx) {
      boardBackground(ctx, '#e1ece5');
      board.forEach((n, cell) => {
        tile(ctx, cell, 3, { fill: n ? '#fff0d3' : '#c0d7cd' });
        if (n) {
          const { x, y, side } = cellRect(cell, 3),
            source = n - 1;
          ctx.save();
          ctx.beginPath();
          ctx.rect(x + 3, y + 3, side - 6, side - 6);
          ctx.clip();
          ctx.translate(x - (source % 3) * side, y - Math.floor(source / 3) * side);
          ctx.scale(560 / 360, 560 / 360);
          cottage(ctx, 0, 0);
          ctx.restore();
          roundRect(ctx, x + 9, y + 9, 35, 31, 8, '#fff8e9dd');
          label(ctx, n, x + 26, y + 25, 20, '#527e70');
        }
      });
    },
    destroy() {
      pressed = -1;
      clock.destroy();
    },
  };
}
