import { label } from '@playground/game-sdk';
import { levelSession, boardInput, drawCells } from '@playground/game-sdk/level';
export function createCampaignGame(options) {
  const { level } = options,
    session = levelSession(options),
    s = session.state,
    chosen = new Set(),
    cols = level.weights.length <= 6 ? 3 : 5,
    rows = level.weights.length / cols;
  const bounds = { x: 20, y: 160, width: 560, height: 400 };
  const sum = () => [...chosen].reduce((a, i) => a + level.weights[i], 0),
    controls = boardInput({
      cols,
      rows: Math.ceil(rows),
      bounds,
      activate(i) {
        if (!session.active || i >= level.weights.length) return;
        session.step();
        chosen.has(i) ? chosen.delete(i) : chosen.add(i);
        s.score = sum();
        if (sum() === level.target) session.finish(true);
      },
    });
  return {
    update: (dt) => session.update(dt),
    input: controls.input,
    getState() {
      return {
        ...s,
        selected: [...chosen],
        total: sum(),
        extra: `${sum()} / ${level.target}`,
        hint: '选择果篮，让总重量刚好等于目标',
      };
    },
    draw(ctx) {
      drawCells(ctx, level.weights, cols, Math.ceil(rows), {
        bounds,
        selected: controls.selected,
        fill: (v, i) => (chosen.has(i) ? '#a5c6aa' : '#f1ce9a'),
        text: (v) => `${v} 斤`,
      });
      label(ctx, `目标 ${level.target} 斤`, 300, 65, 32);
      label(ctx, `已选 ${sum()} 斤`, 300, 112, 24);
    },
    destroy: () => session.destroy(),
  };
}
