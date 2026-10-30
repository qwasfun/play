import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyChanges,
  branchTask,
  beijingDate,
  registrationPreserved,
  manifestId,
} from '../scripts/game-policy.mjs';
import { selectDailyTask, taskBranch } from '../scripts/game-task.mjs';

const classify = (changes) =>
  classifyChanges({
    branch: 'game/2026-10-29/new-game',
    files: [{ status: 'A', path: 'games/new-game/src/index.js' }],
    baseIds: ['star'],
    headIds: ['star', 'new-game'],
    ...changes,
  });
test('daily scope permits one new game and only its necessary registration', () => {
  assert.equal(
    classify({
      files: [
        { status: 'A', path: 'games/new-game/src/index.js' },
        { status: 'M', path: 'packages/game-registry/src/index.js' },
      ],
    }).eligible,
    true,
  );
  assert.equal(classify({ headIds: ['star', 'new-game', 'another'] }).eligible, false);
  assert.equal(classify({ headIds: ['new-game'] }).eligible, false);
});
test('shared runtime, workflows, historical calendars, secrets and cross-game edits require manual handling', () => {
  for (const path of [
    'packages/game-runtime/src/index.js',
    '.github/workflows/pages.yml',
    'packages/game-registry/src/core.js',
    'games/star/src/index.js',
    'games/new-game/.env',
    'games/new-game/dist/index.js',
  ])
    assert.equal(classify({ files: [{ status: 'M', path }] }).eligible, false, path);
});
test('renames and deleted files cannot escape review through the destination path', () => {
  assert.equal(
    classify({
      files: [{ status: 'R100', previous: 'worker/index.js', path: 'games/new-game/src/index.js' }],
    }).eligible,
    false,
  );
  assert.equal(
    classify({ files: [{ status: 'D', path: 'games/new-game/src/index.js' }] }).eligible,
    false,
  );
});
test('human design and fix branches may update exactly one existing game', () => {
  const change = {
    branch: 'design/star/colors',
    files: [{ status: 'M', path: 'games/star/src/art.js' }],
    headIds: ['star'],
  };
  assert.equal(classify(change).eligible, true);
  assert.equal(
    classify({ ...change, files: [...change.files, { status: 'M', path: 'package-lock.json' }] })
      .eligible,
    false,
  );
});
test('dates and branch names are validated and task identity follows Beijing midnight', () => {
  assert.equal(branchTask('game/2026-02-30/test'), null);
  assert.equal(branchTask('game/2026-10-29/a;command'), null);
  assert.equal(beijingDate(new Date('2026-10-28T16:01:00Z')), '2026-10-29');
  assert.throws(() => taskBranch('../escape'), /游戏 ID/);
});
test('retry resumes the original daily branch even when a different game ID is supplied', () => {
  assert.equal(
    selectDailyTask('2026-10-29', ['game/2026-10-29/first', 'game/2026-10-29/first']),
    'game/2026-10-29/first',
  );
  assert.throws(
    () => selectDailyTask('2026-10-29', ['game/2026-10-29/first', 'game/2026-10-29/second']),
    /多个任务/,
  );
});
test('registration permits an added game but rejects changes hidden in a permitted shared file', () => {
  const before =
    "import {manifest as star} from '@playground/game-star/manifest'; export const games=[star]; export const gameRules={star:starRules};";
  const after =
    "import {manifest as newGame} from '@playground/game-new-game/manifest'; import {rules as newRules} from '@playground/game-new-game/rules'; import {manifest as star} from '@playground/game-star/manifest'; export const games=[star,newGame]; export const gameRules={star:starRules,'new-game':newRules};";
  assert.equal(registrationPreserved(before, after, 'new-game'), true);
  assert.equal(
    registrationPreserved(before, after.replace('star:starRules', 'star:otherRules'), 'new-game'),
    false,
  );
  assert.equal(
    registrationPreserved(before, after + ' globalThis.sideEffect=true;', 'new-game'),
    false,
  );
});
test('published identity is read statically without running game code', () => {
  assert.equal(manifestId("export const manifest={id:'star',title:'New design'};"), 'star');
  assert.equal(manifestId('export const manifest={id:calculatePrivateValue()};'), undefined);
});
