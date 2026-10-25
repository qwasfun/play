import test from 'node:test';
import assert from 'node:assert/strict';
import {rng,beijingDate,dailyGame,dailySeed,parseRoute,compareResult,validDate,playLink} from '../dist/core.js';
import {createStore} from '../dist/storage.js';

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
