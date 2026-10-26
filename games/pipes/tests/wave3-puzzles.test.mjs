import test from 'node:test';
import assert from 'node:assert/strict';
import { rotateMask, pipeMasks, tracePipes, generatePipes, createGame as createPipes } from '../src/index.js';

const pipePoint = cell => ({ x: 156 + cell % 4 * 96, y: 91 + Math.floor(cell / 4) * 96 });

const clickPipe = (game, cell) => { game.input('primary-down', pipePoint(cell)); game.input('primary-up', pipePoint(cell)); };

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
