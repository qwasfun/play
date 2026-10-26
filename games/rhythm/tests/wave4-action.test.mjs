import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame as createRhythm,generateRhythmSchedule,rhythmLaneAt} from '../src/index.js';

function until(game,time,step=1/60){
  let frames=0;
  while(game.getState().elapsed<time-1e-9&&!game.getState().finished){
    game.update(Math.min(step,time-game.getState().elapsed));
    assert.ok(frames++<100000,'the game clock must continue');
  }
}

const rhythmKeys=['ArrowLeft','ArrowUp','ArrowDown','ArrowRight'];

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
