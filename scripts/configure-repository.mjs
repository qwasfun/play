import { execFileSync } from 'node:child_process';
import { githubApi } from './github-api.mjs';
import { REQUIRED_CHECK } from './game-policy.mjs';
import { MERGE_METHOD, configureMergeMethod } from './merge-policy.mjs';
const repository =
  process.env.GITHUB_REPOSITORY ||
  execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], {
    encoding: 'utf8',
  }).trim();
const desired = {
  repository,
  merge: MERGE_METHOD,
  requiredCheck: REQUIRED_CHECK,
  strict: true,
  approvals: 0,
  enforceAdmins: true,
  forcePush: false,
  directPush: false,
  deleteMergedBranches: true,
};
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify(desired, null, 2));
  console.log('以上为预览；添加 --apply 才会修改远端设置。');
} else {
  const token =
      process.env.GH_TOKEN ||
      process.env.GITHUB_TOKEN ||
      execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim(),
    api = githubApi({ repository, token });
  const current = await api('branches/main/protection', { missing: true });
  const checks = [
    ...new Set([...(current?.required_status_checks?.contexts || []), REQUIRED_CHECK]),
  ];
  await configureMergeMethod(api);
  await api('branches/main/protection', {
    method: 'PUT',
    body: {
      required_status_checks: { strict: true, contexts: checks },
      enforce_admins: true,
      required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false,
        required_approving_review_count: 0,
        require_last_push_approval: false,
      },
      restrictions: current?.restrictions
        ? {
            users: current.restrictions.users.map((user) => user.login),
            teams: current.restrictions.teams.map((team) => team.slug),
            apps: current.restrictions.apps.map((app) => app.slug),
          }
        : null,
      required_linear_history: true,
      allow_force_pushes: false,
      allow_deletions: false,
      required_conversation_resolution: current?.required_conversation_resolution?.enabled ?? true,
      block_creations: current?.block_creations?.enabled ?? false,
    },
  });
  for (const [name, color, description] of [
    ['automation:ready', '0e8a16', 'Ready for verified game-only integration'],
    ['automation:hold', 'd93f0b', 'Human ownership; stop automatic writes and integration'],
  ])
    if (!(await api(`labels/${encodeURIComponent(name)}`, { missing: true })))
      await api('labels', { method: 'POST', body: { name, color, description } });
  const actual = await api('branches/main/protection');
  if (
    !actual.required_status_checks.strict ||
    !actual.enforce_admins.enabled ||
    actual.allow_force_pushes.enabled ||
    !actual.required_status_checks.contexts.includes(REQUIRED_CHECK)
  )
    throw Error('分支保护：回读结果与要求不一致，请检查仓库设置');
  console.log(JSON.stringify({ ...desired, applied: true }, null, 2));
}
