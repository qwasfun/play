import { generateBoard } from '../src/index.js';
// Independent breadth-first planner; replay only real browser inputs, never mutate the running game.
export function solution(board) {
  const key = (b) => b.map((a) => a.join('')).join('|'),
    start = key(board),
    queue = [board],
    seen = new Map([[start, null]]);
  let end;
  for (let n = 0; n < queue.length; n++) {
    const b = queue[n],
      k = key(b);
    if (b.every((a) => !a.length || (a.length === 3 && a.every((v) => v === a[0])))) {
      end = k;
      break;
    }
    for (let from = 0; from < 4; from++)
      for (let to = 0; to < 4; to++) {
        if (from === to || !b[from].length || b[to].length === 3) continue;
        const next = b.map((a) => [...a]);
        next[to].push(next[from].pop());
        const nk = key(next);
        if (!seen.has(nk)) {
          seen.set(nk, { parent: k, move: [from, to] });
          queue.push(next);
        }
      }
  }
  if (end === undefined) throw Error('盘面不可解');
  const moves = [];
  while (end !== start) {
    const node = seen.get(end);
    moves.push(node.move);
    end = node.parent;
  }
  return moves.reverse();
}
export async function play({ page, mobile, point, seed }) {
  for (let round = 0; round < 3; round++) {
    const moves = solution(generateBoard(seed, round));
    for (const [from, to] of moves) {
      if (mobile) {
        await point(90 + from * 140, 220);
        await point(90 + to * 140, 220);
      } else {
        // Exercise keyboard selection and activation as well as desktop mouse input.
        if (round === 0) {
          await page.keyboard.press('ArrowRight');
          await page.keyboard.press('ArrowLeft');
        }
        await point(90 + from * 140, 220);
        await point(90 + to * 140, 220);
      }
      await page.clock.runFor(100);
    }
  }
}
