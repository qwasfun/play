import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame as createJump,generateJumpSchedule,jumpHeight} from '../dist/games/jump.js';
import {createGame as createRhythm,generateRhythmSchedule,rhythmLaneAt} from '../dist/games/rhythm.js';

function until(game,time,step=1/60){
  let frames=0;
  while(game.getState().elapsed<time-1e-9&&!game.getState().finished){
    game.update(Math.min(step,time-game.getState().elapsed));
    assert.ok(frames++<100000,'the game clock must continue');
  }
}
const rhythmKeys=['ArrowLeft','ArrowUp','ArrowDown','ArrowRight'];

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

test('rhythm notes reproduce with useful lead-in and only one note per beat',()=>{
  const schedule=generateRhythmSchedule('beat');assert.deepEqual(schedule,generateRhythmSchedule('beat'));
  assert.notDeepEqual(schedule,generateRhythmSchedule('different'));assert.equal(schedule.length,32);
  assert.ok(schedule[0].time>=2);assert.ok(schedule.at(-1).time<49);
  for(let i=0;i<schedule.length;i++){
    assert.ok(Number.isInteger(schedule[i].lane)&&schedule[i].lane>=0&&schedule[i].lane<4);
    if(i)assert.ok(schedule[i].time-schedule[i-1].time>=.75);
  }
});

test('rhythm four large touch zones have exact edges and ignore clicks outside the lanes',()=>{
  for(let i=0;i<4;i++)assert.equal(rhythmLaneAt(126+i*116,418),i);
  for(const point of [[67,200],[532,200],[300,57],[300,452],[NaN,400]])assert.equal(rhythmLaneAt(...point),-1);
  const game=createRhythm({seed:1});game.input('primary-down',{x:30,y:30});assert.equal(game.getState().lives,5);
});

test('rhythm all thirty-two ordinary tap or keyboard answers can achieve a perfect score',()=>{
  for(const mode of ['touch','keyboard']){
    let final,finishes=0;const seed='perfect-beat',game=createRhythm({seed,onFinish:r=>{final=r;finishes++;}});
    for(const note of generateRhythmSchedule(seed)){
      until(game,note.time);
      if(mode==='touch'){
        game.input('primary-down',{x:126+note.lane*116,y:418});game.input('primary-up',{x:126+note.lane*116,y:418});
      }else{game.input('key-down',{key:rhythmKeys[note.lane]});game.input('key-up',{key:rhythmKeys[note.lane]});}
    }
    assert.equal(final?.won,true);assert.equal(final?.score,3200);assert.equal(final?.hits,32);assert.equal(final?.perfects,32);assert.equal(final?.lives,5);assert.equal(final?.combo,32);
    game.update(100);game.input('primary-down',{x:126,y:418});assert.equal(finishes,1);
  }
});

test('rhythm perfect and good windows include boundaries while early answers lose one chance',()=>{
  const seed=101,note=generateRhythmSchedule(seed)[0];
  for(const [offset,score] of [[-.08,100],[.08,100],[-.19,50],[.19,50]]){
    const game=createRhythm({seed});until(game,note.time+offset);game.input('key-down',{key:rhythmKeys[note.lane]});
    assert.equal(game.getState().score,score);assert.equal(game.getState().lives,5);
  }
  const game=createRhythm({seed});until(game,note.time-.191);game.input('key-down',{key:rhythmKeys[note.lane]});
  assert.equal(game.getState().score,0);assert.equal(game.getState().lives,4);
});

test('rhythm missed notes and five wrong answers finish exactly once',()=>{
  let final,finishes=0;const game=createRhythm({seed:1,onFinish:r=>{final=r;finishes++;}});game.update(50);
  assert.equal(final?.reason,'lives');assert.equal(final?.score,0);assert.equal(final?.lives,0);assert.ok(final.elapsed<50);
  game.update(50);assert.equal(finishes,1);
  let wrongFinal;const wrong=createRhythm({seed:1,onFinish:r=>wrongFinal=r});
  for(let i=0;i<5;i++)wrong.input('key-down',{key:'a'});
  assert.equal(wrongFinal?.lives,0);assert.equal(wrongFinal?.reason,'lives');
});

test('rhythm cancellation, releases and repeated keys never answer a beat',()=>{
  const seed=89,game=createRhythm({seed}),note=generateRhythmSchedule(seed)[0];until(game,note.time);
  for(const type of ['primary-cancel','primary-up','key-up'])game.input(type,{x:126+note.lane*116,y:418,key:rhythmKeys[note.lane]});
  game.input('key-down',{key:rhythmKeys[note.lane],repeat:true});assert.equal(game.getState().score,0);assert.equal(game.getState().lives,5);
  game.input('key-down',{key:rhythmKeys[note.lane]});assert.equal(game.getState().score,100);
});

test('rhythm missed beat order and score are independent of update frequency; destroyed games stay silent',()=>{
  let fa,fb;const a=createRhythm({seed:11,onFinish:r=>fa=r}),b=createRhythm({seed:11,onFinish:r=>fb=r});
  until(a,20,1/30);until(b,20,1/144);assert.deepEqual(fa,fb);
  let finishes=0;const game=createRhythm({seed:11,onFinish:()=>finishes++});game.destroy();game.update(100);game.input('key-down',{key:'a'});assert.equal(finishes,0);
});
