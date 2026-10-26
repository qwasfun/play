import test from 'node:test';
import assert from 'node:assert/strict';
import {rng,beijingDate,dailyGame,dailySeed,parseRoute,compareResult,validDate,playLink,GAME_IDS,EXPANDED_DAILY_START,TWELVE_DAILY_START,SIXTEEN_DAILY_START,TWENTY_DAILY_START} from '@playground/game-registry/core';
import {createStore} from '../apps/arcade/src/storage.js';

test('Beijing midnight changes date and daily rotation across UTC boundary',()=>{
  assert.equal(beijingDate(Date.parse('2026-10-25T15:59:59Z')),'2026-10-25');
  assert.equal(beijingDate(Date.parse('2026-10-25T16:00:00Z')),'2026-10-26');
  assert.equal(new Set(['2026-10-25','2026-10-26','2026-10-27','2026-10-28'].map(dailyGame)).size,4);
});
test('daily seeds and random sequences reproduce on reload, differ by day or rules',()=>{
  const seed=dailySeed('2026-10-26','star');const a=rng(seed),b=rng(seed);
  assert.deepEqual(Array.from({length:100},a),Array.from({length:100},b));
  assert.notEqual(seed,dailySeed('2026-10-27','star'));
  assert.notEqual(seed,dailySeed('2026-10-26','star',2));
});
test('shared routes preserve historical date and reject bad field values',()=>{
  const date='2026-10-26',id=dailyGame(date);
  assert.deepEqual(parseRoute(playLink(id,date),'2026-10-27'),{type:'play',id,date});
  for(const fragment of ['#/play/unknown',`#/play/${id}?date=2026-02-30`,`#/play/${id}?date=2026-10-28`,`#/play/${id}?date=${date}&v=2`])assert.equal(parseRoute(fragment,'2026-10-27').type,'error');
  assert.equal(validDate('2026-02-30'),false);
  assert.deepEqual(parseRoute('#/daily',date),{type:'play',id,date});
});
test('best result comparison prioritizes lights win, then steps, then elapsed',()=>{
  assert.equal(compareResult('lights',{won:false,steps:0,elapsed:1},{won:true,steps:8,elapsed:10}),false);
  assert.equal(compareResult('lights',{won:true,steps:7,elapsed:90},{won:true,steps:8,elapsed:10}),true);
  assert.equal(compareResult('lights',{won:true,steps:8,elapsed:8},{won:true,steps:8,elapsed:10}),true);
  assert.equal(compareResult('star',{score:20,elapsed:50},{score:30,elapsed:60}),false);
});
const fakeStorage=()=>{const values=new Map();return{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
test('favorites, recent, sound and daily best persist across a new store',()=>{
  const storage=fakeStorage(),store=createStore(storage);
  store.toggleFavorite('echo');store.recent('star');store.recent('echo');store.recent('star');store.sound(true);
  store.record('star',{score:30,elapsed:60,won:true},'2026-10-26');
  store.record('star',{score:10,elapsed:60,won:true},'2026-10-26');
  const again=createStore(storage);
  assert.deepEqual(again.data.favorites,['echo']);assert.deepEqual(again.data.recent,['star','echo']);assert.equal(again.data.sound,true);
  assert.equal(again.data.daily['2026-10-26'].star.score,30);assert.equal(again.data.best.star.score,30);
});
test('unavailable and quota-limited storage retain working in-memory play',()=>{
  let warnings=0;const store=createStore(null,()=>warnings++);
  store.toggleFavorite('lights');store.record('lights',{score:5,steps:5,elapsed:30,won:true});
  assert.equal(warnings,1);assert.deepEqual(store.data.favorites,['lights']);assert.equal(store.data.best.lights.steps,5);
  const storage=fakeStorage();const other=createStore(storage,()=>warnings++);storage.setItem=()=>{throw Error('quota');};other.toggleFavorite('star');other.recent('star');assert.equal(warnings,2);
});
test('untrusted storage is filtered and cannot introduce unknown game IDs',()=>{
  const storage=fakeStorage();storage.setItem('tiny-break-arcade:v1',JSON.stringify({version:1,favorites:['star','__proto__','bad','star'],recent:['echo',null],sound:'yes',best:{star:{score:'NaN',elapsed:5,won:true}},daily:{'bad':{}}}));
  const store=createStore(storage);assert.deepEqual(store.data.favorites,['star']);assert.deepEqual(store.data.recent,['echo']);assert.deepEqual(store.data.best,{});assert.equal(store.data.sound,false);
});
test('damaged lights result cannot block future valid records',()=>{
  const storage=fakeStorage();storage.setItem('tiny-break-arcade:v1',JSON.stringify({version:1,best:{lights:{score:5,elapsed:10,won:true}}}));
  const store=createStore(storage);assert.equal(store.data.best.lights,undefined);
  assert.equal(store.record('lights',{score:4,steps:4,elapsed:12,won:true}),true);
  assert.equal(store.data.best.lights.steps,4);
});
test('corrupt JSON resets safely without falsely reporting unavailable storage',()=>{
  const storage=fakeStorage();storage.setItem('tiny-break-arcade:v1','{');let warnings=0;
  const store=createStore(storage,()=>warnings++);store.toggleFavorite('bridge');
  assert.equal(warnings,0);assert.deepEqual(createStore(storage).data.favorites,['bridge']);
});
test('expanded daily rotation preserves every old date and shared challenge',()=>{
  const legacy=['star','bridge','lights','echo'];
  for(let time=Date.parse('2026-09-01T00:00:00Z');time<Date.parse(EXPANDED_DAILY_START+'T00:00:00Z');time+=86400000){
    const date=new Date(time).toISOString().slice(0,10),id=legacy[Math.floor(time/86400000)%4];
    assert.equal(dailyGame(date),id);assert.equal(parseRoute(playLink(id,date),'2026-11-10').type,'play');
  }
  assert.equal(dailyGame('2026-10-27'),'catch');
  const rotation=Array.from({length:8},(_,i)=>dailyGame(new Date(Date.parse(EXPANDED_DAILY_START+'T00:00:00Z')+i*86400000).toISOString().slice(0,10)));
  assert.deepEqual(rotation,['catch','bounce','pairs','merge','star','bridge','lights','echo']);
  assert.equal(dailyGame('2026-11-03'),'echo');
});
test('all catalog favorites and records survive reload, recent remains bounded',()=>{
  const storage=fakeStorage(),store=createStore(storage);
  for(const id of GAME_IDS){store.toggleFavorite(id);store.recent(id);store.record(id,{score:100,elapsed:60,won:true,steps:8,rounds:2});}
  const again=createStore(storage);
  assert.deepEqual(again.data.favorites,GAME_IDS);assert.equal(again.data.recent.length,4);assert.equal(Object.keys(again.data.best).length,GAME_IDS.length);
  for(const id of GAME_IDS)assert.equal(parseRoute(playLink(id)).id,id);
});
test('twelve-game daily epoch preserves first eight-game cycle and its twelve-game cycle',()=>{
  const old=['catch','bounce','pairs','merge','star','bridge','lights','echo'];
  for(let i=0;i<8;i++){
    const date=new Date(Date.parse(EXPANDED_DAILY_START+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);
    assert.equal(dailyGame(date),old[i]);assert.equal(parseRoute(playLink(old[i],date),'2026-12-01').type,'play');
  }
  const rotation=Array.from({length:12},(_,i)=>dailyGame(new Date(Date.parse(TWELVE_DAILY_START+'T00:00:00Z')+i*86400000).toISOString().slice(0,10)));
  assert.deepEqual(rotation,['rings','snake','boxes','pipes',...old]);
  for(let i=0;i<12;i++){
    const date=new Date(Date.parse(TWELVE_DAILY_START+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);
    assert.equal(parseRoute(playLink(rotation[i],date),'2026-12-10').type,'play');
  }
});
test('sixteen-game daily epoch preserves earlier dates and its sixteen-game cycle',()=>{
  const ids=['jump','bubbles','slide','rhythm','rings','snake','boxes','pipes','catch','bounce','pairs','merge','star','bridge','lights','echo'];
  assert.equal(dailyGame('2026-11-15'),'echo');
  for(let i=0;i<16;i++){
    const date=new Date(Date.parse(SIXTEEN_DAILY_START+'T00:00:00Z')+i*86400000).toISOString().slice(0,10),id=ids[i%16];
    assert.equal(dailyGame(date),id);assert.equal(parseRoute(playLink(id,date),'2026-12-31').type,'play');
    assert.equal(dailySeed(date,id),dailySeed(date,id));
  }
});
test('twenty-game daily epoch preserves previous dates and covers every game deterministically',()=>{
  const ids=['constellation','tower','rain','mines','jump','bubbles','slide','rhythm','rings','snake','boxes','pipes','catch','bounce','pairs','merge','star','bridge','lights','echo'];
  assert.equal(dailyGame('2026-12-01'),'echo');
  for(let i=0;i<40;i++){
    const date=new Date(Date.parse(TWENTY_DAILY_START+'T00:00:00Z')+i*86400000).toISOString().slice(0,10),id=ids[i%20];
    assert.equal(dailyGame(date),id);assert.equal(parseRoute(playLink(id,date),'2027-01-31').type,'play');
  }
  assert.deepEqual(new Set(ids),new Set(GAME_IDS));
});
