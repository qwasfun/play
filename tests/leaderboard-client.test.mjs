import test from 'node:test';
import assert from 'node:assert/strict';
import {createLeaderboardClient} from '../dist/leaderboard-client.js';
import {createAnalytics} from '../dist/analytics.js';

test('API client includes cookies, uses the supplied seed and preserves field errors',async()=>{
  const calls=[];const client=createLeaderboardClient({baseUrl:'https://api.example.test',fetcher:async(url,options)=>{
    calls.push({url,options});if(url.endsWith('/v1/guests'))return Response.json({player:{id:'p'}});
    if(url.endsWith('/v1/runs'))return Response.json({run:{id:'r',seed:123,expiresAt:Date.now()+1000}});
    return Response.json({errors:[{field:'nickname',code:'invalid',message:'昵称：请输入 2–12 个字符'}]},{status:400});
  }});
  assert.equal((await client.start({gameId:'star',restartOf:'previous'})).seed,123);
  assert.equal(JSON.parse(calls[1].options.body).restartOf,'previous');assert.equal(calls[0].options.credentials,'include');
  await assert.rejects(client.rename('x'),error=>error.message==='昵称：请输入 2–12 个字符'&&error.errors[0].field==='nickname');
});
test('offline, disabled, missing analytics and network failure cannot block local play',async()=>{
  let calls=0;const fetcher=async()=>{calls++;throw Error('network');};
  await assert.rejects(createLeaderboardClient({baseUrl:'',fetcher}).start({gameId:'star'}),/尚未开放/);
  await assert.rejects(createLeaderboardClient({baseUrl:'https://api.test',fetcher,online:()=>false}).start({gameId:'star'}),/离线/);assert.equal(calls,0);
  await assert.rejects(createLeaderboardClient({baseUrl:'https://api.test',fetcher}).start({gameId:'star'}),/连接暂时不可用/);
  const track=createAnalytics({config:{websiteId:'test'},scope:{umami:{track:()=>{throw Error();}}}});assert.doesNotThrow(()=>track('game_start',{}));
});
test('analytics only sends approved game fields and swallows asynchronous rejection',async()=>{
  const events=[];const track=createAnalytics({config:{websiteId:'test'},scope:{umami:{track:(name,data)=>{events.push({name,data});return Promise.reject(Error());}}}});
  track('game_finish',{game_id:'star',score:10,nickname:'private',session:'secret',email:'private@example.test'});
  assert.deepEqual(events,[{name:'game_finish',data:{game_id:'star',score:10}}]);await new Promise(resolve=>setTimeout(resolve,0));
});
test('early analytics events flush only when the configured script loads',()=>{
  const events=[],scripts=[],scope={};const document={createElement:()=>({dataset:{}}),head:{append:script=>scripts.push(script)}};
  const track=createAnalytics({config:{websiteId:'test-site',scriptUrl:'https://cloud.umami.is/script.js'},scope,document});
  track('game_start',{game_id:'star',session:'secret'});assert.equal(events.length,0);assert.equal(scripts.length,1);
  scope.umami={track:(name,data)=>events.push({name,data})};scripts[0].onload();assert.deepEqual(events,[{name:'game_start',data:{game_id:'star'}}]);
});
