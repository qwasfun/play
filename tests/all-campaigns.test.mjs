import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {games} from '@playground/game-registry';
import {parseRoute,campaignLink} from '@playground/game-registry/core';
import {playLevel} from '../scripts/campaigns/replay.mjs';
import {jugSolution,solveNonogram} from '../scripts/campaigns/solvers.mjs';
import {createCampaignStore,CAMPAIGN_KEY} from '../apps/arcade/src/campaign-storage.js';
import {recordPolicy,cleanLevelResult,campaignView} from '@playground/game-sdk/level';
const old=['boxes','pipes','mines','lights','slide'],ids=games.map(g=>g.id).filter(id=>!old.includes(id));
const solutions=JSON.parse(fs.readFileSync(new URL('./fixtures/new-campaign-solutions.json',import.meta.url)));
const modules={};for(const id of ids)modules[id]={...await import(`../games/${id}/src/index.js`),...await import(`../games/${id}/src/campaign.js`)};
const canvas=new Proxy({},{get:(o,key)=>key==='measureText'?()=>({width:10}):key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
for(const id of ids)test(`${id}: twenty distinct fixed levels finish using real engine inputs, survive replay and settle once`,()=>{
 const{campaign,createGame}=modules[id],identities=new Set();assert.equal(campaign.version,1);assert.equal(campaign.levels.length,20);
 for(const level of campaign.levels){const original=JSON.stringify(level),identity=JSON.stringify(Object.fromEntries(Object.entries(level).filter(([key])=>!['seed','game','number','title','objective','stage'].includes(key))));assert.ok(!identities.has(identity),`${id} ${level.number} duplicate`);identities.add(identity);assert.equal(level.number,identities.size);assert.equal(level.stage,Math.ceil(level.number/5));assert.ok(level.objective.length>5);
  const results=[],a=createGame({seed:1,level,onFinish:r=>results.push(r)}),b=createGame({seed:999,level});assert.deepEqual(a.getState(),b.getState());a.draw(canvas);const run=playLevel(id,level,a,solutions[id]?.[level.number-1]);assert.equal(results.length,1,`${id} ${level.number} unfinished: ${JSON.stringify(run.state)}`);assert.equal(results[0].won,true);assert.ok(cleanLevelResult(results[0],recordPolicy(id,games.find(g=>g.id===id).campaign)));a.draw(canvas);a.update(200);a.input('primary-down',{x:300,y:250});a.input('primary-up',{x:300,y:250});a.input('key-down',{key:' '});assert.equal(results.length,1);assert.equal(JSON.stringify(level),original);
  let tick=0;for(const event of run.events){while(tick<event.frame&&!(b.getState().finished||b.getState().done)){b.update(1/60);tick++;}b.input(event.type,event.payload);}while(tick<run.frames&&!(b.getState().finished||b.getState().done)){b.update(1/60);tick++;}assert.equal(b.getState().score,a.getState().score);b.destroy();
  const dead=createGame({level,onFinish:()=>assert.fail('destroyed engine settled')});dead.destroy();dead.update(500);dead.input('key-down',{key:' '});assert.equal(parseRoute(campaignLink(id,level.number)).type,'campaign');
 }
});
test('the original 100 level definitions retain their exact content version and content hashes',()=>{
 const hashes=['1ae1e1a3e31fa9f919e3215f5ed1dd6b3e23d7a50b64866e96e18c7374a812d9','bb3d03e2a41538bfe939a53d8b78053589ddc760a6dfc8d2b77f8ec6c6d35cc0','3111589f6396e728299d710dd87b194f3c474d169ef0421087e38ec4af7be699','fa19a4ef24ca83715e5fd6da0c104d6149a803accd5d15b1efe839511744a5e6','d485238484353445fcaa5340674ef9d8ae38a653e3e2d7740f3941bc5d279d0f'];old.forEach((id,i)=>assert.equal(createHash('sha256').update(fs.readFileSync(new URL(`../games/${id}/src/campaign-data.js`,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex'),hashes[i]));assert.equal(games.filter(g=>g.campaign).length,28);assert.equal(games.reduce((n,g)=>n+g.campaign.total,0),560);
});
test('all new campaign entries are exported and precached; authoring solvers are excluded from production',async()=>{
 const map=JSON.parse(fs.readFileSync(new URL('../dist/module-map.json',import.meta.url))),precache=fs.readFileSync(new URL('../dist/precache.js',import.meta.url),'utf8');for(const id of ids){const{campaign}=await import(`../games/${id}/dist/campaign.js`);assert.deepEqual(campaign,modules[id].campaign);const entry=Object.entries(map).find(([key])=>key.endsWith(`games/${id}/src/campaign.js`));assert.ok(entry);assert.ok(precache.includes(entry[1].file));}assert.ok(!Object.keys(map).some(k=>k.includes('solvers')||k.includes('scripts/campaigns')));
});
test('nonograms have unique solutions and jugs use exact BFS minimum distances',()=>{for(const level of modules.weave.campaign.levels)assert.equal(solveNonogram(level).solutions.length,1);for(const level of modules.jugs.campaign.levels){assert.equal(jugSolution(level.a,level.b,level.target).length,level.minimum);assert.ok(level.minimum>=2&&level.minimum<=14);}assert.equal(modules.jugs.campaign.levels.at(-1).minimum,14);const difficulties=modules.weave.campaign.levels.map(l=>l.difficulty);assert.deepEqual([...difficulties].sort((a,b)=>a-b),difficulties);});
test('action layouts have sufficient movement, jump, preview and input windows',()=>{
 for(const l of modules.bridge.campaign.levels)for(const island of l.islands){assert.ok(island.gap+island.width<390);assert.ok(island.width/island.speed>=.16);}
 for(const l of modules.rain.campaign.levels)for(let i=1;i<l.schedule.length;i++){const a=l.schedule[i-1],b=l.schedule[i];assert.ok(Math.abs(a.x-b.x)/440+.15<b.crossTime-a.crossTime);}
 for(const l of modules.catch.campaign.levels){const fruit=l.schedule.filter(e=>e.type==='fruit');for(let i=1;i<fruit.length;i++)assert.ok(Math.abs(fruit[i].x-fruit[i-1].x)/440+.15<fruit[i].time-fruit[i-1].time);}
 for(const l of modules.jump.campaign.levels)for(let i=1;i<l.schedule.length;i++){assert.ok(l.schedule[i].time-l.schedule[i-1].time>1.2);assert.ok(l.schedule[i].height<90);assert.ok(l.schedule[i].width<65);}
 for(const l of modules.rhythm.campaign.levels){assert.ok(l.window>=.125);for(let i=1;i<l.schedule.length;i++)assert.ok(l.schedule[i].time-l.schedule[i-1].time>.4);}
 for(const l of modules.lantern.campaign.levels)assert.ok(l.period-l.preview>=.6);for(const l of modules.windmill.campaign.levels)assert.ok(2*l.window/(l.speed+l.target*.025)>=.2);
});
test('unlimited puzzles and waiting actions remain playable beyond 180 seconds',()=>{for(const id of ['pairs','merge','bubbles','balance','pebble','weave','jugs','constellation','bridge','tower','rings','windmill']){const game=modules[id].createGame({level:modules[id].campaign.levels[19],onFinish:()=>assert.fail(id+' time limit')});game.update(181);assert.equal(game.getState().elapsed,181);assert.ok(!game.getState().finished&&!game.getState().done);game.destroy();}});
test('finite event failure, collisions and mistakes use one failure result and retry stays deterministic',()=>{
 for(const id of ['star','catch','rain','jump','rhythm','lantern','sail']){const level=modules[id].campaign.levels[19],results=[],g=modules[id].createGame({level,onFinish:r=>results.push(r)});for(let i=0;i<12000&&!results.length;i++)g.update(1/60);assert.equal(results.length,1,id);assert.equal(results[0].won,false,id);assert.notEqual(results[0].reason,'time');g.update(500);assert.equal(results.length,1);}
 for(const id of ['snake','windmill']){let result;const g=modules[id].createGame({level:modules[id].campaign.levels[0],onFinish:r=>result=r});if(id==='snake')g.update(10);else for(let i=0;i<3;i++)g.input('key-down',{key:' '});assert.equal(result.won,false);assert.ok(result.mistakes>0);}
});
const memoryStorage=()=>{const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
test('record policies retain old progress, compare new fields, reject locked wins and support unavailable storage',()=>{
 const storage=memoryStorage(),legacy={won:true,steps:8,elapsed:30};storage.setItem(CAMPAIGN_KEY,JSON.stringify({version:1,games:{lights:{version:1,best:{1:legacy}},mines:{version:1,best:{1:legacy}}}}));const store=createCampaignStore(storage);assert.deepEqual(store.progress('lights').best[1],legacy);assert.equal(store.progress('mines').unlocked,2);assert.equal(store.record('star',1,2,{won:true,score:60,elapsed:5,mistakes:0}),false);
 const save=(id,r)=>store.record(id,1,1,{won:true,elapsed:30,...r});assert.ok(save('star',{score:60,mistakes:1}));assert.ok(save('star',{score:55,mistakes:0}));assert.equal(save('star',{score:100,mistakes:1}),false);assert.ok(save('star',{score:60,mistakes:0,elapsed:99}));assert.equal(save('star',{score:60,mistakes:0,elapsed:100}),false);assert.ok(save('pairs',{steps:1,elapsed:50}));assert.ok(save('pairs',{steps:50,elapsed:40}));assert.ok(save('jugs',{steps:6,elapsed:10}));assert.equal(save('jugs',{steps:7,elapsed:1}),false);assert.equal(createCampaignStore(storage).progress('star').unlocked,2);assert.equal(store.progress('lights').unlocked,2);
 let warnings=0;const unavailable=createCampaignStore(null,()=>warnings++);assert.ok(unavailable.record('star',1,1,{won:true,mistakes:0,score:60,elapsed:10}));assert.equal(unavailable.progress('star').unlocked,2);assert.equal(warnings,1);storage.setItem(CAMPAIGN_KEY,'{broken');assert.equal(createCampaignStore(storage).progress('star').unlocked,1);
 for(const game of games){const view=campaignView(game,{size:6,mineCount:8});assert.equal(view.limit,null);assert.equal(view.canvas.width,600);}
});
