import { createResultRules } from '@playground/game-sdk/rules';
import { manifest } from './manifest.js';
import { generateLights, toggledBoard } from './model.js';

function verify(result, { seed }) {
  const invalid = (field, message) => [{ field, code: 'invalid_proof', message }];
  if (typeof result.proof !== 'string')
    return invalid('proof', '操作记录：缺失，请更新网站后重新开始游戏');
  if (result.proof.length > 100000)
    return invalid('proof', '操作记录：最多允许 100000 个操作，请重新开局后提交');
  if (/[^0-9a-fu]/.test(result.proof))
    return invalid('proof', '操作记录：包含无效操作，请重新游玩后提交');
  let board = generateLights(seed).board,
    steps = 0,
    solved = false;
  const history = [];
  for (const action of result.proof) {
    if (solved) return invalid('proof', '操作记录：通关后不能继续操作，请重新游玩后提交');
    if (action === 'u') {
      if (!history.length) return invalid('proof', '撤销记录：没有可撤销的操作，请重新游玩后提交');
      board = history.pop();
    } else {
      history.push(board);
      board = toggledBoard(board, parseInt(action, 16));
      steps++;
    }
    solved = board.every((value) => value === 0);
  }
  if (steps !== result.steps || solved !== result.won)
    return invalid('proof', '操作记录、步数与通关状态：与本局棋盘不符，请重新游玩后提交');
  return [];
}
export const rules = createResultRules({
  manifest,
  cap: 100000,
  increment: 0,
  counters: { steps: 100000 },
  check: (r) => r.score === r.steps && (!r.won || r.steps > 0),
  proof: true,
  verify,
  compare: (next, previous) => {
    if (next.won !== previous.won) return next.won;
    if (!next.won) return false;
    return (
      next.steps < previous.steps ||
      (next.steps === previous.steps && next.elapsed < previous.elapsed)
    );
  },
  format: (r) => (r.won ? `${r.steps} 步 · ${Math.ceil(r.elapsed)} 秒` : '已尝试，等待点亮灵感'),
  stored: (r) => Number.isInteger(r.steps) && r.steps >= 0,
  ranking: { field: 'steps', sign: 1, requiresWin: true },
});
