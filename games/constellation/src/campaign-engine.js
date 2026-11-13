import { label } from '@playground/game-sdk';
import { levelSession } from '@playground/game-sdk/level';
export function createCampaignGame(options) {
  const { level } = options,
    session = levelSession(options),
    s = session.state;
  let path = [],
    edges = [],
    cursor = 0,
    drag = false,
    pressed = -1;
  function at(p) {
    return level.nodes.findIndex((n) => Math.hypot(n.x - p.x, n.y - p.y) <= 46);
  }
  function act(i) {
    if (!session.active || i < 0) return;
    cursor = i;
    if (!path.length) {
      path = [i];
      return;
    }
    const a = path.at(-1),
      e = level.edges.findIndex(
        ([x, y], j) => !edges.includes(j) && ((x === a && y === i) || (x === i && y === a)),
      );
    if (e < 0) return;
    edges.push(e);
    path.push(i);
    session.step();
    s.score = edges.length;
    if (edges.length === level.edges.length) session.finish(true);
  }
  return {
    update: (dt) => session.update(dt),
    input(type, p = {}) {
      if (type === 'undo') {
        if (session.active && edges.length) {
          edges.pop();
          path.pop();
        } else if (session.active) path = [];
        return;
      }
      if (type === 'primary-down') {
        pressed = at(p);
        drag = true;
        act(pressed);
      }
      if (type === 'primary-move' && drag) {
        const i = at(p);
        if (i >= 0 && i !== path.at(-1)) act(i);
      }
      if (type === 'primary-up' || type === 'primary-cancel') {
        drag = false;
        pressed = -1;
      }
      if (type === 'key-down' && !p.repeat) {
        const k = String(p.key).toLowerCase();
        if (k === 'z' || k === 'backspace') {
          if (session.active && edges.length) {
            edges.pop();
            path.pop();
          } else if (session.active) path = [];
        } else if (k === 'arrowright' || k === 'arrowdown')
          cursor = (cursor + 1) % level.nodes.length;
        else if (k === 'arrowleft' || k === 'arrowup')
          cursor = (cursor + level.nodes.length - 1) % level.nodes.length;
        else if (k === 'enter' || k === ' ') act(cursor);
      }
    },
    getState() {
      return {
        ...s,
        path: [...path],
        used: [...edges],
        cursor,
        extra: `${edges.length} / ${level.edges.length} 条线`,
        hint: '一笔经过每条连线，不重复描线；Z 撤销',
      };
    },
    draw(ctx) {
      ctx.fillStyle = '#edf0e3';
      ctx.fillRect(0, 0, 600, 600);
      level.edges.forEach(([a, b], i) => {
        ctx.strokeStyle = edges.includes(i) ? '#b0b9a8' : '#88a5a3';
        ctx.lineWidth = edges.includes(i) ? 3 : 5;
        ctx.beginPath();
        ctx.moveTo(level.nodes[a].x, level.nodes[a].y);
        ctx.lineTo(level.nodes[b].x, level.nodes[b].y);
        ctx.stroke();
      });
      level.nodes.forEach((n, i) => {
        ctx.fillStyle = i === path.at(-1) ? '#f1c571' : '#fff5cf';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 46, 0, Math.PI * 2);
        ctx.fill();
        if (i === cursor) {
          ctx.strokeStyle = '#315f55';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        label(ctx, '✦', n.x, n.y, 27);
      });
    },
    destroy: () => session.destroy(),
  };
}
