import { levelSession, boardInput, drawCells } from '@playground/game-sdk/level';
export function createCampaignGame(options) {
  const { level } = options,
    session = levelSession(options),
    s = session.state,
    board = [...level.board],
    matched = new Set();
  let face = [],
    wait = 0;
  const cols = level.cols,
    rows = Math.ceil(board.length / cols);
  const controls = boardInput({
    cols,
    rows,
    activate(i) {
      if (
        i >= board.length ||
        !session.active ||
        s.elapsed < level.preview ||
        wait > 0 ||
        matched.has(i) ||
        face.includes(i)
      )
        return;
      face.push(i);
      if (face.length === 2) {
        session.step();
        if (board[face[0]] === board[face[1]]) {
          face.forEach((n) => matched.add(n));
          face = [];
          s.score = (matched.size / 2) * 100;
          if (matched.size === board.length) session.finish(true);
        } else {
          wait = 0.75;
          s.mistakes++;
        }
      }
    },
  });
  return {
    update(dt) {
      session.update(dt);
      if (wait > 0) {
        wait -= dt;
        if (wait <= 0) face = [];
      }
    },
    input: controls.input,
    getState() {
      return {
        ...s,
        board: [...board],
        matched: [...matched],
        faceUp: [...face],
        preview: s.elapsed < level.preview,
        extra: `${matched.size / 2} / ${board.length / 2} 对`,
        hint: s.elapsed < level.preview ? '先记住花朵的位置' : '翻开两张相同的花朵',
      };
    },
    draw(ctx) {
      drawCells(ctx, board, cols, rows, {
        selected: controls.selected,
        fill: (v, i) => (matched.has(i) ? '#a9c6a5' : '#f2d4a6'),
        text: (v, i) =>
          matched.has(i) || face.includes(i) || s.elapsed < level.preview
            ? ['✿', '✦', '●', '◆', '☀', '☾', '♧', '♥', '♠', '★'][v]
            : '·',
      });
    },
    destroy: () => session.destroy(),
  };
}
