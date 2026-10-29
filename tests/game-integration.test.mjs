import test from 'node:test';
import assert from 'node:assert/strict';
import {ready,verified} from '../scripts/integrate-games.mjs';
import {githubApi} from '../scripts/github-api.mjs';
import {configureMergeMethod,mergePullRequest} from '../scripts/merge-policy.mjs';
import {execFileSync} from 'node:child_process';
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
test('repository setup addresses the repository itself without a trailing slash',async()=>{
  let address,request;const api=githubApi({repository:'owner/repo',token:'private-token',fetcher:async(url,options)=>{address=url;request=options;return Response.json({ok:true});}});
  await configureMergeMethod(api);assert.equal(address,'https://api.github.com/repos/owner/repo');
  assert.equal(request.method,'PATCH');
  assert.deepEqual(JSON.parse(request.body),{allow_merge_commit:false,allow_squash_merge:true,allow_rebase_merge:false,squash_merge_commit_title:'PR_TITLE',squash_merge_commit_message:'BLANK',allow_auto_merge:false,delete_branch_on_merge:true});
});

test('squash merge binds the exact head and uses the PR summary without debug commit logs',async()=>{
  let address,request;
  const api=githubApi({repository:'owner/repo',token:'private-token',fetcher:async(url,options)=>{address=url;request=options;return Response.json({merged:true,sha:'squashed'});}});
  const result=await mergePullRequest(api,{number:42,title:'修复游戏结算',head:{sha:'verified-head'},body:'调试记录不应进入提交正文'});
  assert.equal(address,'https://api.github.com/repos/owner/repo/pulls/42/merge');
  assert.equal(request.method,'PUT');
  assert.deepEqual(JSON.parse(request.body),{sha:'verified-head',merge_method:'squash',commit_title:'修复游戏结算 (#42)',commit_message:''});
  assert.deepEqual(result,{merged:true,sha:'squashed'});
});

test('repository configuration dry-run advertises squash without GitHub credentials',()=>{
  const output=execFileSync(process.execPath,['scripts/configure-repository.mjs'],{encoding:'utf8',env:{...process.env,GITHUB_REPOSITORY:'owner/repo',GH_TOKEN:'',GITHUB_TOKEN:''}});
  const desired=JSON.parse(output.slice(0,output.indexOf('}')+1));
  assert.deepEqual(desired,{repository:'owner/repo',merge:'squash',requiredCheck:'game-verification',strict:true,approvals:0,enforceAdmins:true,forcePush:false,directPush:false,deleteMergedBranches:true});
});
