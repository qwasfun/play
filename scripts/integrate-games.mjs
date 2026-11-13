import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { githubApi } from './github-api.mjs';
import { inspectChanges } from './game-policy.mjs';
import { writeReleaseRef } from './release-policy.mjs';
import { mergePullRequest } from './merge-policy.mjs';
import { documentationOnly } from './documentation-policy.mjs';

export const ready = (pr) =>
  !pr.draft &&
  pr.state === 'open' &&
  pr.base.ref === 'main' &&
  pr.head.repo?.full_name === pr.base.repo?.full_name &&
  pr.labels.some((label) => label.name === 'automation:ready') &&
  !pr.labels.some((label) => label.name === 'automation:hold');
export const verified = (runs, sha) =>
  runs.some(
    (run) =>
      run.head_sha === sha &&
      ['pull_request', 'workflow_dispatch'].includes(run.event) &&
      run.path === '.github/workflows/game-ci.yml' &&
      run.conclusion === 'success',
  );

async function main() {
  const api = githubApi();
  if (await api('git/ref/tags/release/hold', { missing: true })) {
    console.log('发布暂停：请先修复失败的发布并解除 release/hold');
    return;
  }
  const active = await api('actions/workflows/pages.yml/runs?per_page=20');
  if (
    active.workflow_runs.some((run) =>
      ['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(run.status),
    )
  ) {
    console.log('发布进行中：等待完成后再合并下一款游戏');
    return;
  }
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  git('fetch', '--prune', 'origin', '+refs/heads/*:refs/remotes/origin/*');
  const pulls = await api.pages('pulls?state=open&base=main&sort=created&direction=asc');
  for (const candidate of pulls) {
    let pr = await api(`pulls/${candidate.number}`);
    if (!ready(pr)) continue;
    const base = (await api('branches/main')).commit.sha;
    const ancestor = git('merge-base', base, pr.head.sha);
    const policy = inspectChanges({ base: ancestor, head: pr.head.sha, branch: pr.head.ref });
    if (!policy.eligible) {
      console.log(`PR #${pr.number} 需人工确认：${policy.reasons.join('；')}`);
      continue;
    }
    let upToDate = true;
    try {
      git('merge-base', '--is-ancestor', base, pr.head.sha);
    } catch {
      upToDate = false;
    }
    if (!upToDate) {
      const directory = mkdtempSync(join(tmpdir(), 'game-rebase-'));
      git('worktree', 'add', '--detach', directory, pr.head.sha);
      const inTask = (...args) =>
        execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
          cwd: directory,
          encoding: 'utf8',
        }).trim();
      inTask('config', 'user.name', 'github-actions[bot]');
      inTask('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
      try {
        inTask('rebase', base);
      } catch {
        inTask('rebase', '--abort');
        await api(`issues/${pr.number}/labels`, {
          method: 'POST',
          body: { labels: ['automation:hold'] },
        });
        console.log(`PR #${pr.number} 存在冲突，已暂停，未覆盖远端修改`);
        continue;
      }
      const latest = await api(`pulls/${pr.number}`);
      if (!ready(latest) || latest.head.sha !== pr.head.sha) continue;
      inTask(
        'push',
        `--force-with-lease=refs/heads/${pr.head.ref}:${pr.head.sha}`,
        'origin',
        `HEAD:refs/heads/${pr.head.ref}`,
      );
      // GITHUB_TOKEN pushes do not trigger push CI. Explicit dispatch is required.
      try {
        await api('actions/workflows/game-ci.yml/dispatches', {
          method: 'POST',
          body: { ref: pr.head.ref, inputs: { pr_number: String(pr.number) } },
        });
      } catch (error) {
        await api(`issues/${pr.number}/labels`, {
          method: 'POST',
          body: { labels: ['automation:hold'] },
        });
        throw error;
      }
      console.log(`PR #${pr.number} 已同步主分支并重新触发完整验收`);
      return;
    }
    const runs = await api(
      `actions/workflows/game-ci.yml/runs?head_sha=${pr.head.sha}&per_page=100`,
    );
    if (!verified(runs.workflow_runs, pr.head.sha)) continue;
    pr = await api(`pulls/${pr.number}`);
    if (
      !ready(pr) ||
      pr.head.sha !== candidate.head.sha ||
      (await api('branches/main')).commit.sha !== base
    )
      continue;
    const merged = await mergePullRequest(api, pr);
    if (!merged.merged) throw Error(`合并请求：PR #${pr.number} 未合并，请检查必需状态检查`);
    if (
      documentationOnly(
        policy.files.flatMap((file) => [file.path, ...(file.previous ? [file.previous] : [])]),
      )
    ) {
      console.log(`PR #${pr.number} 仅修改文档，已 squash 合并，不触发发布`);
      return;
    }
    // GITHUB_TOKEN merges do not trigger push deployment. Dispatch the exact merged SHA.
    try {
      await api('actions/workflows/pages.yml/dispatches', {
        method: 'POST',
        body: { ref: 'main', inputs: { release_sha: merged.sha } },
      });
    } catch (error) {
      await writeReleaseRef(api, 'release/hold', merged.sha);
      throw error;
    }
    console.log(`PR #${pr.number} 已 squash 合并并启动发布 ${merged.sha}`);
    return;
  }
  console.log('没有可自动合并的游戏 PR');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
