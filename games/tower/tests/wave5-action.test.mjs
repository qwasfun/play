import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame as createTower,generateTower,towerPositionAt,nextPerfectTowerTime,towerOverlap} from '../src/index.js';

function until(game,time,step=1/60){
  let frames=0;
  while(!game.getState().finished&&game.getState().elapsed<time-1e-9){
    game.update(Math.min(step,time-game.getState().elapsed));assert.ok(frames++<20000);
  }
}

test('tower trajectories are seeded, bounded and each offers a reachable perfect placement',()=>{
  const stages=generateTower(123);assert.equal(stages.length,12);assert.deepEqual(stages,generateTower(123));assert.notDeepEqual(stages,generateTower(124));
  for(const stage of stages){
    assert.ok(stage.speed>=136&&stage.speed<233);
    for(const after of[0,.3,4.7,21.8]){
      const time=nextPerfectTowerTime(stage,300,after);assert.ok(time>=after-1e-8);
      assert.ok(Math.abs(towerPositionAt(stage,time)-300)<1e-7);
    }
    for(let time=0;time<4;time+=.17){const x=towerPositionAt(stage,time);assert.ok(x>=120&&x<=480);}
  }
});

test('tower overlap has inclusive perfect bounds and excludes a zero-width edge touch',()=>{
  const top={x:300,width:240};
  assert.deepEqual(towerOverlap(top,{x:306,width:240}),{x:300,width:240,perfect:true});
  assert.deepEqual(towerOverlap(top,{x:294,width:240}),{x:300,width:240,perfect:true});
  const trimmed=towerOverlap(top,{x:340,width:240});assert.deepEqual(trimmed,{x:320,width:200,perfect:false});
  assert.equal(towerOverlap(top,{x:540,width:240}).width,0);
});

test('tower twelve ordinary tap or space placements can make a full-width perfect skyline',()=>{
  for(let seed=0;seed<45;seed++){
    let final,calls=0;const game=createTower({seed,onFinish:r=>{final=r;calls++;}}),stages=generateTower(seed);
    for(let level=0;level<12;level++){
      const time=nextPerfectTowerTime(stages[level],300,game.getState().elapsed+(level?.55:0));
      until(game,time,1/30);
      if(level%2){game.input('key-down',{key:' ',repeat:false});game.input('key-up',{key:' '});}
      else{game.input('primary-down',{x:300,y:200});game.input('primary-up',{x:300,y:200});}
      assert.equal(game.getState().score,(level+1)*150,`seed ${seed}, floor ${level}`);
      assert.equal(game.getState().top.width,240);
    }
    assert.equal(final?.score,1800);assert.equal(final?.won,true);assert.equal(final?.lives,3);assert.equal(final?.level,12);
    game.input('primary-down');game.update(100);assert.equal(calls,1);
  }
});

test('tower does not repeat a placement while held, settling or cancelled',()=>{
  const game=createTower({seed:123});game.input('key-down',{key:' ',repeat:true});assert.equal(game.getState().level,0);
  game.input('primary-down');const state=game.getState();assert.equal(state.level,1);
  game.input('primary-down');game.input('primary-up');game.input('primary-cancel');game.input('key-down',{key:'Enter'});
  assert.equal(game.getState().level,1);assert.equal(game.getState().score,state.score);
  game.update(.3);game.input('primary-down');assert.equal(game.getState().level,1);
});

test('tower trims an offset floor, then three complete misses settle once',()=>{
  let final,calls=0;const game=createTower({seed:88,onFinish:r=>{final=r;calls++;}});
  game.input('primary-down');assert.equal(game.getState().level,1);assert.equal(game.getState().top.width,60);assert.equal(game.getState().score,100);
  const state=game.getState(),target=state.top.x<300?480:120;
  for(let i=0;i<3;i++){
    const next=nextPerfectTowerTime(state.stages[1],target,game.getState().elapsed+.55);until(game,next);game.input('primary-down');
  }
  assert.equal(final?.reason,'lives');assert.equal(final?.lives,0);assert.equal(final?.score,100);assert.equal(calls,1);
  game.update(100);game.input('primary-down');assert.equal(calls,1);
});

test('tower position is refresh-rate independent and timeout or destruction does not repeat results',()=>{
  const a=createTower({seed:72}),b=createTower({seed:72});until(a,3.7,1/30);until(b,3.7,1/144);
  assert.ok(Math.abs(a.getState().moving.x-b.getState().moving.x)<1e-7);
  let calls=0,final;const timed=createTower({seed:72,onFinish:r=>{calls++;final=r;}});timed.update(200);timed.update(200);
  assert.equal(calls,1);assert.equal(final.elapsed,90);assert.equal(final.reason,'time');
  const destroyed=createTower({seed:1,onFinish:()=>calls++});destroyed.destroy();destroyed.update(200);destroyed.input('primary-down');assert.equal(calls,1);
});
