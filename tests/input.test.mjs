import test from 'node:test';
import assert from 'node:assert/strict';
import {bindGameInput} from '../dist/input.js';
import {createGame as bridge} from '../dist/games/bridge.js';
import {createGame as lights,toggledBoard} from '../dist/games/lights.js';
class Canvas extends EventTarget {
  rect={left:20,top:40,width:300,height:240};
  getBoundingClientRect(){return this.rect;}
  focus(){}
  setPointerCapture(){}
  releasePointerCapture(pointerId){this.emit('lostpointercapture',{pointerId});}
  emit(type,properties={}){const event=new Event(type,{cancelable:true});Object.assign(event,properties);this.dispatchEvent(event);return event;}
}
function setup(onInput){const canvas=new Canvas(),abort=new AbortController(),events=[];const controls=bindGameInput(canvas,{isRunning:()=>true,onInput:(...args)=>{events.push(args);onInput?.(...args);},onUpdate:()=>{},onPause:()=>{},signal:abort.signal});return {canvas,controls,events,abort};}
const down=(canvas,id,extra={})=>canvas.emit('pointerdown',{pointerId:id,button:0,isPrimary:true,clientX:170,clientY:160,...extra});
test('secondary cancel and lost capture preserve primary long hold',()=>{
  const game=bridge({seed:123});const {canvas,events}=setup((type,payload)=>game.input(type,payload));
  down(canvas,1);game.update(.5);down(canvas,2,{isPrimary:false});
  canvas.emit('pointercancel',{pointerId:2});canvas.emit('lostpointercapture',{pointerId:2});
  assert.equal(game.getState().holding,true);assert.equal(events.length,1);
  canvas.emit('pointerup',{pointerId:1,clientX:500,clientY:500});
  assert.equal(game.getState().phase,'fall');assert.deepEqual(events.map(([type])=>type),['primary-down','primary-up']);
});
test('primary cancellation clears hold without dropping bridge and accepts next touch',()=>{
  const game=bridge({seed:123});const {canvas}=setup((type,payload)=>game.input(type,payload));
  down(canvas,1);game.update(.8);canvas.emit('pointercancel',{pointerId:1});
  canvas.emit('pointerup',{pointerId:1,clientX:170,clientY:160});
  assert.equal(game.getState().holding,false);assert.equal(game.getState().phase,'idle');assert.equal(game.getState().lives,3);
  down(canvas,3);assert.equal(game.getState().holding,true);
});
test('keyboard hold and pointer hold cannot release each other',()=>{
  const {canvas,events}=setup();
  canvas.emit('keydown',{key:' ',repeat:false});down(canvas,1);canvas.emit('pointerup',{pointerId:1,clientX:170,clientY:160});
  assert.deepEqual(events.map(([type])=>type),['key-down']);
  canvas.emit('keyup',{key:' '});down(canvas,2);canvas.emit('keydown',{key:' ',repeat:false});canvas.emit('keyup',{key:' '});
  assert.deepEqual(events.map(([type])=>type),['key-down','key-up','primary-down']);
});
test('touch coordinates use current bounds after resize',()=>{
  const {canvas,events}=setup();down(canvas,1);assert.deepEqual(events[0][1],{x:300,y:240});
  canvas.emit('pointerup',{pointerId:1,clientX:170,clientY:160});canvas.rect={left:0,top:0,width:600,height:480};
  down(canvas,2,{clientX:300,clientY:240});assert.deepEqual(events.at(-1)[1],{x:300,y:240});
});
test('layout cancellation clears keyboard hold and late keyup is ignored',()=>{
  const {canvas,controls,events}=setup();canvas.emit('keydown',{key:' ',repeat:false});controls.cancel();
  canvas.emit('keyup',{key:' '});assert.deepEqual(events.map(([type])=>type),['key-down','primary-cancel']);
  down(canvas,2);assert.equal(events.at(-1)[0],'primary-down');
});
test('canvas context menu is prevented and abort removes input listeners',()=>{
  const {canvas,abort,events}=setup();assert.equal(canvas.emit('contextmenu').defaultPrevented,true);
  abort.abort();const count=events.length;down(canvas,1);assert.equal(events.length,count);
});
test('lights gutter hit area includes half the gap for small phone targets',()=>{
  const game=lights({seed:123});const before=game.getState().board;
  game.input('primary-down',{x:202,y:91});game.input('primary-up',{x:202,y:91});
  assert.equal(game.getState().steps,1);assert.deepEqual(game.getState().board,toggledBoard(before,0));
});
test('shift changing keyup letter case cannot leave keyboard owner stuck',()=>{
  const {canvas,events}=setup();canvas.emit('keydown',{key:'w',repeat:false});canvas.emit('keyup',{key:'W'});down(canvas,1);
  assert.deepEqual(events.map(([type])=>type),['key-down','key-up','primary-down']);
  assert.equal(events[0][1].key,'w');assert.equal(events[1][1].key,'w');
});
test('drag moves follow only the owning pointer and stop on cancellation',()=>{
  const {canvas,controls,events}=setup();down(canvas,1);
  canvas.emit('pointermove',{pointerId:2,clientX:220,clientY:200});
  canvas.emit('pointermove',{pointerId:1,clientX:220,clientY:200});
  assert.deepEqual(events.at(-1),['primary-move',{x:400,y:320}]);
  const count=events.length;controls.cancel();canvas.emit('pointermove',{pointerId:1,clientX:220,clientY:200});
  assert.equal(events.length,count+1);
});
