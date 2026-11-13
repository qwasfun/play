import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

export const REQUIRED_CHECK = 'game-verification';
const slug = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*';
export function branchTask(branch) {
  let match = branch.match(new RegExp(`^game/(\\d{4}-\\d{2}-\\d{2})/(${slug})$`));
  if (match && validDate(match[1])) return { kind: 'game', date: match[1], id: match[2] };
  match = branch.match(new RegExp(`^(design|fix)/(${slug})/(${slug})$`));
  return match ? { kind: match[1], id: match[2] } : null;
}
export function validDate(value) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function beijingDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function manifestId(source) {
  const tree = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const manifest = tree.body
    .flatMap((statement) => statement.declaration?.declarations || [])
    .find((declaration) => declaration.id.name === 'manifest');
  return manifest?.init?.properties?.find(
    (property) => (property.key?.name ?? property.key?.value) === 'id',
  )?.value?.value;
}
function plainAst(value) {
  if (Array.isArray(value)) return value.map(plainAst);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !['start', 'end', 'raw'].includes(key))
      .map(([key, item]) => [key, plainAst(item)]),
  );
}
export function registrationPreserved(before, after, id) {
  const original = parse(before, { ecmaVersion: 'latest', sourceType: 'module' });
  const next = parse(after, { ecmaVersion: 'latest', sourceType: 'module' });
  const aliases = new Map();
  next.body = next.body.filter((statement) => {
    if (
      statement.type !== 'ImportDeclaration' ||
      !statement.source.value.startsWith(`@playground/game-${id}/`)
    )
      return true;
    const type = statement.source.value.split('/').at(-1);
    if (
      !['manifest', 'rules', 'art'].includes(type) ||
      statement.specifiers.some(
        (specifier) => specifier.type !== 'ImportSpecifier' || specifier.imported.name !== type,
      )
    )
      throw Error('注册导入：只能导入新游戏公开的 manifest、rules 和 art');
    statement.specifiers.forEach((specifier) => aliases.set(specifier.local.name, type));
    return false;
  });
  for (const statement of next.body)
    for (const declaration of statement.declaration?.declarations || []) {
      const name = declaration.id.name,
        init = declaration.init;
      if (name === 'games' && init?.type === 'ArrayExpression')
        init.elements = init.elements.filter(
          (element) =>
            !(element?.type === 'Identifier' && aliases.get(element.name) === 'manifest'),
        );
      if (
        ['gameRules', 'illustrations', 'loaders'].includes(name) &&
        init?.type === 'ObjectExpression'
      )
        init.properties = init.properties.filter((property) => {
          if ((property.key.name ?? property.key.value) !== id) return true;
          const value = property.value;
          if (name === 'loaders') {
            if (
              value?.type !== 'ArrowFunctionExpression' ||
              value.params.length ||
              value.body.type !== 'ImportExpression' ||
              value.body.source.value !== `@playground/game-${id}`
            )
              throw Error('游戏加载器：只能动态导入新游戏公开入口');
          } else if (
            value?.type !== 'Identifier' ||
            aliases.get(value.name) !== (name === 'gameRules' ? 'rules' : 'art')
          )
            throw Error('注册映射：只能追加新游戏的规则或插画');
          return false;
        });
    }
  return JSON.stringify(plainAst(original)) === JSON.stringify(plainAst(next));
}
export function classifyChanges({ branch, files, baseIds, headIds }) {
  const task = branchTask(branch),
    reasons = [];
  const changedIds = [
    ...new Set(
      files.flatMap((file) =>
        [file.path, file.previous]
          .filter(Boolean)
          .flatMap((path) => path.match(/^games\/([^/]+)\//)?.[1] ?? []),
      ),
    ),
  ];
  const added = headIds.filter((id) => !baseIds.includes(id));
  const removed = baseIds.filter((id) => !headIds.includes(id));
  if (!task)
    reasons.push('分支：请使用 game/YYYY-MM-DD/<id>、design/<id>/<主题> 或 fix/<id>/<问题>');
  if (!files.length) reasons.push('修改内容：不能为空');
  if (removed.length) reasons.push('已发布游戏：不得删除或更换游戏 ID');
  if (
    task?.kind === 'game' &&
    (added.length !== 1 || added[0] !== task.id || baseIds.includes(task.id))
  )
    reasons.push('每日新增：必须只新增分支指定的一款游戏');
  if (task && task.kind !== 'game' && (!baseIds.includes(task.id) || added.length))
    reasons.push('游戏调整：必须修改已发布游戏，不能混入新游戏');
  if (task && (changedIds.length !== 1 || changedIds[0] !== task.id))
    reasons.push('游戏范围：每个 PR 只能修改分支指定的一款游戏');
  const registration = new Set([
    'packages/game-registry/package.json',
    'packages/game-registry/src/index.js',
    'packages/game-registry/src/browser.js',
    'package-lock.json',
  ]);
  for (const file of files) {
    const paths = [file.path, file.previous].filter(Boolean);
    if (
      paths.some((path) =>
        /(?:^|\/)(?:dist|node_modules|output|outputs|artifacts)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|(?:^|\/)\.dev\.vars/.test(
          path,
        ),
      )
    )
      reasons.push(`提交文件：${file.path} 不允许提交产物或私密配置`);
    if (file.status?.startsWith('R') || file.status === 'D')
      reasons.push(`文件变更：${file.path} 的删除或重命名需要人工确认`);
    if (
      !task ||
      paths.some(
        (path) =>
          !path.startsWith(`games/${task.id}/`) &&
          !(task.kind === 'game' && registration.has(path)),
      )
    )
      reasons.push(`修改范围：${file.path} 需要人工确认`);
  }
  return {
    eligible: reasons.length === 0,
    task,
    changedIds,
    added,
    removed,
    reasons: [...new Set(reasons)],
  };
}
export function inspectChanges({ base, head = 'HEAD', branch, cwd = process.cwd() }) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trimEnd();
  const ids = (ref) =>
    git('ls-tree', '-d', '--name-only', `${ref}:games`).split('\n').filter(Boolean);
  const fields = git('diff', '--name-status', '-z', '--find-renames', base, head)
      .split('\0')
      .filter(Boolean),
    files = [];
  for (let i = 0; i < fields.length;) {
    const status = fields[i++],
      previous = fields[i++];
    files.push(
      status.startsWith('R') || status.startsWith('C')
        ? { status, previous, path: fields[i++] }
        : { status, path: previous },
    );
  }
  const result = classifyChanges({ branch, files, baseIds: ids(base), headIds: ids(head) });
  result.files = files;
  if (result.task && result.eligible) {
    const id = result.task.id;
    try {
      if (manifestId(git('show', `${head}:games/${id}/src/manifest.js`)) !== id)
        result.reasons.push(
          '游戏标识：manifest.id 必须与游戏目录和分支 ID 一致，不能替换已发布 ID',
        );
      const name = JSON.parse(git('show', `${head}:games/${id}/package.json`)).name;
      if (name !== `@playground/game-${id}`)
        result.reasons.push('游戏包名：必须与稳定游戏 ID 一致');
    } catch {
      result.reasons.push('游戏元信息：请保留有效的 manifest.id 和 package.json 公开包名');
    }
    if (
      result.task.kind !== 'game' &&
      files.some((file) =>
        /^games\/[^/]+\/(?:src\/rules\.js|.*campaign.*|.*levels.*)$/.test(file.path),
      )
    )
      result.reasons.push('计分规则与已发布关卡：修改需要人工确认版本兼容性');
  }
  // New-game registration must preserve every existing entry, dependency and relative order.
  if (result.task?.kind === 'game' && result.eligible && !result.reasons.length) {
    for (const path of [
      'packages/game-registry/src/index.js',
      'packages/game-registry/src/browser.js',
    ]) {
      const before = git('show', `${base}:${path}`),
        after = git('show', `${head}:${path}`);
      try {
        if (!registrationPreserved(before, after, result.task.id))
          result.reasons.push(`注册表：${path} 只能追加新游戏，不得改写现有逻辑`);
      } catch (error) {
        result.reasons.push(error.message);
      }
    }
    const before = JSON.parse(git('show', `${base}:packages/game-registry/package.json`));
    const after = JSON.parse(git('show', `${head}:packages/game-registry/package.json`));
    const dependency = `@playground/game-${result.task.id}`;
    delete after.dependencies?.[dependency];
    if (JSON.stringify(before) !== JSON.stringify(after))
      result.reasons.push('注册依赖：只能追加新游戏依赖，不能改写现有配置');
    const oldLock = JSON.parse(git('show', `${base}:package-lock.json`));
    const newLock = JSON.parse(git('show', `${head}:package-lock.json`));
    delete newLock.packages[`games/${result.task.id}`];
    delete newLock.packages[`node_modules/${dependency}`];
    delete newLock.packages['packages/game-registry']?.dependencies?.[dependency];
    if (JSON.stringify(oldLock) !== JSON.stringify(newLock))
      result.reasons.push('依赖锁：只能增加新游戏工作区链接，其他依赖调整需要人工确认');
    const gamePackage = JSON.parse(git('show', `${head}:games/${result.task.id}/package.json`));
    if (
      Object.keys(gamePackage.dependencies || {}).some((name) => name !== '@playground/game-sdk') ||
      Object.keys(gamePackage.devDependencies || {}).length
    )
      result.reasons.push('游戏依赖：新增第三方依赖需要人工确认');
  }
  result.eligible = result.reasons.length === 0;
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [
    ,
    ,
    base,
    head = 'HEAD',
    branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(),
  ] = process.argv;
  if (!base) throw Error('基准提交：请提供要比较的主分支提交');
  const result = inspectChanges({ base, head, branch });
  console.log(JSON.stringify(result, null, 2));
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `eligible=${result.eligible}\ngames=${JSON.stringify(result.changedIds)}\n`,
    );
  }
}
