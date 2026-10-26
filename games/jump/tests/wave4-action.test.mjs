import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame as createJump,generateJumpSchedule,jumpHeight} from '../src/index.js';

function until(game,time,step=1/60){
  let frames=0;
  while(game.getState().elapsed<time-1e-9&&!game.getState().finished){
    game.update(Math.min(step,time-game.getState().elapsed));
    assert.ok(frames++<100000,'the game clock must continue');
  }
}

test('jump obstacles are deterministic, spaced for a grounded retry and complete before one minute',()=>{
  const schedule=generateJumpSchedule('meadow');
  assert.deepEqual(schedule,generateJumpSchedule('meadow'));assert.notDeepEqual(schedule,generateJumpSchedule('other'));
  assert.equal(schedule.length,12);
  for(let i=0;i<schedule.length;i++){
    assert.ok(schedule[i].height<=56&&schedule[i].height>=37);assert.ok(schedule[i].width>=32&&schedule[i].width<=42);
    if(i)assert.ok(schedule[i].time-schedule[i-1].time>=2.65);
  }
  assert.ok(schedule.at(-1).time<50);assert.ok(jumpHeight(.53)>120);assert.equal(jumpHeight(2),0);
});

test('jump can clear twelve seeded obstacles with ordinary taps and preserves all three chances',()=>{
  for(let seed=0;seed<40;seed++){
    let final,finishes=0;const game=createJump({seed,onFinish:r=>{final=r;finishes++;}});
    for(const obstacle of generateJumpSchedule(seed)){
      until(game,obstacle.time-.53);game.input('primary-down',{x:300,y:300});game.input('primary-up',{x:300,y:300});
      until(game,obstacle.time+.5);
    }
    assert.equal(final?.score,1200);assert.equal(final?.won,true);assert.equal(final?.lives,3);assert.equal(final?.passed,12);
    game.update(10);game.input('primary-down');assert.equal(finishes,1);
  }
});

test('jump repeats, held clicks and cancellation never create extra jumps or pause the current arc',()=>{
  const game=createJump({seed:1});game.input('key-down',{key:' ',repeat:true});assert.equal(game.getState().jumping,false);
  game.input('primary-down');game.update(.3);const start=game.getState().jumpAt;
  game.input('primary-down');game.input('key-down',{key:'ArrowUp'});game.input('primary-cancel');
  assert.equal(game.getState().jumpAt,start);game.update(.8);assert.equal(game.getState().jumping,false);
  game.input('primary-up');assert.equal(game.getState().jumping,false);
  game.input('key-down',{key:'w'});assert.equal(game.getState().jumping,true);
});

test('the entire visible jump cue window clears every obstacle size safely',()=>{
  for(const offset of [.36,.40,.45,.50,.55,.60,.65,.70]){
    for(let seed=0;seed<20;seed++){
      let final;const game=createJump({seed,onFinish:r=>final=r});
      for(const obstacle of generateJumpSchedule(seed)){
        until(game,obstacle.time-offset);game.input('primary-down');until(game,obstacle.time+.5);
      }
      assert.equal(final?.score,1200,`seed ${seed}, cue ${offset}`);assert.equal(final?.lives,3);
    }
  }
});

test('jump collides only once per obstacle and large updates cannot tunnel through all logs',()=>{
  let final,finishes=0;const game=createJump({seed:17,onFinish:r=>{final=r;finishes++;}}),schedule=generateJumpSchedule(17);
  until(game,schedule[0].time+.45);assert.equal(game.getState().lives,2);assert.equal(game.getState().score,0);
  game.update(60);assert.equal(final?.reason,'lives');assert.equal(final?.lives,0);assert.ok(final.elapsed<schedule[2].time+.1);
  game.update(60);assert.equal(finishes,1);
});

test('jump movement and collision outcomes are consistent across update frequencies',()=>{
  const a=createJump({seed:41}),b=createJump({seed:41});
  a.input('key-down',{key:' '});b.input('key-down',{key:' '});
  until(a,.7,1/30);until(b,.7,1/144);
  assert.ok(Math.abs(a.getState().jumpHeight-b.getState().jumpHeight)<1e-7);
  until(a,8,1/30);until(b,8,1/144);
  assert.equal(a.getState().lives,b.getState().lives);assert.equal(a.getState().score,b.getState().score);
  const before=a.getState();for(const dt of [NaN,-1,0,Infinity])a.update(dt);assert.deepEqual(a.getState(),before);
});
