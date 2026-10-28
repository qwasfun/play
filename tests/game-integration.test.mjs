import test from 'node:test';
import assert from 'node:assert/strict';
import {ready,verified} from '../scripts/integrate-games.mjs';
import {githubApi} from '../scripts/github-api.mjs';
test('human hold and drafts always block the integration controller',()=>{
  const pr={state:'open',draft:false,base:{ref:'main',repo:{full_name:'owner/repo'}},head:{repo:{full_name:'owner/repo'}},labels:[{name:'automation:ready'}]};
  assert.equal(ready(pr),true);assert.equal(ready({...pr,labels:[...pr.labels,{name:'automation:hold'}]}),false);assert.equal(ready({...pr,draft:true}),false);assert.equal(ready({...pr,head:{repo:{full_name:'fork/repo'}}}),false);
});
test('only successful exact-head verification from the canonical workflow is accepted',()=>{
  const run={head_sha:'current',event:'pull_request',path:'.github/workflows/game-ci.yml',conclusion:'success'};
  assert.equal(verified([run],'current'),true);assert.equal(verified([run],'old'),false);assert.equal(verified([{...run,path:'.github/workflows/fake.yml'}],'current'),false);assert.equal(verified([{...run,conclusion:'failure'}],'current'),false);
});
test('API failures report operations without leaking credentials or request bodies',async()=>{
  const api=githubApi({repository:'owner/repo',token:'private-token',fetcher:async()=>new Response('private-token',{status:403})});
  await assert.rejects(api('branches/main/protection'),error=>!error.message.includes('private-token')&&error.message.includes('403'));
});
