import { levelSession, boardInput, drawCells } from '@playground/game-sdk/level';
import { findGroup, collapseBubbles } from './model.js';
export function createCampaignGame(options) {
  const { level } = options,
    session = levelSession(options),
    s = session.state;
  let board = [...level.board];
  const controls = boardInput({
    cols: level.size,
    activate(i) {
      if (!session.active) return;
      const group = findGroup(board, i, level.size, level.size);
      if (group.length < 2) return;
      session.step();
      group.forEach((n) => (board[n] = null));
      board = collapseBubbles(board, level.size, level.size);
      s.score += group.length ** 2 * 10;
      if (board.every((v) => v == null)) session.finish(true);
      else if (
        !board.some((v, j) => v != null && findGroup(board, j, level.size, level.size).length >= 2)
      )
        session.finish(false, 'no-groups');
    },
  });
  return {
    update: (dt) => session.update(dt),
    input: controls.input,
    getState() {
      return {
        ...s,
        board: [...board],
        extra: `剩余 ${board.filter((v) => v != null).length}`,
        hint: '消除相邻同色气泡，清空整个花园',
      };
    },
    draw(ctx) {
      drawCells(ctx, board, level.size, level.size, {
        selected: controls.selected,
        text: (v) => (v == null ? '' : ['✿', '✦', '●', '◆', '☀'][v]),
      });
    },
    destroy: () => session.destroy(),
  };
}
