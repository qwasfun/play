import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {campaignLink,parseRoute,playLink,dailyGame,dailySeed} from '@playground/game-registry/core';
import {createCampaignStore,CAMPAIGN_KEY} from '../apps/arcade/src/campaign-storage.js';
import {createStore} from '../apps/arcade/src/storage.js';
import {solveLights,slideDistances,deduceMines,solveBoxes,parseBoxes} from '../scripts/campaign-solvers.mjs';
import {traceCampaignPipes} from '../games/pipes/src/campaign-engine.js';
const ids=['boxes','pipes','mines','lights','slide'],modules={};
for(const id of ids)modules[id]={...await import(`../games/${id}/src/index.js`),...await import(`../games/${id}/src/campaign.js`)};
const point=(cell,size)=>({x:20+(cell%size+.5)*560/size,y:20+(Math.floor(cell/size)+.5)*560/size});
const tap=(game,cell,size)=>{game.input('primary-down',point(cell,size));game.input('primary-up',point(cell,size));};
const keyFor={U:'ArrowUp',R:'ArrowRight',D:'ArrowDown',L:'ArrowLeft'};
function solveEngine(id,game,level){
  if(id==='boxes')for(const direction of level.solution)game.input('key-down',{key:keyFor[direction]});
  if(id==='slide'||id==='lights')for(const cell of level.solution)tap(game,cell,level.size);
  if(id==='pipes')level.solution.forEach((turns,cell)=>{for(let n=0;n<turns;n++)tap(game,cell,level.size);});
  if(id==='mines')for(const{cell,kind}of level.solution){game.input('primary-down',point(cell,level.size));if(kind==='flag')game.update(.46);game.input('primary-up',point(cell,level.size));}
}
for(const id of ids){
  test(`${id}: all twenty fixed levels are distinct, unlimited, solvable through actual inputs and settle once`,()=>{
    const{campaign,createGame}=modules[id];assert.equal(campaign.version,1);assert.equal(campaign.levels.length,20);
    const seen=new Set();
    for(const level of campaign.levels){
      assert.equal(level.game,id);assert.equal(level.number,seen.size+1);const identity=JSON.stringify([level.size,level.rows??level.board??level.mines]);assert.ok(!seen.has(identity));seen.add(identity);
      const original=JSON.stringify(level),results=[],game=createGame({seed:1,level,onFinish:r=>results.push(r)});
      game.update(181);assert.equal(game.getState().finished,false);assert.equal(game.getState().elapsed,181);
      solveEngine(id,game,level);assert.equal(results.length,1,`${id} ${level.number}: no win`);assert.equal(results[0].won,true);assert.ok(results[0].elapsed>=181);
      const finished=game.getState();game.update(1000);game.input('undo');game.input('key-down',{key:' '});assert.deepEqual(game.getState(),finished);assert.equal(results.length,1);assert.equal(JSON.stringify(level),original);
      const silent=createGame({seed:9,level,onFinish:()=>assert.fail('destroyed game submitted')});silent.destroy();silent.update(1000);solveEngine(id,silent,level);
      const other=createGame({seed:200,level});assert.deepEqual(other.getState().board??other.getState().counts,createGame({seed:500,level}).getState().board??createGame({seed:500,level}).getState().counts);other.destroy();
    }
  });
  test(`${id}: campaign entry is exported in standalone ESM and offline release`,async()=>{
    const pkg=JSON.parse(await readFile(new URL(`../games/${id}/package.json`,import.meta.url)));assert.ok(pkg.exports['./campaign']);
    const{campaign}=await import(`../games/${id}/dist/campaign.js`);assert.deepEqual(campaign,modules[id].campaign);
    const map=JSON.parse(await readFile(new URL('../dist/module-map.json',import.meta.url))),entry=Object.entries(map).find(([key])=>key.endsWith(`games/${id}/src/campaign.js`));assert.ok(entry);const precache=await readFile(new URL('../dist/precache.js',import.meta.url),'utf8');assert.ok(precache.includes(entry[1].file));
  });
}
test('lights shortest solutions match all four advertised difficulty stages',()=>{
  const ranges=[[1,3],[3,5],[5,8],[9,12]];
  for(const level of modules.lights.campaign.levels){const solution=solveLights(level.board,level.size),[min,max]=ranges[Math.floor((level.number-1)/5)];assert.equal(solution.length,level.minMoves);assert.ok(solution.length>=min&&solution.length<=max);}
});
test('slide distance table proves exact increasing shortest paths rather than scramble length',()=>{
  const distance=slideDistances(),expected=[4,5,6,7,8,10,11,12,13,14,16,17,18,19,20,22,23,24,25,26];assert.equal(distance.size,181440);
  for(const level of modules.slide.campaign.levels){assert.equal(distance.get(level.board.join('')),expected[level.number-1]);assert.equal(level.solution.length,level.minMoves);}
});
test('every minefield is solved by visible-number deductions from a safe zero, with subset reasoning in final chapter',()=>{
  for(const level of modules.mines.campaign.levels){const proof=deduceMines(level.size,level.mines);assert.equal(level.counts[0],0);assert.equal(proof.solved,true);assert.ok(proof.initial<level.size*level.size-level.mineCount);assert.deepEqual(proof.trace,level.solution);if(level.number>15)assert.ok(proof.subsets>0);assert.equal(level.mineCount,[3,5,7,8][Math.floor((level.number-1)/5)]);}
});
test('box gardens have the specified crate count, verified minimum push costs and increasing chapter medians',()=>{
  let previousMedian=0;
  for(let stage=0;stage<4;stage++){
    const levels=modules.boxes.campaign.levels.slice(stage*5,stage*5+5);let last=0;
    for(const level of levels){assert.ok(level.rows.every(row=>row.length===level.size));const puzzle=parseBoxes(level.rows);assert.equal(puzzle.crates.length,stage+1);assert.equal(puzzle.goals.length,stage+1);const found=solveBoxes(level.rows);assert.ok(found);assert.equal(found.minPushes,level.minPushes);assert.ok(found.minPushes>=last);last=found.minPushes;}
    assert.ok(levels[2].minPushes>previousMedian);previousMedian=levels[2].minPushes;
  }
});
test('water routes become larger, require all flowers and include backwards travel after the introductory chapter',()=>{
  const board=Array(16).fill(0);for(const[cell,mask]of [[0,10],[1,10],[2,10],[3,12],[7,5],[11,5],[15,3]])board[cell]=mask;
  assert.equal(traceCampaignPipes(board,4).won,true);assert.equal(traceCampaignPipes(board,4,[5]).won,false);board[1]|=4;board[5]=1;assert.equal(traceCampaignPipes(board,4,[5]).won,true);
  for(const level of modules.pipes.campaign.levels){const stage=Math.floor((level.number-1)/5);assert.equal(new Set(level.path).size,level.path.length);assert.equal(level.flowers.length,stage);assert.equal(level.path[0],0);assert.equal(level.path.at(-1),level.size*level.size-1);if(stage>0)assert.ok(level.path.some((cell,i)=>i>0&&cell<level.path[i-1]));}
});
for(const id of ['boxes','lights','slide'])test(`${id}: undo restores the board and never refunds counted moves`,()=>{
  const{campaign,createGame}=modules[id],level=campaign.levels[4],game=createGame({level}),before=game.getState();
  if(id==='boxes')game.input('key-down',{key:keyFor[level.solution[0]]});else tap(game,level.solution[0],level.size);
  assert.equal(game.getState().steps,1);assert.ok(game.getState().canUndo);game.input('undo');const after=game.getState();assert.deepEqual(after.board,before.board);if(id==='boxes'){assert.deepEqual(after.crates,before.crates);assert.equal(after.player,before.player);}assert.equal(after.steps,1);
});
test('mine holds cancel correctly, flags do not reveal, and failure never unlocks the next level',()=>{
  const level=modules.mines.campaign.levels[19],game=modules.mines.createGame({level});game.input('primary-down',point(0,6));game.update(.5);game.input('primary-cancel');game.input('primary-up',point(0,6));assert.equal(game.getState().opened,0);assert.equal(game.getState().flagCount,0);
  game.input('key-down',{key:'ArrowLeft'});game.input('key-down',{key:'ArrowUp'});assert.equal(game.getState().selected,35);
  const capped=modules.mines.createGame({level});for(let cell=0;cell<9;cell++){capped.input('primary-down',point(cell,6));capped.update(.5);capped.input('primary-up',point(cell,6));}assert.equal(capped.getState().flagCount,8);assert.match(capped.getState().hint,/最多放置 8 枚/);
  const mine=level.mines[0];game.input('primary-down',point(mine,6));game.update(.5);game.input('primary-up',point(mine,6));assert.equal(game.getState().flags[mine],true);tap(game,mine,6);assert.equal(game.getState().finished,false);
  const results=[],failed=modules.mines.createGame({level,onFinish:r=>results.push(r)});tap(failed,mine,6);assert.equal(results[0].won,false);const store=createCampaignStore(fakeStorage());assert.equal(store.record('mines',1,1,results[0]),false);assert.equal(store.progress('mines').unlocked,1);
});
test('campaign routes validate specific fields while all original ordinary and dated links retain their meaning',()=>{
  for(const id of ids){assert.deepEqual(parseRoute(campaignLink(id)),{type:'levels',id});for(const n of [1,20])assert.deepEqual(parseRoute(campaignLink(id,n)),{type:'campaign',id,level:n,version:1});assert.deepEqual(parseRoute(playLink(id)),{type:'play',id,date:''});}
  for(const route of ['#/levels/star','#/levels/nope','#/levels/lights/0','#/levels/lights/21','#/levels/lights/1.5','#/levels/lights/-1','#/levels/lights/1/2','#/levels/lights/1?cv=2'])assert.equal(parseRoute(route).type,'error');
  const date='2026-10-26',id=dailyGame(date);assert.equal(parseRoute(playLink(id,date),'2026-10-27').date,date);assert.equal(dailySeed(date,id),dailySeed(date,id));
});
function fakeStorage(){const values=new Map();return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
const result=(steps=10,elapsed=60)=>({won:true,steps,elapsed});
test('campaign progress unlocks only on wins, persists all twenty levels, and compares records per level and game',()=>{
  const storage=fakeStorage(),store=createCampaignStore(storage);assert.equal(store.progress('lights').unlocked,1);assert.equal(store.record('lights',1,2,result()),false);assert.equal(store.record('lights',2,1,result()),false);
  for(let n=1;n<=20;n++){assert.equal(store.record('lights',1,n,result(10,60)),true);assert.equal(store.progress('lights').unlocked,Math.min(20,n+1));}
  assert.equal(store.record('lights',1,1,result(11,1)),false);assert.equal(store.record('lights',1,1,result(9,100)),true);assert.equal(store.record('lights',1,1,result(9,90)),true);
  assert.equal(store.record('mines',1,1,result(10,10)),true);assert.equal(store.record('mines',1,1,result(20,9)),true);assert.equal(store.record('mines',1,1,result(1,11)),false);
  const restored=createCampaignStore(storage);assert.equal(restored.progress('lights').completed,20);assert.equal(restored.progress('lights').best[1].elapsed,90);assert.equal(restored.progress('mines').best[1].elapsed,9);assert.equal(restored.progress('boxes').unlocked,1);
  const old=createStore(storage);old.toggleFavorite('lights');old.record('lights',{score:5,steps:5,elapsed:8,won:true});assert.equal(createCampaignStore(storage).progress('lights').completed,20);assert.equal(createStore(storage).data.best.lights.steps,5);
});
test('damaged, unavailable and exhausted campaign storage preserves usable in-memory progress without touching legacy records',()=>{
  const storage=fakeStorage();storage.setItem(CAMPAIGN_KEY,'{');let warnings=0;const store=createCampaignStore(storage,()=>warnings++);assert.equal(store.progress('lights').completed,0);assert.equal(warnings,0);storage.setItem=()=>{throw Error('quota');};store.record('lights',1,1,result());store.record('lights',1,2,result());assert.equal(warnings,1);assert.equal(store.progress('lights').unlocked,3);
  const memory=createCampaignStore(null,()=>warnings++);memory.record('boxes',1,1,result());assert.equal(memory.progress('boxes').unlocked,2);assert.equal(warnings,2);
  const dirty=fakeStorage();dirty.setItem(CAMPAIGN_KEY,JSON.stringify({version:1,games:{lights:{version:1,best:{1:{won:true,steps:'bad',elapsed:2},2:result(),21:result()}},boxes:{version:2,best:{1:result()}},unknown:{version:1,best:{1:result()}}}}));const clean=createCampaignStore(dirty);assert.equal(clean.progress('lights').unlocked,1);assert.equal(clean.progress('boxes').completed,0);assert.equal(clean.progress('unknown').unlocked,0);
});
