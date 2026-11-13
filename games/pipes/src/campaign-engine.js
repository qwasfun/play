import {
  createCampaignClock,
  cellAt,
  moveSelection,
  boardBackground,
  tile,
  cellRect,
  glyph,
  GRID,
} from '@playground/game-sdk/campaign';
export function traceCampaignPipes(board, size, flowers = []) {
  const visited = new Set(),
    queue = [];
  if (board[0] & 8) {
    visited.add(0);
    queue.push(0);
  }
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head],
      x = at % size,
      y = Math.floor(at / size);
    for (const [dx, dy, exit, entry] of [
      [0, -1, 1, 4],
      [1, 0, 2, 8],
      [0, 1, 4, 1],
      [-1, 0, 8, 2],
    ]) {
      const a = x + dx,
        b = y + dy,
        next = b * size + a;
      if (
        a < 0 ||
        b < 0 ||
        a >= size ||
        b >= size ||
        !(board[at] & exit) ||
        !(board[next] & entry) ||
        visited.has(next)
      )
        continue;
      visited.add(next);
      queue.push(next);
    }
  }
  return {
    connected: queue,
    won:
      visited.has(size * size - 1) &&
      !!(board.at(-1) & 2) &&
      flowers.every((cell) => visited.has(cell)),
  };
}
export function createCampaignGame({ level, onFinish, sound = () => {} }) {
  const clock = createCampaignClock(onFinish, sound),
    { size, flowers } = level;
  let board = [...level.board],
    selected = 0,
    pressed = -1,
    flow = traceCampaignPipes(board, size, flowers);
  function turn(cell) {
    if (!clock.active || cell < 0) return;
    board[cell] = ((board[cell] << 1) & 15) | (board[cell] >> 3);
    selected = cell;
    clock.step();
    flow = traceCampaignPipes(board, size, flowers);
    sound('tap');
    if (flow.won) clock.finish(true);
  }
  return {
    update: clock.update,
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = -1;
        return;
      }
      if (!clock.active) return;
      if (type === 'primary-down') pressed = cellAt(payload, size);
      if (type === 'primary-up') {
        const cell = cellAt(payload, size);
        if (cell === pressed) turn(cell);
        pressed = -1;
      }
      if (type === 'key-down' && !payload.repeat) {
        selected = moveSelection(selected, payload.key, size);
        if ([' ', 'Enter'].includes(payload.key)) turn(selected);
      }
    },
    getState() {
      return {
        ...clock.state(),
        size,
        bounds: GRID,
        board: [...board],
        connected: [...flow.connected],
        selected,
        flowers: [...flowers],
        extra: flowers.length
          ? `花圃 ${flowers.filter((n) => flow.connected.includes(n)).length} / ${flowers.length}`
          : '接通出口',
        hint: level.objective,
      };
    },
    draw(ctx) {
      boardBackground(ctx, '#e4eee5');
      board.forEach((mask, cell) => {
        tile(ctx, cell, size, {
          fill: flow.connected.includes(cell) ? '#d3eadf' : '#f5f1dc',
          selected: cell === selected,
        });
        const { x, y, side } = cellRect(cell, size),
          cx = x + side / 2,
          cy = y + side / 2;
        ctx.strokeStyle = flow.connected.includes(cell) ? '#4e9d9b' : '#b4bc99';
        ctx.lineWidth = side * 0.17;
        ctx.lineCap = 'round';
        for (const [bit, dx, dy] of [
          [1, 0, -1],
          [2, 1, 0],
          [4, 0, 1],
          [8, -1, 0],
        ])
          if (mask & bit) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + dx * side * 0.46, cy + dy * side * 0.46);
            ctx.stroke();
          }
        if (flowers.includes(cell)) glyph(ctx, '✿', cell, size, '#bc715e', 0.28);
      });
      const first = cellRect(0, size),
        last = cellRect(size * size - 1, size);
      ctx.fillStyle = '#407e83';
      ctx.fillRect(0, first.y + first.side * 0.4, 20, first.side * 0.2);
      ctx.fillStyle = flow.won ? '#d59c5c' : '#839c68';
      ctx.fillRect(580, last.y + last.side * 0.4, 20, last.side * 0.2);
    },
    destroy() {
      pressed = -1;
      clock.destroy();
    },
  };
}
