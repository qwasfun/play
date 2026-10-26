import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBubbles,findGroup,collapseBubbles,createGame as bubbles} from '../dist/games/bubbles.js';
import {generateSlide,slideNeighbors,moveSlide,createGame as slide} from '../dist/games/slide.js';

const bubblePoint=cell=>({x:108+cell%5*96,y:96+Math.floor(cell/5)*96});
const slidePoint=cell=>({x:180+cell%3*120,y:118+Math.floor(cell/3)*120});
const tap=(game,point)=>{game.input('primary-down',point);game.input('primary-up',point);};
const goal=[1,2,3,4,5,6,7,8,0];

test('bubbles produces three deterministic varied boards with removable vertical pairs',()=>{
  for(let seed=0;seed<220;seed++){
    const boards=generateBubbles(seed);assert.deepEqual(boards,generateBubbles(seed));assert.equal(boards.length,3);
    for(const board of boards){
      assert.equal(board.length,20);assert.ok(new Set(board).size>=3);
      for(let i=0;i<20;i++)assert.ok(findGroup(board,i).length>=2);
    }
  }
  assert.notDeepEqual(generateBubbles(1),generateBubbles(2));
});
test('every arbitrary legal bubble group leaves a clearable board across 220 seeds',()=>{
  for(let seed=0;seed<220;seed++)for(const source of generateBubbles(seed)){
    let board=[...source],turn=0;
    while(board.some(value=>value!==null)){
      const occupied=board.flatMap((value,index)=>value!==null?[index]:[]);
      const cell=occupied[(seed+turn*7)%occupied.length],group=findGroup(board,cell);
      assert.ok(group.length>=2,`${seed}: orphan bubble after ${turn} moves`);
      for(const index of group)board[index]=null;
      board=collapseBubbles(board);turn++;assert.ok(turn<=10);
    }
  }
});
test('bubble grouping includes color zero but cannot wrap row edges',()=>{
  const board=Array(20).fill(null);board[4]=0;board[5]=0;board[9]=0;
  assert.deepEqual(findGroup(board,4),[4,9]);assert.deepEqual(findGroup(board,5),[5]);
  assert.deepEqual(findGroup(board,-1),[]);assert.deepEqual(findGroup(board,20),[]);assert.deepEqual(findGroup(board,0),[]);
});
test('bubble collapse drops pieces, shifts empty columns left and leaves input intact',()=>{
  const board=[0,null,1,null,null,0,null,1,null,null,null,null,null,null,null,null,null,null,null,null];
  const before=[...board],next=collapseBubbles(board);
  assert.deepEqual(board,before);
  assert.deepEqual(next,[null,null,null,null,null,null,null,null,null,null,0,1,null,null,null,0,1,null,null,null]);
});
test('bubbles ordinary touch input clears all sixty bubbles and records group-size score',()=>{
  const results=[],game=bubbles({seed:123,onFinish:result=>results.push(result)});let expected=0;
  for(let guard=0;guard<35&&!game.getState().finished;guard++){
    const state=game.getState();
    if(state.transition>0){game.update(.56);continue;}
    const cell=state.board.findIndex(value=>value!==null),group=findGroup(state.board,cell);
    expected+=group.length*group.length*10;tap(game,bubblePoint(cell));
  }
  assert.equal(results.length,1);assert.equal(results[0].won,true);assert.equal(results[0].cleared,60);assert.equal(results[0].score,expected);
  const done=game.getState();tap(game,bubblePoint(0));game.update(1000);assert.deepEqual(game.getState(),done);assert.equal(results.length,1);
});
test('bubble cancel, mismatched release and repeat never pop a group',()=>{
  const game=bubbles({seed:9}),before=game.getState().board;
  game.input('primary-down',bubblePoint(0));game.input('primary-cancel');game.input('primary-up',bubblePoint(0));
  game.input('primary-down',bubblePoint(0));game.input('primary-up',bubblePoint(1));
  game.input('key-down',{key:' ',repeat:true});tap(game,{x:59,y:70});
  assert.deepEqual(game.getState().board,before);assert.equal(game.getState().score,0);
  const group=findGroup(before,0);game.input('key-down',{key:' ',repeat:false});assert.equal(game.getState().score,group.length*group.length*10);
});
test('bubble keyboard wraps selection and a timeout settles only once',()=>{
  const results=[],game=bubbles({seed:5,onFinish:r=>results.push(r)});
  game.input('key-down',{key:'ArrowLeft'});assert.equal(game.getState().selected,4);
  game.input('key-down',{key:'ArrowUp'});assert.equal(game.getState().selected,19);
  game.update(400);game.update(100);tap(game,bubblePoint(19));
  assert.equal(results.length,1);assert.equal(results[0].elapsed,90);assert.equal(results[0].reason,'time');assert.equal(results[0].won,false);
});
test('sliding puzzles have valid reproducible solutions across 300 seeds',()=>{
  for(let seed=0;seed<300;seed++){
    const puzzle=generateSlide(seed);assert.deepEqual(puzzle,generateSlide(seed));
    assert.deepEqual([...puzzle.board].sort((a,b)=>a-b),[0,1,2,3,4,5,6,7,8]);
    assert.notDeepEqual(puzzle.board,goal);assert.ok(puzzle.solution.length>=20&&puzzle.solution.length<=29);
    let board=puzzle.board;
    for(const cell of puzzle.solution){const next=moveSlide(board,cell);assert.equal(next.moved,true);board=next.board;}
    assert.deepEqual(board,goal);
  }
  assert.notDeepEqual(generateSlide(1),generateSlide(2));
});
test('sliding neighbors and moves cannot cross an edge, move diagonally, or mutate input',()=>{
  assert.deepEqual(slideNeighbors(0),[1,3]);assert.deepEqual(slideNeighbors(8),[5,7]);assert.deepEqual(slideNeighbors(-1),[]);
  const board=[...goal],next=moveSlide(board,5);assert.equal(next.moved,true);assert.deepEqual(board,goal);assert.equal(next.board[8],6);
  assert.equal(moveSlide(board,0).moved,false);assert.equal(moveSlide(board,6).moved,false);assert.equal(moveSlide(board,9).moved,false);
});
test('sliding normal touch solution completes with the exact move reward and settles once',()=>{
  const results=[],game=slide({seed:123,onFinish:r=>results.push(r)}),solution=generateSlide(123).solution;
  for(const cell of solution)tap(game,slidePoint(cell));
  assert.equal(results.length,1);assert.equal(results[0].won,true);assert.equal(results[0].moves,solution.length);
  assert.equal(results[0].score,300+Math.max(0,200-solution.length*5));assert.deepEqual(game.getState().board,goal);
  game.input('undo');tap(game,slidePoint(5));game.update(200);assert.equal(results.length,1);assert.deepEqual(game.getState().board,goal);
});
test('sliding keyboard direction moves the blank and solves the same seeded puzzle',()=>{
  const game=slide({seed:31}),solution=generateSlide(31).solution;
  for(const cell of solution){
    const blank=game.getState().blank,delta=cell-blank,key=delta===1?'ArrowRight':delta===-1?'ArrowLeft':delta===3?'ArrowDown':'ArrowUp';
    game.input('key-down',{key});
  }
  assert.equal(game.getState().won,true);assert.deepEqual(game.getState().board,goal);
});
test('sliding undo restores board but never refunds counted moves',()=>{
  const game=slide({seed:1}),before=game.getState(),cell=generateSlide(1).solution[0];
  tap(game,slidePoint(cell));assert.equal(game.getState().moves,1);assert.equal(game.getState().canUndo,true);
  game.input('undo');assert.deepEqual(game.getState().board,before.board);assert.equal(game.getState().blank,before.blank);assert.equal(game.getState().moves,1);assert.equal(game.getState().canUndo,false);
  game.input('undo');assert.equal(game.getState().moves,1);
});
test('sliding cancellation, out-of-range points, mismatched releases and repeats do not move',()=>{
  const game=slide({seed:1}),before=game.getState(),cell=generateSlide(1).solution[0];
  game.input('primary-down',slidePoint(cell));game.input('primary-cancel');game.input('primary-up',slidePoint(cell));
  game.input('primary-down',slidePoint(cell));game.input('primary-up',slidePoint((cell+1)%9));
  game.input('key-down',{key:'ArrowUp',repeat:true});tap(game,{x:0,y:0});tap(game,{x:Infinity,y:NaN});
  assert.deepEqual(game.getState().board,before.board);assert.equal(game.getState().moves,0);
});
test('sliding timeout reports partial score and destroy never submits a result',()=>{
  const results=[],game=slide({seed:1,onFinish:r=>results.push(r)}),before=game.getState();
  game.update(1000);game.update(100);assert.equal(results.length,1);assert.equal(results[0].elapsed,180);assert.equal(results[0].won,false);assert.equal(results[0].score,before.score);
  const unused=slide({seed:1,onFinish:r=>results.push(r)});unused.destroy();unused.update(1000);tap(unused,slidePoint(0));assert.equal(results.length,1);
});
