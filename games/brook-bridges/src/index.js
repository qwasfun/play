import { label, roundRect } from '@playground/game-sdk';
import { BROOK_BRIDGES, edgeKey, edgesCross, evaluateBridges, generatePuzzles } from './puzzles.js';

export {
  availableEdges,
  BROOK_BRIDGES,
  countSolutions,
  edgeKey,
  edgesCross,
  evaluateBridges,
  generatePuzzles,
} from './puzzles.js';

const BOARD_X = 90;
const BOARD_Y = 70;
const COLUMN_STEP = 70;
const ROW_STEP = 52;
const ISLAND_RADIUS = 25;
const moveKeys = new Map([
  ['arrowleft', [0, -1]],
  ['a', [0, -1]],
  ['arrowright', [0, 1]],
  ['d', [0, 1]],
  ['arrowup', [-1, 0]],
  ['w', [-1, 0]],
  ['arrowdown', [1, 0]],
  ['s', [1, 0]],
]);

export const islandPoint = (island) => ({
  x: BOARD_X + island.column * COLUMN_STEP,
  y: BOARD_Y + island.row * ROW_STEP,
});

export const bridgePoint = (puzzle, edge) => {
  const islands = Object.fromEntries(puzzle.islands.map((island) => [island.id, island]));
  const start = islandPoint(islands[edge.from]);
  const end = islandPoint(islands[edge.to]);
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
};

const distanceToSegment = (point, start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  if (!length) return Math.hypot(point.x - start.x, point.y - start.y);
  const amount = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length),
  );
  return Math.hypot(point.x - (start.x + dx * amount), point.y - (start.y + dy * amount));
};

function islandAt(puzzle, point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return -1;
  return puzzle.islands.findIndex((island) => {
    const center = islandPoint(island);
    return Math.hypot(point.x - center.x, point.y - center.y) <= ISLAND_RADIUS + 7;
  });
}

function edgeAt(puzzle, point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return -1;
  const byId = Object.fromEntries(puzzle.islands.map((island) => [island.id, island]));
  return puzzle.edges.findIndex((edge) => {
    const start = islandPoint(byId[edge.from]);
    const end = islandPoint(byId[edge.to]);
    const near = distanceToSegment(point, start, end) <= 12;
    const awayFromEnds =
      Math.hypot(point.x - start.x, point.y - start.y) > ISLAND_RADIUS + 5 &&
      Math.hypot(point.x - end.x, point.y - end.y) > ISLAND_RADIUS + 5;
    return near && awayFromEnds;
  });
}

function hitTarget(puzzle, point) {
  const island = islandAt(puzzle, point);
  if (island >= 0) return `island:${puzzle.islands[island].id}`;
  const edge = edgeAt(puzzle, point);
  return edge >= 0 ? `edge:${edge}` : '';
}

function nextIsland(puzzle, cursor, rowStep, columnStep) {
  const current = puzzle.islands[cursor];
  let best = cursor;
  let distance = Infinity;
  puzzle.islands.forEach((island, index) => {
    if (index === cursor) return;
    const rowDistance = island.row - current.row;
    const columnDistance = island.column - current.column;
    if (rowStep && Math.sign(rowDistance) !== rowStep) return;
    if (columnStep && Math.sign(columnDistance) !== columnStep) return;
    const next =
      Math.abs(rowDistance) +
      Math.abs(columnDistance) +
      Math.abs(rowStep ? columnDistance : rowDistance) * 0.35;
    if (next < distance) {
      best = index;
      distance = next;
    }
  });
  return best;
}

export function createGame({ seed, onFinish = () => {}, sound = () => {} }) {
  const puzzles = generatePuzzles(seed);
  let round = 0;
  let rounds = 0;
  let counts = Array(puzzles[0].edges.length).fill(0);
  let cursor = 0;
  let selected = '';
  let pressed = '';
  let elapsed = 0;
  let moves = 0;
  let phase = 'play';
  let transition = 0;
  let history = [];
  let finished = false;
  let won = false;
  let message = '先看数字较小的溪石，找出它唯一能通往的方向';

  const puzzle = () => puzzles[Math.min(round, puzzles.length - 1)];
  const status = () => evaluateBridges(puzzle(), counts);
  const byId = () => Object.fromEntries(puzzle().islands.map((island) => [island.id, island]));

  function finish(success) {
    if (finished) return;
    finished = true;
    won = success;
    onFinish({ score: rounds * BROOK_BRIDGES.score, elapsed, won, rounds });
  }

  function completeIfReady() {
    const current = status();
    if (!current.solved) return;
    rounds++;
    selected = '';
    history = [];
    sound('win');
    if (rounds === BROOK_BRIDGES.rounds) {
      message = '三处溪湾都连起来啦，花香正沿着小桥慢慢飘远！';
      finish(true);
      return;
    }
    phase = 'transition';
    transition = 0.7;
    message = `${puzzle().name}连通啦，下一处溪湾正顺着水声展开`;
  }

  function wouldCross(index) {
    const current = puzzle();
    const candidate = current.edges[index];
    const islands = byId();
    const segment = { a: islands[candidate.from], b: islands[candidate.to] };
    return current.edges.some((edge, other) => {
      if (other === index || counts[other] === 0) return false;
      return edgesCross(segment, { a: islands[edge.from], b: islands[edge.to] });
    });
  }

  function cycleEdge(index) {
    if (phase !== 'play' || index < 0 || index >= counts.length) return;
    const next = (counts[index] + 1) % 3;
    if (next > 0 && counts[index] === 0 && wouldCross(index)) {
      message = '这座桥会和别的小桥交叉，换一条水路试试';
      sound('miss');
      return;
    }
    const edge = puzzle().edges[index];
    const current = status();
    const first = byId()[edge.from];
    const second = byId()[edge.to];
    const increase = next > counts[index] ? 1 : -counts[index];
    if (
      increase > 0 &&
      (current.degrees[first.id] + increase > first.target ||
        current.degrees[second.id] + increase > second.target)
    ) {
      message = '这会让溪石旁的桥太多啦，先拆一座或换个方向';
      sound('miss');
      return;
    }
    history.push({ counts: [...counts], moves, selected });
    counts[index] = next;
    moves++;
    sound('tap');
    const after = status();
    const matched = puzzle().islands.filter(
      (island) => after.degrees[island.id] === island.target,
    ).length;
    message = next
      ? `已搭${next === 2 ? '两座' : '一座'}小桥，${matched}/${puzzle().islands.length} 块溪石数字刚刚好`
      : '已把这段小桥收起，水面又安静下来';
    completeIfReady();
  }

  function connectTo(id) {
    if (!selected) {
      selected = id;
      message = `已选中数字 ${byId()[id].target} 的溪石，再选一块同方向的邻石`;
      return;
    }
    if (selected === id) {
      selected = '';
      message = '已放下这块溪石，重新挑一处起点吧';
      return;
    }
    const index = puzzle().edges.findIndex((edge) => edge.key === edgeKey(selected, id));
    if (index < 0) {
      selected = id;
      message = '两块溪石之间没有笔直水路，已改选新的起点';
      return;
    }
    cycleEdge(index);
    selected = id;
  }

  function undo() {
    if (phase !== 'play' || !history.length) {
      message = '现在还没有可以撤销的搭桥动作';
      return;
    }
    const previous = history.pop();
    counts = previous.counts;
    moves = previous.moves;
    selected = previous.selected;
    message = '已把上一座小桥恢复原样，计时仍会继续';
    sound('tap');
  }

  return {
    update(dt) {
      if (finished || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, BROOK_BRIDGES.limit - elapsed);
      while (remaining > 1e-9 && !finished) {
        if (phase === 'transition') {
          const step = Math.min(remaining, transition);
          elapsed += step;
          transition -= step;
          remaining -= step;
          if (transition <= 1e-9) {
            round = rounds;
            counts = Array(puzzle().edges.length).fill(0);
            cursor = 0;
            selected = '';
            history = [];
            phase = 'play';
            message = `第 ${round + 1} 处是${puzzle().name}，先从边缘溪石的数字看起`;
          }
          continue;
        }
        elapsed += remaining;
        remaining = 0;
      }
      if (!finished && elapsed >= BROOK_BRIDGES.limit - 1e-9) finish(false);
    },
    input(type, payload = {}) {
      if (type === 'primary-cancel') {
        pressed = '';
        return;
      }
      if (finished || phase !== 'play') return;
      if (type === 'primary-down') pressed = hitTarget(puzzle(), payload);
      if (type === 'primary-up') {
        const target = hitTarget(puzzle(), payload);
        if (target && target === pressed) {
          if (target.startsWith('island:')) connectTo(target.slice(7));
          if (target.startsWith('edge:')) cycleEdge(Number(target.slice(5)));
        }
        pressed = '';
      }
      if (type === 'undo') undo();
      if (type === 'key-down' && !payload.repeat) {
        const key = String(payload.key).toLowerCase();
        if (moveKeys.has(key)) cursor = nextIsland(puzzle(), cursor, ...moveKeys.get(key));
        if (key === ' ' || key === 'enter') connectTo(puzzle().islands[cursor].id);
        if (key === 'z' || key === 'backspace' || key === 'delete') undo();
      }
    },
    getState() {
      const current = status();
      return {
        elapsed,
        score: rounds * BROOK_BRIDGES.score,
        rounds,
        round,
        phase,
        counts: [...counts],
        puzzle: {
          ...puzzle(),
          islands: puzzle().islands.map((island) => ({ ...island })),
          edges: puzzle().edges.map((edge) => ({ ...edge })),
          solution: [...puzzle().solution],
        },
        degrees: { ...current.degrees },
        connected: current.connected,
        crossing: current.crossing,
        cursor,
        selected,
        moves,
        finished,
        won,
        extra: `${rounds} / 3 · 对数 ${puzzle().islands.filter((island) => current.degrees[island.id] === island.target).length}/${puzzle().islands.length}`,
        hint: message,
      };
    },
    draw(ctx) {
      const current = puzzle();
      const evaluation = status();
      const islands = byId();
      ctx.fillStyle = '#f4eddf';
      ctx.fillRect(0, 0, 600, 480);
      label(ctx, '花溪搭桥', 300, 25, 27);
      label(ctx, `第 ${Math.min(round + 1, 3)} 处 · ${current.name}`, 300, 50, 14, '#68766a');
      roundRect(ctx, 54, 56, 492, 354, 32, '#9bbfba');
      roundRect(ctx, 66, 65, 468, 336, 26, '#dce6d5');
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = '#f7f1d7';
      ctx.lineWidth = 3;
      for (let rowLine = 0; rowLine < 5; rowLine++) {
        ctx.beginPath();
        ctx.moveTo(72, 102 + rowLine * 63);
        ctx.bezierCurveTo(190, 72 + rowLine * 68, 386, 138 + rowLine * 56, 528, 96 + rowLine * 65);
        ctx.stroke();
      }
      ctx.restore();
      current.edges.forEach((edge, index) => {
        const count = counts[index];
        if (!count) return;
        drawBridge(ctx, islands[edge.from], islands[edge.to], count);
      });
      current.islands.forEach((island, index) => {
        const degree = evaluation.degrees[island.id];
        const exact = degree === island.target;
        drawIsland(ctx, island, degree, exact, cursor === index, selected === island.id);
      });
      label(ctx, message, 300, 433, 13, '#617064');
      label(
        ctx,
        '点两块溪石搭桥 · 方向键 / WASD 选择 · 空格连接 · Z 撤销',
        300,
        458,
        12,
        '#77746a',
      );
    },
    destroy() {
      finished = true;
      counts = [];
      history = [];
      selected = '';
      pressed = '';
    },
  };
}

function drawBridge(ctx, first, second, count) {
  const start = islandPoint(first);
  const end = islandPoint(second);
  const horizontal = first.row === second.row;
  const offsetX = horizontal ? 0 : 5;
  const offsetY = horizontal ? 5 : 0;
  const offsets = count === 1 ? [0] : [-1, 1];
  offsets.forEach((direction) => {
    ctx.beginPath();
    ctx.moveTo(start.x + offsetX * direction, start.y + offsetY * direction);
    ctx.lineTo(end.x + offsetX * direction, end.y + offsetY * direction);
    ctx.strokeStyle = '#806e51';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = '#ead4a4';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

function drawIsland(ctx, island, degree, exact, cursor, selected) {
  const { x, y } = islandPoint(island);
  ctx.beginPath();
  ctx.arc(x, y, ISLAND_RADIUS + (selected ? 4 : 0), 0, Math.PI * 2);
  ctx.fillStyle = selected ? '#fff1bd' : exact ? '#d8e8c8' : '#f7ead0';
  ctx.fill();
  ctx.strokeStyle = selected ? '#c28a4b' : cursor ? '#557360' : '#769080';
  ctx.lineWidth = selected ? 5 : cursor ? 4 : 3;
  ctx.stroke();
  label(ctx, island.target, x, y - 2, 20, exact ? '#4e7558' : '#405f57', 'center', 750);
  if (degree > 0) label(ctx, `${degree}/${island.target}`, x, y + 17, 9, '#6e7569');
}
