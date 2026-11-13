import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beijingDate, branchTask, validDate } from './game-policy.mjs';

const run = (command, args, options = {}) =>
  execFileSync(command, args, { encoding: 'utf8', ...options }).trim();
export function selectDailyTask(date, candidates) {
  if (!validDate(date)) throw Error('任务日期：请使用有效的 YYYY-MM-DD 日期');
  const matching = [...new Set(candidates.filter((branch) => branchTask(branch)?.date === date))];
  if (matching.length > 1)
    throw Error(`每日任务：${date} 已存在多个任务，请先人工整理，不能继续新增`);
  return matching[0] ?? null;
}
export function taskBranch(id, date = beijingDate()) {
  const branch = `game/${date}/${id}`;
  if (!branchTask(branch))
    throw Error('游戏 ID：请使用小写英文字母、数字及单个连接线，且以字母开头；日期必须有效');
  return branch;
}
async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'start') {
    const [id, requestedDate = beijingDate(), requestedDirectory] = args;
    const requestedBranch = taskBranch(id, requestedDate);
    const repo = run('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']);
    run('git', ['fetch', '--prune', 'origin']);
    // Query closed PRs as well: a released or failed day is resumed, never generated twice.
    const prs = JSON.parse(
      run('gh', ['api', '--paginate', '--slurp', `repos/${repo}/pulls?state=all&per_page=100`]),
    ).flat();
    const refs = run('git', [
      'for-each-ref',
      '--format=%(refname:short)',
      'refs/heads/game/',
      'refs/remotes/origin/game/',
    ])
      .split('\n')
      .map((ref) => ref.replace(/^origin\//, ''));
    const previous = selectDailyTask(requestedDate, [...refs, ...prs.map((pr) => pr.head.ref)]);
    const branch = previous || requestedBranch;
    const existingPr = prs.find((pr) => pr.head.ref === branch);
    if (existingPr) {
      console.log(
        JSON.stringify(
          {
            branch,
            pr: existingPr.html_url,
            state: existingPr.state,
            instruction: '继续原 PR；人工接手前使用 hold，关闭的 PR 不另建重复任务',
          },
          null,
          2,
        ),
      );
      return;
    }
    const worktrees = run('git', ['worktree', 'list', '--porcelain']);
    const block = worktrees
      .split('\n\n')
      .find(
        (item) =>
          item.includes(`branch refs/heads/${branch}\n`) ||
          item.endsWith(`branch refs/heads/${branch}`),
      );
    if (block) {
      console.log(block);
      return;
    }
    const directory = resolve(requestedDirectory || `../worktrees/${branch.replaceAll('/', '-')}`);
    if (existsSync(directory))
      throw Error('工作目录：已存在，请指定一个空的新目录，不能覆盖已有文件');
    const local = refs.includes(branch);
    run('git', [
      'worktree',
      'add',
      ...(local ? [] : ['-b', branch]),
      directory,
      ...(local ? [branch] : [previous ? `origin/${branch}` : 'origin/main']),
    ]);
    console.log(
      JSON.stringify(
        {
          branch,
          directory,
          instruction:
            '仅开发这一款游戏；完成后推送分支、创建一个 PR，并添加 automation:ready 标签',
        },
        null,
        2,
      ),
    );
  } else if (command === 'hold' || command === 'ready') {
    const number = args[0];
    if (!/^\d+$/.test(number || '')) throw Error('合并请求：请提供 PR 编号');
    run('gh', [
      'pr',
      'edit',
      number,
      '--add-label',
      command === 'hold' ? 'automation:hold' : 'automation:ready',
      '--remove-label',
      command === 'hold' ? 'automation:ready' : 'automation:hold',
    ]);
    console.log(
      command === 'hold'
        ? '人工接手：已暂停自动写入和合并；所有 GPT 任务必须停止该分支写入'
        : '自动处理：已恢复；最新提交仍须重新通过全部检查',
    );
  } else
    throw Error('操作：请使用 start <id> [YYYY-MM-DD] [目录]、hold <PR编号> 或 ready <PR编号>');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
