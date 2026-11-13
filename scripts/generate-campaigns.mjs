import { writeFile } from 'node:fs/promises';
import { rng } from '../packages/game-sdk/src/index.js';
import {
  neighbors,
  solveLights,
  slideDistances,
  solveSlide,
  mineAdjacent,
  mineCounts,
  deduceMines,
  parseBoxes,
  solveBoxes,
  directions,
} from './campaign-solvers.mjs';
const stages = ['初见', '熟练', '进阶', '挑战'];
function level(game, index, data, objective) {
  return {
    game,
    number: index + 1,
    title: `${stages[Math.floor(index / 5)]} · ${(index % 5) + 1}`,
    objective,
    ...data,
  };
}
async function save(game, levels) {
  await writeFile(
    new URL(`../games/${game}/src/campaign-data.js`, import.meta.url),
    `// Fixed, verified campaign v1. Reproduce with npm run campaign:generate.\nexport default ${JSON.stringify(levels, null, 2)};\n`,
  );
  console.log(
    game,
    levels.map((x) => x.minMoves ?? x.minPushes ?? x.mineCount ?? x.path.length).join(','),
  );
}
const random = rng('playground-campaign-authoring-v1');
const shuffle = (values) => {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
const lights = [],
  usedLights = new Set(),
  depths = [1, 2, 2, 3, 3, 3, 4, 4, 5, 5, 5, 6, 7, 8, 8, 9, 10, 10, 11, 12];
for (let index = 0; index < 20; index++) {
  const size = index < 5 ? 3 : index < 10 ? 4 : 5,
    target = depths[index];
  let puzzle;
  for (let attempt = 0; attempt < 200000; attempt++) {
    const presses = shuffle(Array.from({ length: size * size }, (_, i) => i)).slice(0, target),
      board = Array(size * size).fill(0);
    for (const cell of presses) for (const at of [cell, ...neighbors(cell, size)]) board[at] ^= 1;
    const solution = solveLights(board, size),
      key = `${size}:${board.join('')}`;
    if (solution.length === target && !usedLights.has(key)) {
      usedLights.add(key);
      puzzle = { size, board, solution, minMoves: target };
      break;
    }
  }
  if (!puzzle) throw Error(`灯塔 ${index + 1}：没有合适题目`);
  lights.push(level('lights', index, puzzle, '点击翻转十字区域，让全部灯光熄灭。'));
}
await save('lights', lights);
const distances = slideDistances(),
  slideDepths = [4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26],
  slides = [];
for (let index = 0; index < 20; index++) {
  const candidates = [...distances].filter(([, depth]) => depth === slideDepths[index]),
    key = candidates[Math.floor(random() * candidates.length)][0],
    board = [...key].map(Number);
  slides.push(
    level(
      'slide',
      index,
      { size: 3, board, minMoves: slideDepths[index], solution: solveSlide(board, distances) },
      '滑动相邻方块，按 1 到 8 排好小屋。',
    ),
  );
}
await save('slide', slides);
const mines = [],
  usedMines = new Set();
for (let index = 0; index < 20; index++) {
  const stage = Math.floor(index / 5),
    size = [4, 5, 6, 6][stage],
    mineCount = [3, 5, 7, 8][stage],
    candidates = Array.from({ length: size * size }, (_, i) => i).filter(
      (i) => ![0, ...mineAdjacent(0, size)].includes(i),
    );
  let puzzle;
  for (let attempt = 0; attempt < 200000; attempt++) {
    const bombs = shuffle(candidates)
        .slice(0, mineCount)
        .sort((a, b) => a - b),
      key = `${size}:${bombs}`;
    if (usedMines.has(key)) continue;
    const proof = deduceMines(size, bombs);
    if (
      proof.solved &&
      proof.initial < size * size - mineCount &&
      (stage < 3 || proof.subsets > 0)
    ) {
      puzzle = {
        size,
        mines: bombs,
        mineCount,
        counts: mineCounts(size, bombs),
        solution: proof.trace,
        subsetDeductions: proof.subsets,
      };
      usedMines.add(key);
      break;
    }
  }
  if (!puzzle) throw Error(`扫雷 ${index + 1}：没有无猜题目`);
  mines.push(
    level(
      'mines',
      index,
      puzzle,
      `从左上角安全格出发，推理找出 ${mineCount} 颗雷，翻开全部安全格。`,
    ),
  );
}
await save('mines', mines);
const pipes = [],
  pathLengths = [7, 7, 9, 9, 11, 9, 11, 11, 13, 15, 13, 15, 17, 19, 21, 19, 21, 23, 25, 27];
function pipePath(size, length) {
  let visits = 0;
  const path = [0],
    used = new Set(path);
  function search() {
    if (++visits > 200000) return false;
    const at = path.at(-1),
      remaining = length - path.length,
      distance = 2 * (size - 1) - (at % size) - Math.floor(at / size);
    if (distance > remaining || (remaining - distance) % 2) return false;
    if (at === size * size - 1) return remaining === 0;
    if (!remaining) return false;
    for (const next of shuffle(neighbors(at, size))) {
      if (used.has(next)) continue;
      used.add(next);
      path.push(next);
      if (search()) return true;
      path.pop();
      used.delete(next);
    }
    return false;
  }
  if (!search()) throw Error('水管路线生成失败');
  return path;
}
const rotate = (mask) => ((mask << 1) & 15) | (mask >> 3);
for (let index = 0; index < 20; index++) {
  const stage = Math.floor(index / 5),
    size = [4, 4, 5, 6][stage],
    path = pipePath(size, pathLengths[index]),
    flowers = Array.from(
      { length: stage },
      (_, i) => path[Math.floor(((i + 1) * (path.length - 1)) / (stage + 1))],
    );
  const solved = Array.from({ length: size * size }, () => [3, 5, 7][Math.floor(random() * 3)]);
  const exit = (from, to) =>
    to - from === 1 ? 2 : to - from === -1 ? 8 : to - from === size ? 4 : 1;
  path.forEach((cell, i) => {
    solved[cell] =
      (i === 0 ? 8 : exit(cell, path[i - 1])) |
      (i === path.length - 1 ? 2 : exit(cell, path[i + 1]));
  });
  const turns = solved.map(() => Math.floor(random() * 4)),
    board = solved.map((mask, i) => {
      for (let j = 0; j < turns[i]; j++) mask = rotate(mask);
      return mask;
    });
  while (board[0] & 8) {
    board[0] = rotate(board[0]);
    turns[0] = (turns[0] + 1) % 4;
  }
  pipes.push(
    level(
      'pipes',
      index,
      { size, board, path, flowers, solution: turns.map((n) => (4 - n) % 4) },
      flowers.length
        ? `接通水源和出口，并浇到全部 ${flowers.length} 处花圃。`
        : '旋转水管，把左侧水源接到右下角出口。',
    ),
  );
}
await save('pipes', pipes);
// Twenty distinct garden layouts. Pulling from solved positions supplies candidate
// starts; a push-state BFS verifies and grades each final authored puzzle.
const gardens = [
  ['#######', '#     #', '#     #', '#  .  #', '#     #', '# @   #', '#######'],
  ['#######', '# #   #', '#   . #', '#     #', '#  #  #', '# @   #', '#######'],
  ['#######', '#   # #', '# .   #', '#     #', '# #   #', '#  @  #', '#######'],
  ['#######', '#     #', '#  #  #', '#   . #', '#     #', '# @ # #', '#######'],
  ['#######', '#     #', '# . # #', '#     #', '##    #', '#   @ #', '#######'],
  ['#######', '# . . #', '#     #', '#     #', '#  #  #', '# @   #', '#######'],
  ['#######', '# .#  #', '#     #', '#     #', '#     #', '# @#. #', '#######'],
  ['#######', '# .   #', '#   # #', '#     #', '#     #', '# . @ #', '#######'],
  ['#######', '# . # #', '#     #', '##    #', '#     #', '# @.  #', '#######'],
  ['#######', '#  .  #', '#     #', '#    ##', '#     #', '# .@# #', '#######'],
  ['#######', '# . . #', '#     #', '#     #', '#     #', '# @.# #', '#######'],
  ['#######', '# .#. #', '#     #', '#     #', '#     #', '# @.  #', '#######'],
  ['#######', '# .   #', '#   # #', '#     #', '#     #', '# .@. #', '#######'],
  ['#######', '# # . #', '#     #', '#     #', '#     #', '# .@. #', '#######'],
  ['#######', '# . . #', '#     #', '##    #', '#     #', '# @ . #', '#######'],
  ['#######', '# . . #', '#     #', '#  #  #', '#     #', '# .@. #', '#######'],
  ['#######', '# .#. #', '#     #', '#     #', '#     #', '# .@. #', '#######'],
  ['#######', '# . . #', '#     #', '#  @  #', '#  #  #', '# . . #', '#######'],
  ['#######', '# . . #', '#     #', '#     #', '#     #', '# .@. #', '#######'],
  ['#######', '# # . #', '#     #', '#     #', '#     #', '# ..@.#', '#######'],
];
const boxes = [];
const goalDistance = (crates, goals) => {
  if (!crates.length) return 0;
  const cell = crates[0];
  return Math.min(
    ...goals.map(
      (goal, i) =>
        Math.abs((cell % 7) - (goal % 7)) +
        Math.abs(Math.floor(cell / 7) - Math.floor(goal / 7)) +
        goalDistance(
          crates.slice(1),
          goals.filter((_, j) => j !== i),
        ),
    ),
  );
};
for (let index = 0; index < 20; index++) {
  const base = parseBoxes(gardens[index]),
    floor = base.board,
    goals = base.goals;
  let best;
  for (let attempt = 0; attempt < 18; attempt++) {
    let player = base.player,
      crates = [...goals],
      peak = { player, crates: [...crates], distance: 0 };
    const visited = new Set();
    for (let step = 0; step < 35 + index * 2; step++) {
      const reachable = new Set([player]),
        queue = [player];
      for (let head = 0; head < queue.length; head++)
        for (const delta of [-7, 1, 7, -1]) {
          const at = queue[head] + delta;
          if (
            floor[at] !== undefined &&
            floor[at] !== '#' &&
            !crates.includes(at) &&
            !reachable.has(at)
          ) {
            reachable.add(at);
            queue.push(at);
          }
        }
      const actions = [];
      for (const crate of crates)
        for (const [dx, dy] of directions) {
          const delta = dy * 7 + dx,
            behind = crate + delta,
            ahead = crate + delta * 2;
          if (
            !reachable.has(behind) ||
            floor[ahead] === undefined ||
            floor[ahead] === '#' ||
            crates.includes(ahead)
          )
            continue;
          const next = crates.map((c) => (c === crate ? behind : c)),
            key = [...next].sort((a, b) => a - b).join(',');
          if (!visited.has(key)) actions.push({ ahead, next, key });
        }
      if (!actions.length) break;
      const action = actions[Math.floor(random() * actions.length)];
      visited.add(action.key);
      crates = action.next;
      player = action.ahead;
      const distance = goalDistance(crates, goals);
      if (distance >= peak.distance) peak = { player, crates: [...crates], distance };
    }
    player = peak.player;
    crates = peak.crates;
    const cells = [...floor];
    goals.forEach((c) => (cells[c] = '.'));
    crates.forEach((c) => (cells[c] = goals.includes(c) ? '*' : '$'));
    cells[player] = goals.includes(player) ? '+' : '@';
    const rows = Array.from({ length: 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7).join(''));
    const solved = solveBoxes(rows, 80000);
    if (solved?.minPushes > 0 && (!best || solved.minPushes > best.minPushes))
      best = { rows, ...solved };
  }
  if (!best) throw Error(`推箱子 ${index + 1}：没有合适题目`);
  boxes.push({ ...best, boxCount: goals.length });
}
const ordered = [];
for (let stage = 0; stage < 4; stage++)
  ordered.push(...boxes.slice(stage * 5, stage * 5 + 5).sort((a, b) => a.minPushes - b.minPushes));
await save(
  'boxes',
  ordered.map(({ states: _states, ...data }, index) =>
    level(
      'boxes',
      index,
      { size: 7, ...data },
      `把 ${data.boxCount} 个木箱全部推到花圃上；留意绕行和推动顺序。`,
    ),
  ),
);
