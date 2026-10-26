import test from 'node:test';
import assert from 'node:assert/strict';
import {generateConstellations,constellationNodeAt,validConstellationStep,createGame as constellation} from '../dist/games/constellation.js';
import {generateMines,mineNeighbors,revealMeadow,createGame as mines} from '../dist/games/mines.js';

const tap=(game,point)=>{game.input('primary-down',point);game.input('primary-up',point);};
const minePoint=cell=>({x:156+cell%4*96,y:96+Math.floor(cell/4)*96});
const key= (game,value)=>game.input('key-down',{key:value,repeat:false});

test('constellations are deterministic varied Euler puzzles with phone-sized node targets',()=>{
  for(let seed=0;seed<220;seed++){
    const puzzles=generateConstellations(seed);assert.deepEqual(puzzles,generateConstellations(seed));assert.equal(puzzles.length,3);
    for(const puzzle of puzzles){
      assert.ok(puzzle.nodes.length>=5&&puzzle.nodes.length<=7);assert.equal(puzzle.solution.length,puzzle.edges.length+1);
      const path=[];
      for(const node of puzzle.solution){assert.equal(validConstellationStep(puzzle,path,node),true);path.push(node);}
      assert.equal(new Set(puzzle.edges.map(([a,b])=>[a,b].sort().join(':'))).size,puzzle.edges.length);
      for(let a=0;a<puzzle.nodes.length;a++)for(let b=a+1;b<puzzle.nodes.length;b++)assert.ok(Math.hypot(puzzle.nodes[a].x-puzzle.nodes[b].x,puzzle.nodes[a].y-puzzle.nodes[b].y)>=96);
    }
  }
  assert.notDeepEqual(generateConstellations(1),generateConstellations(2));
});

test('constellation touch taps complete all three stages and record every edge once',()=>{
  for(let seed=0;seed<50;seed++){
    const results=[],game=constellation({seed,onFinish:r=>results.push(r)}),puzzles=generateConstellations(seed);
    for(const puzzle of puzzles){for(const node of puzzle.solution)tap(game,puzzle.nodes[node]);game.update(.51);}
    assert.equal(results.length,1);assert.equal(results[0].won,true);assert.equal(results[0].score,700);assert.equal(results[0].steps,20);
    const state=game.getState();game.update(400);tap(game,puzzles[2].nodes[0]);assert.deepEqual(game.getState(),state);
  }
});

test('a constellation drag can draw a whole graph and cancellation retains prior committed edges',()=>{
  const game=constellation({seed:123}),puzzle=generateConstellations(123)[0],first=puzzle.solution[0],second=puzzle.solution[1];
  tap(game,puzzle.nodes[first]);tap(game,puzzle.nodes[second]);
  const before=game.getState();
  game.input('primary-down',puzzle.nodes[second]);game.input('primary-move',puzzle.nodes[puzzle.solution[2]]);game.input('primary-cancel');game.input('primary-up',puzzle.nodes[puzzle.solution[2]]);
  assert.deepEqual(game.getState().path,before.path);assert.equal(game.getState().steps,before.steps);
  game.input('primary-down',puzzle.nodes[second]);
  for(const node of puzzle.solution.slice(2))game.input('primary-move',puzzle.nodes[node]);
  game.input('primary-up',puzzle.nodes[puzzle.solution.at(-1)]);
  assert.equal(game.getState().score,200);assert.equal(game.getState().transition,.5);
});

test('constellation invalid edges cannot skip nodes or reuse a line, and undo retains step count',()=>{
  const game=constellation({seed:123}),puzzle=generateConstellations(123)[0],a=puzzle.solution[0],b=puzzle.solution[1];
  tap(game,puzzle.nodes[a]);tap(game,puzzle.nodes[b]);tap(game,puzzle.nodes[a]);
  assert.deepEqual(game.getState().path,[a,b]);assert.equal(game.getState().steps,1);
  game.input('undo');assert.deepEqual(game.getState().path,[a]);assert.equal(game.getState().steps,1);assert.equal(game.getState().score,0);
  tap(game,puzzle.nodes[b]);assert.equal(game.getState().steps,2);assert.equal(game.getState().score,20);
  assert.equal(validConstellationStep(puzzle,[a],-1),false);assert.equal(validConstellationStep(puzzle,[a],100),false);
});

test('constellation keyboard selection confirms nodes and ignores repeats and cancelled tap',()=>{
  const game=constellation({seed:4}),puzzle=generateConstellations(4)[0];
  key(game,'ArrowLeft');assert.equal(game.getState().selected,puzzle.nodes.length-1);
  key(game,'ArrowRight');assert.equal(game.getState().selected,0);
  game.input('key-down',{key:' ',repeat:true});assert.deepEqual(game.getState().path,[]);
  game.input('primary-down',puzzle.nodes[0]);game.input('primary-cancel');game.input('primary-up',puzzle.nodes[0]);assert.deepEqual(game.getState().path,[]);
  key(game,' ');assert.deepEqual(game.getState().path,[0]);
  assert.equal(constellationNodeAt(puzzle.nodes,-5,-5),-1);assert.equal(constellationNodeAt(puzzle.nodes,NaN,0),-1);
});

test('constellation timeout and destruction settle at most once',()=>{
  const results=[],game=constellation({seed:6,onFinish:r=>results.push(r)});game.update(300);game.update(1);game.input('undo');
  assert.equal(results.length,1);assert.equal(results[0].elapsed,180);assert.equal(results[0].won,false);assert.equal(results[0].reason,'time');
  const silent=[];const other=constellation({seed:6,onFinish:r=>silent.push(r)});other.destroy();other.update(300);assert.equal(silent.length,0);
});

test('mines create reproducible three-mine boards with a safe zero start across 250 seeds',()=>{
  for(let seed=0;seed<250;seed++){
    const puzzle=generateMines(seed);assert.deepEqual(puzzle,generateMines(seed));assert.equal(new Set(puzzle.mines).size,3);assert.equal(puzzle.counts.length,16);
    assert.equal(puzzle.counts[0],0);for(const cell of [0,1,4,5])assert.equal(puzzle.mines.includes(cell),false);
    for(let cell=0;cell<16;cell++)assert.equal(puzzle.counts[cell],puzzle.mines.includes(cell)?-1:mineNeighbors(cell).filter(n=>puzzle.mines.includes(n)).length);
  }
  assert.notDeepEqual(generateMines(1),generateMines(2));
});

test('mine neighbors do not wrap or include themselves, and flood does not reveal flags or bombs',()=>{
  assert.deepEqual(mineNeighbors(0),[1,4,5]);assert.equal(mineNeighbors(5).length,8);assert.deepEqual(mineNeighbors(-1),[]);assert.deepEqual(mineNeighbors(16),[]);
  const{counts,mines:bombs}=generateMines(123),flags=Array(16).fill(false),original=Array(16).fill(false);flags[1]=true;
  const opened=revealMeadow(counts,original,flags,0);assert.equal(opened[0],true);assert.equal(opened[1],false);
  for(const cell of bombs)assert.equal(opened[cell],false);assert.deepEqual(original,Array(16).fill(false));
});

test('mines normal touch input opens every safe cell and completes once over 220 seeds',()=>{
  for(let seed=0;seed<220;seed++){
    const results=[],game=mines({seed,onFinish:r=>results.push(r)}),puzzle=generateMines(seed);
    for(let cell=0;cell<16;cell++)if(!puzzle.mines.includes(cell))tap(game,minePoint(cell));
    assert.equal(results.length,1);assert.equal(results[0].won,true);assert.equal(results[0].score,480);assert.equal(results[0].opened,13);
    const before=game.getState();tap(game,minePoint(puzzle.mines[0]));game.update(500);assert.deepEqual(game.getState(),before);
  }
});

test('mines long holds toggle flags on release and cannot reveal the marked cell',()=>{
  const game=mines({seed:123}),cell=game.getState().mines[0];
  game.input('primary-down',minePoint(cell));game.update(.45);assert.equal(game.getState().flags[cell],false);game.input('primary-up',minePoint(cell));
  assert.equal(game.getState().flags[cell],true);assert.equal(game.getState().finished,false);
  tap(game,minePoint(cell));assert.equal(game.getState().flags[cell],true);assert.equal(game.getState().finished,false);
  game.input('primary-down',minePoint(cell));game.update(.5);game.input('primary-up',minePoint(cell));assert.equal(game.getState().flags[cell],false);
});

test('mines cancel, dragging outside a held cell and mismatched release never reveal or flag',()=>{
  const game=mines({seed:123}),point=minePoint(0);
  game.input('primary-down',point);game.update(.6);game.input('primary-cancel');game.input('primary-up',point);
  game.input('primary-down',point);game.update(.6);game.input('primary-move',minePoint(1));game.input('primary-move',point);game.input('primary-up',point);
  game.input('primary-down',point);game.input('primary-up',minePoint(1));
  assert.equal(game.getState().opened,0);assert.equal(game.getState().flagCount,0);assert.equal(game.getState().finished,false);
});

test('mines keyboard wraps selection, flags with Enter and reveals with Space',()=>{
  const game=mines({seed:123});key(game,'ArrowLeft');assert.equal(game.getState().selected,3);key(game,'ArrowUp');assert.equal(game.getState().selected,15);
  key(game,'Enter');assert.equal(game.getState().flags[15],true);key(game,'Enter');assert.equal(game.getState().flags[15],false);
  key(game,'ArrowRight');key(game,'ArrowDown');assert.equal(game.getState().selected,0);
  game.input('key-down',{key:' ',repeat:true});assert.equal(game.getState().opened,0);key(game,' ');assert.ok(game.getState().opened>=4);
});

test('mines flag cap is three and an opened flower cannot be marked',()=>{
  const game=mines({seed:9});for(const cell of [2,3,6,7]){game.input('primary-down',minePoint(cell));game.update(.5);game.input('primary-up',minePoint(cell));}
  assert.equal(game.getState().flagCount,3);assert.equal(game.getState().flags[7],false);tap(game,minePoint(0));
  game.input('primary-down',minePoint(0));game.update(.5);game.input('primary-up',minePoint(0));assert.equal(game.getState().flags[0],false);
});

test('mines bomb, timeout and destruction have bounded results and a single callback',()=>{
  const results=[],game=mines({seed:123,onFinish:r=>results.push(r)});tap(game,minePoint(game.getState().mines[0]));game.update(500);tap(game,minePoint(0));
  assert.equal(results.length,1);assert.equal(results[0].reason,'mine');assert.equal(results[0].won,false);
  const timed=[],other=mines({seed:4,onFinish:r=>timed.push(r)});other.update(300);other.update(1);assert.equal(timed.length,1);assert.equal(timed[0].elapsed,180);assert.equal(timed[0].reason,'time');
  const silent=[],destroyed=mines({seed:4,onFinish:r=>silent.push(r)});destroyed.destroy();destroyed.update(400);assert.equal(silent.length,0);
});
