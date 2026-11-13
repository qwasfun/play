import { levelSession, boardInput, drawCells } from '@playground/game-sdk/level';
export function createCampaignGame(options) {
  const { level } = options,
    session = levelSession(options),
    s = session.state;
  let board = [...level.board],
    selected = -1;
  const history = [];
  const controls = boardInput({
    cols: 5,
    extra(type, p) {
      if (
        type === 'undo' ||
        (type === 'key-down' &&
          !p.repeat &&
          ['z', 'backspace', 'u'].includes(String(p.key).toLowerCase()))
      ) {
        if (session.active && history.length) {
          board = history.pop();
          selected = -1;
        }
        return true;
      }
      return false;
    },
    activate(i) {
      if (!session.active) return;
      if (board[i]) {
        selected = i;
        return;
      }
      if (selected < 0) return;
      const a = selected,
        dx = (i % 5) - (a % 5),
        dy = Math.floor(i / 5) - Math.floor(a / 5),
        b = (a + i) / 2;
      if (((Math.abs(dx) === 2 && dy === 0) || (Math.abs(dy) === 2 && dx === 0)) && board[b]) {
        history.push([...board]);
        board[a] = board[b] = 0;
        board[i] = 1;
        selected = -1;
        session.step();
        s.score = level.board.filter(Boolean).length - board.filter(Boolean).length;
        if (board.filter(Boolean).length === 1) session.finish(true);
      }
    },
  });
  return {
    update: (dt) => session.update(dt),
    input: controls.input,
    getState() {
      return {
        ...s,
        board: [...board],
        selected,
        canUndo: history.length > 0,
        extra: `剩余 ${board.filter(Boolean).length} 颗`,
        hint: '先选茶点，再选隔一颗的空位；Z 撤销',
      };
    },
    draw(ctx) {
      drawCells(ctx, board, 5, 5, {
        selected: selected >= 0 ? selected : controls.selected,
        text: (v) => (v ? '●' : '·'),
        fill: (v) => (v ? '#e6bc86' : '#e4e8d9'),
      });
    },
    destroy: () => session.destroy(),
  };
}
