import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import {
  documentationOnly,
  documentationPaths,
  changedPaths,
} from '../scripts/documentation-policy.mjs';

test('only explicit documentation paths skip verification and mixed changes never do', () => {
  assert.equal(
    documentationOnly([
      'README.md',
      'AGENTS.md',
      'docs/DEVELOPMENT.md',
      'docs/nested/guide.md',
      'games/star/README.md',
    ]),
    true,
  );
  assert.equal(documentationOnly([]), false);
  for (const path of [
    'apps/arcade/public/help.md',
    'games/star/src/README.md',
    'docs/generate.mjs',
    '.github/workflows/game-ci.yml',
    'package.json',
    'games/star/src/index.js',
    'worker/index.js',
  ]) {
    assert.equal(documentationOnly(['README.md', path]), false, path);
  }
});

function repository(t) {
  const directory = mkdtempSync(join(tmpdir(), 'play-docs-policy-'));
  t.after(() => {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep));
    rmSync(directory, { recursive: true, force: true });
  });
  const git = (...args) =>
    execFileSync(
      'git',
      ['-c', 'user.name=Policy Test', '-c', 'user.email=policy@example.test', ...args],
      { cwd: directory, encoding: 'utf8' },
    ).trim();
  git('init', '-b', 'main');
  const save = (path, contents) => writeFileSync(join(directory, path), contents);
  const commit = () => {
    git('add', '.');
    git('commit', '-m', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  save('README.md', 'Original documentation\n');
  save('runtime.js', 'export const version = 1;\n');
  const base = commit();
  return { directory, git, save, commit, base };
}

test('PR detection uses the merge base and still catches code renamed into documentation', (t) => {
  const { directory, git, save, commit, base } = repository(t);
  git('switch', '-c', 'docs');
  save('README.md', 'Updated documentation\n');
  const head = commit();
  git('switch', 'main');
  save('runtime.js', 'export const version = 2;\n');
  const main = commit();
  assert.deepEqual(changedPaths(main, head, { mergeBase: true, cwd: directory }), ['README.md']);
  git('switch', 'docs');
  mkdirSync(join(directory, 'docs'));
  renameSync(join(directory, 'runtime.js'), join(directory, 'docs/runtime.md'));
  const renamed = commit();
  const paths = changedPaths(base, renamed, { cwd: directory });
  assert.ok(paths.includes('runtime.js'));
  assert.equal(documentationOnly(paths), false);
});

test('push detection covers every commit and does not hide earlier code changes', (t) => {
  const { directory, save, commit, base } = repository(t);
  save('runtime.js', 'export const version = 2;\n');
  commit();
  save('README.md', 'Later documentation\n');
  const head = commit();
  assert.equal(documentationOnly(changedPaths(base, head, { cwd: directory })), false);
  const output = execFileSync(
    process.execPath,
    [resolve('scripts/documentation-policy.mjs'), base, head],
    { cwd: directory, encoding: 'utf8' },
  ).trim();
  assert.equal(output, 'docs_only=false');
});

test('deployment filters match the shared documentation policy and retain manual recovery', () => {
  const workflow = readFileSync('.github/workflows/pages.yml', 'utf8');
  const filters = workflow.match(/ {4}paths-ignore:\r?\n((?: {6}- .*\r?\n)+)/)?.[1];
  assert.ok(filters);
  assert.deepEqual(
    [...filters.matchAll(/- '([^']+)'/g)].map((match) => match[1]),
    documentationPaths,
  );
  assert.match(workflow, / {2}workflow_dispatch:/);
  const ci = readFileSync('.github/workflows/game-ci.yml', 'utf8');
  assert.doesNotMatch(ci, /paths-ignore:/);
  assert.match(ci, /name: game-verification/);
  for (const command of ['npm ci', 'npm test', 'npm run check', 'npm run api:build'])
    assert.ok(
      ci.includes(`- run: ${command}\n        if: steps.changes.outputs.docs_only != 'true'`),
    );
  assert.match(
    ci,
    /if: steps.changes.outputs.docs_only != 'true'\r?\n {8}env:[\s\S]*?npm run verify:games/,
  );
});
