import { execFileSync } from 'node:child_process';
import { matchesGlob, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Only repository documentation is exempt; Markdown served by the app is not.
export const documentationPaths = ['README.md', 'AGENTS.md', 'docs/**/*.md', 'games/*/README.md'];

export function documentationOnly(paths) {
  return (
    paths.length > 0 &&
    paths.every((path) => documentationPaths.some((pattern) => matchesGlob(path, pattern)))
  );
}

export function changedPaths(base, head, { mergeBase = false, cwd } = {}) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  const start = mergeBase ? git('merge-base', base, head).trim() : base;
  // Treat renames as deletion + addition so both paths must be documentation.
  return git('diff', '--name-only', '--no-renames', '-z', start, head).split('\0').filter(Boolean);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [base, head] = process.argv.slice(2);
  if (!base || !head) throw Error('文档变更检查：请提供基准和目标提交编号');
  console.log(
    `docs_only=${documentationOnly(changedPaths(base, head, { mergeBase: process.argv.includes('--merge-base') }))}`,
  );
}
