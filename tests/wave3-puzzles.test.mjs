import test from 'node:test';
import assert from 'node:assert/strict';
import { BOX_MAPS, getPuzzle, moveBoxes, createGame as createBoxes } from '../dist/games/boxes.js';
import { rotateMask, pipeMasks, tracePipes, generatePipes, createGame as createPipes } from '../dist/games/pipes.js';

const directions = { U: 'up', R: 'right', D: 'down', L: 'left' };
const keyFor = letter => `Arrow${directions[letter][0].toUpperCase()}${directions[letter].slice(1)}`;
const pipePoint = cell => ({ x: 156 + cell % 4 * 96, y: 91 + Math.floor(cell / 4) * 96 });
const clickPipe = (game, cell) => { game.input('primary-down', pipePoint(cell)); game.input('primary-up', pipePoint(cell)); };
function solveBoxes(puzzle) {
  const key = state => `${state.player}:${[...state.crates].sort((a,b) => a-b).join(',')}`;
  const start = { player: puzzle.player, crates: puzzle.crates, path: '' };
  const queue = [start], seen = new Set([key(start)]);
  for (let head = 0; head < queue.length && head < 150000; head++) {
    const state = queue[head];
    if (state.crates.every(cell => puzzle.goals.includes(cell))) return state.path;
    for (const [letter, direction] of Object.entries(directions)) {
      const next = moveBoxes({ ...puzzle, ...state }, direction);
      if (!next.moved || seen.has(key(next))) continue;
      seen.add(key(next)); queue.push({ player: next.player, crates: next.crates, path: state.path + letter });
    }
  }
  return null;
}

test('all three hand-authored box maps have three crates and goals and BFS solutions', () => {
  for (let index = 0; index < BOX_MAPS.length; index++) {
    const puzzle = getPuzzle(1, index);
    assert.equal(puzzle.board.length, 49);
    assert.equal(puzzle.crates.length, 3); assert.equal(puzzle.goals.length, 3);
    assert.equal(new Set(puzzle.crates).size, 3);
    const found = solveBoxes(puzzle);
    assert.ok(found, `Unsolvable: ${puzzle.mapId}`);
    assert.ok(found.length <= puzzle.solution.length);
    let state = puzzle;
    for (const letter of puzzle.solution) {
      const next = moveBoxes(state, directions[letter]);
      assert.equal(next.moved, true, `${puzzle.mapId}: ${letter}`);
      state = { ...state, ...next };
    }
    assert.ok(state.crates.every(cell => puzzle.goals.includes(cell)));
  }
});

test('box map selection is deterministic and seeds reach all maps', () => {
  const ids = new Set();
  for (let seed = 0; seed < 50; seed++) {
    assert.deepEqual(getPuzzle(seed), getPuzzle(seed));
    ids.add(getPuzzle(seed).mapId);
  }
  assert.equal(ids.size, BOX_MAPS.length);
});

test('boxes cannot walk through walls, push two crates or pull crates', () => {
  const board = ['#','#','#','#','#','#',' ',' ',' ','#','#',' ',' ',' ','#','#',' ',' ',' ','#','#','#','#','#','#'];
  const state = { board, width: 5, height: 5, player: 6, crates: [7,8] };
  assert.equal(moveBoxes(state, 'left').moved, false);
  assert.equal(moveBoxes(state, 'up').moved, false);
  assert.equal(moveBoxes(state, 'right').moved, false);
  const away = moveBoxes({ ...state, player: 12, crates: [11] }, 'right');
  assert.equal(away.moved, true); assert.deepEqual(away.crates, [11]);
  assert.deepEqual(state.crates, [7,8]);
});

test('boxes swipe cancellation and short gestures do not move or add steps', () => {
  const game = createBoxes({ seed: 123 });
  const initial = game.getState();
  game.input('primary-down', {x:300,y:240}); game.input('primary-cancel'); game.input('primary-up', {x:400,y:240});
  game.input('primary-down', {x:300,y:240}); game.input('primary-up', {x:323,y:240});
  assert.equal(game.getState().steps, 0); assert.equal(game.getState().player, initial.player);
  assert.deepEqual(game.getState().crates, initial.crates);
});

test('boxes undo restores both gardener and crate but retains counted steps', () => {
  const game = createBoxes({ seed: 123 });
  const initial = game.getState();
  const puzzle = getPuzzle(123);
  game.input('key-down', {key:keyFor(puzzle.solution[0])});
  assert.equal(game.getState().steps, 1); assert.equal(game.getState().canUndo, true);
  game.input('undo');
  assert.equal(game.getState().player, initial.player); assert.deepEqual(game.getState().crates, initial.crates);
  assert.equal(game.getState().steps, 1); assert.equal(game.getState().canUndo, false);
});

test('boxes all solutions complete with exact score and fire once', () => {
  const seen = new Set();
  for (let seed = 0; seen.size < BOX_MAPS.length && seed < 50; seed++) {
    const puzzle = getPuzzle(seed);
    if (seen.has(puzzle.mapId)) continue;
    seen.add(puzzle.mapId);
    const results = [], game = createBoxes({seed,onFinish: result => results.push(result)});
    for (const letter of puzzle.solution) game.input('key-down', {key:keyFor(letter)});
    assert.equal(results.length, 1); assert.equal(results[0].won, true);
    assert.equal(results[0].steps, puzzle.solution.length);
    assert.equal(results[0].score, 300 + Math.max(0, 150 - puzzle.solution.length * 3));
    game.input('undo'); game.update(181);
    assert.equal(results.length, 1); assert.equal(game.getState().extra, '3 / 3');
  }
});

test('boxes timeout has bounded elapsed and partial score uses placed crates', () => {
  let result;
  const game = createBoxes({seed:123,onFinish: value => { result = value; }});
  const puzzle = getPuzzle(123);
  game.input('key-down', {key:keyFor(puzzle.solution[0])});
  const partial = game.getState().crates.filter(cell => puzzle.goals.includes(cell)).length * 100;
  game.update(181);
  assert.equal(result.reason, 'time'); assert.equal(result.elapsed, 180); assert.equal(result.score, partial);
});

test('pipe masks rotate clockwise and conserve connector count', () => {
  assert.equal(rotateMask(1), 2); assert.equal(rotateMask(8), 1); assert.equal(rotateMask(3), 6);
  assert.equal(rotateMask(3,4), 3); assert.equal(rotateMask(3,-1), 9);
  assert.deepEqual(pipeMasks([5,3],[1,2]), [10,12]);
});

test('pipe flow requires reciprocal connectors and never wraps rows', () => {
  const board = Array(16).fill(0); board[0] = 10; board[1] = 2;
  assert.deepEqual(tracePipes(board).connected, [0]);
  board[1] = 8; assert.deepEqual(tracePipes(board).connected, [0,1]);
  board[1] = 10; board[2] = 10; board[3] = 10; board[4] = 8;
  assert.deepEqual(tracePipes(board).connected, [0,1,2,3]);
  board[0] = 2; assert.deepEqual(tracePipes(board), {connected:[],won:false});
});

test('pipe outlet must have a right-facing connector in addition to reaching cell 15', () => {
  const board = Array(16).fill(0);
  board[0] = 12; board[4] = 5; board[8] = 5; board[12] = 3; board[13] = 10; board[14] = 10; board[15] = 8;
  assert.equal(tracePipes(board).connected.includes(15), true); assert.equal(tracePipes(board).won, false);
  board[15] = 10; assert.equal(tracePipes(board).won, true);
});

test('300 seeded pipe puzzles start unsolved and supplied rotations always solve them', () => {
  for (let seed = 0; seed < 300; seed++) {
    const puzzle = generatePipes(seed);
    assert.deepEqual(generatePipes(seed), puzzle);
    assert.equal(tracePipes(pipeMasks(puzzle.types,puzzle.rotations)).won, false);
    assert.ok(puzzle.solution.some(turns => turns > 0));
    assert.equal(puzzle.path[0],0); assert.equal(puzzle.path.at(-1),15); assert.equal(new Set(puzzle.path).size,7);
    const rotations = puzzle.rotations.map((turn,index) => (turn+puzzle.solution[index])%4);
    assert.deepEqual(rotations,puzzle.solvedRotations);
    assert.equal(tracePipes(pipeMasks(puzzle.types,rotations)).won, true);
  }
});

test('pipes cancelled taps, release on another cell and repeated keyboard presses do not turn', () => {
  const game = createPipes({seed:123});
  const initial = game.getState().rotations;
  game.input('primary-down',pipePoint(0)); game.input('primary-cancel'); game.input('primary-up',pipePoint(0));
  game.input('primary-down',pipePoint(0)); game.input('primary-up',pipePoint(1));
  game.input('key-down',{key:' ',repeat:true});
  assert.deepEqual(game.getState().rotations,initial); assert.equal(game.getState().steps,0);
  game.input('key-down',{key:'ArrowLeft'}); assert.equal(game.getState().selected,3);
  game.input('key-down',{key:'Enter'}); assert.equal(game.getState().rotations[3],(initial[3]+1)%4);
});

test('pipes real tap solution completes once with exact move-based bonus', () => {
  const seed = 123, puzzle = generatePipes(seed), results = [];
  const game = createPipes({seed,onFinish: result => results.push(result)});
  for (let cell = 0; cell < 16; cell++) for (let turn = 0; turn < puzzle.solution[cell]; turn++) clickPipe(game,cell);
  assert.equal(results.length,1); assert.equal(results[0].won,true);
  assert.equal(results[0].score,300+Math.max(0,120-results[0].steps*2));
  game.update(181); clickPipe(game,0); assert.equal(results.length,1);
});

test('pipes timeout returns actual connected partial score exactly once', () => {
  const results = [], game = createPipes({seed:123,onFinish: result => results.push(result)});
  clickPipe(game,0);
  const partial = game.getState().connected.length*10;
  game.update(181); game.update(1);
  assert.equal(results.length,1); assert.equal(results[0].elapsed,180); assert.equal(results[0].reason,'time');
  assert.equal(results[0].score,partial);
});
