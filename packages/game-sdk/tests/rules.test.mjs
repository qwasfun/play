import test from 'node:test';
import assert from 'node:assert/strict';
import {rng} from '../src/index.js';
import {createResultRules} from '../src/rules.js';
test('SDK random sequences are deterministic without a game registry',()=>{
  const a=rng('daily'),b=rng('daily');assert.deepEqual(Array.from({length:100},a),Array.from({length:100},b));
});
test('result errors identify each field and do not echo submitted values',()=>{
  const rules=createResultRules({manifest:{title:'测试',limit:60},cap:100,counters:{steps:12}});
  const secret='private-submission';const errors=rules.validate({score:secret,elapsed:-1,won:secret,steps:99});
  assert.deepEqual(errors.map(item=>item.field),['score','elapsed','won','steps']);
  assert.ok(errors.every(item=>item.code&&item.message.includes('：')));assert.ok(!JSON.stringify(errors).includes(secret));
});
test('historical storage accepts old records beyond current online score caps',()=>{
  const rules=createResultRules({manifest:{title:'测试',limit:60},cap:100});const record={score:200,elapsed:80,won:true};
  assert.equal(rules.stored(record),true);assert.equal(rules.validate(record).length,2);
});
test('new game counters and their labels remain owned by the game policy',()=>{
  const rules=createResultRules({manifest:{title:'测试',limit:60},cap:100,counters:{deliveries:4},labels:{deliveries:'投递数量'}});
  assert.equal(rules.validate({score:10,elapsed:1,won:false,deliveries:5})[0].message,'投递数量：请输入 0–4 之间的整数');
  assert.deepEqual(rules.clean({score:10,elapsed:1,won:false,deliveries:3,secret:'private'}),{score:10,elapsed:1,won:false,deliveries:3});
});
