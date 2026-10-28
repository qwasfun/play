import test from 'node:test';
import assert from 'node:assert/strict';
import {releasePreparation,recordRelease} from '../scripts/release-policy.mjs';
const current='a'.repeat(40),previous='b'.repeat(40);
function fixture(overrides={}){
  const calls=[],values={
    'git/ref/tags/release/hold':null,'branches/main':{commit:{sha:current}},[`git/ref/tags/release/${current}`]:null,
    'git/ref/tags/release/last-good':{object:{type:'tag',sha:'tag-object'}},
    'git/tags/tag-object':{message:JSON.stringify({sha:previous,runId:'123'})},
    'actions/runs/123/artifacts':{artifacts:[{name:'release-site',expired:false}]},...overrides
  };
  const api=async(path,options={})=>{calls.push({path,...options});if(options.method==='POST'&&path==='git/tags')return{sha:'new-tag'};return values[path]??null;};
  return{api,calls};
}
test('failed release hold blocks all publication until explicitly resumed',async()=>{
  const f=fixture({'git/ref/tags/release/hold':{object:{sha:previous}}});await assert.rejects(releasePreparation(f.api,current),/发布暂停/);assert.equal(f.calls.length,1);
});
test('outdated or already released commits cannot overwrite a newer website',async()=>{
  const f=fixture({'branches/main':{commit:{sha:previous}}});assert.equal((await releasePreparation(f.api,current)).skip,true);
  const g=fixture({[`git/ref/tags/release/${current}`]:{object:{sha:current}}});assert.equal((await releasePreparation(g.api,current)).skip,true);
});
test('publishing requires a valid previous version and an unexpired rollback artifact',async()=>{
  const f=fixture();assert.deepEqual(await releasePreparation(f.api,current),{skip:false,previous_run_id:'123',previous_sha:previous,previous_artifact:'release-site'});
  const g=fixture({'actions/runs/123/artifacts':{artifacts:[{name:'release-site',expired:true}]}});await assert.rejects(releasePreparation(g.api,current),/回滚副本/);
});
test('first release can restore the previous workflow Pages artifact',async()=>{
  const f=fixture({'git/ref/tags/release/last-good':null,'actions/workflows/pages.yml/runs?status=success&per_page=10':{workflow_runs:[{id:123,head_sha:previous}]},'actions/runs/123/artifacts':{artifacts:[{name:'github-pages',expired:false}]}});
  assert.equal((await releasePreparation(f.api,current)).previous_artifact,'github-pages');
});
test('successful release tags and rollback pointer refer to the tested commit and run',async()=>{
  const f=fixture();await recordRelease(f.api,current,'999');
  const tag=f.calls.find(call=>call.path==='git/tags');assert.equal(tag.body.object,current);assert.equal(JSON.parse(tag.body.message).runId,'999');
  assert.equal(f.calls.some(call=>call.body?.ref===`refs/tags/release/${current}`),true);
  assert.equal(f.calls.some(call=>call.path==='git/refs/tags/release/last-good'&&call.body.sha==='new-tag'),true);
  assert.equal(f.calls.some(call=>call.path.includes('release/hold')),false);
});
