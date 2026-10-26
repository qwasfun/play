import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBubbles,findGroup,collapseBubbles,createGame as bubbles} from '../src/index.js';

const bubblePoint=cell=>({x:108+cell%5*96,y:96+Math.floor(cell/5)*96});

const tap=(game,point)=>{game.input('primary-down',point);game.input('primary-up',point);};

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
