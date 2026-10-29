import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { githubApi } from './github-api.mjs';
import { releasePreparation, writeReleaseRef, recordRelease } from './release-policy.mjs';
const repository =
  process.env.GITHUB_REPOSITORY ||
  execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], {
    encoding: 'utf8',
  }).trim();
const token =
    process.env.GH_TOKEN ||
    process.env.GITHUB_TOKEN ||
    execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim(),
  api = githubApi({ repository, token }),
  command = process.argv[2];
const sha =
  process.env.RELEASE_SHA ||
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(sha)) throw Error('发布提交：请提供完整提交编号');
const output = (key, value) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  else console.log(`${key}=${value}`);
};
if (command === 'prepare') {
  for (const [key, value] of Object.entries(await releasePreparation(api, sha))) output(key, value);
} else if (command === 'success') {
  await recordRelease(api, sha, process.env.GITHUB_RUN_ID);
  console.log(`发布成功：${sha}`);
} else if (command === 'hold') {
  await writeReleaseRef(api, 'release/hold', sha);
  console.log('发布已暂停：后续自动合并和发布将等待人工修复');
} else if (command === 'resume') {
  if (await api('git/ref/tags/release/hold', { missing: true }))
    await api('git/refs/tags/release/hold', { method: 'DELETE' });
  await api('actions/workflows/pages.yml/dispatches', {
    method: 'POST',
    body: { ref: 'main', inputs: { release_sha: (await api('branches/main')).commit.sha } },
  });
  console.log('已解除发布暂停，并重新验收、发布当前主分支');
} else throw Error('发布操作：请使用 prepare、success、hold 或 resume');
