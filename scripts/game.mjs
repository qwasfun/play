import { build, createServer } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const project = fileURLToPath(new URL('../', import.meta.url));
export async function buildGame(directory) {
  const root = resolve(directory),
    id = basename(root);
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  if (dirname(root) !== resolve(project, 'games'))
    throw Error('构建目录：必须是当前仓库内的直接游戏包目录');
  await build({
    configFile: false,
    root,
    logLevel: 'warn',
    build: {
      outDir: resolve(root, 'dist'),
      emptyOutDir: true,
      target: 'es2022',
      lib: {
        entry: Object.fromEntries(
          [
            'index',
            'manifest',
            'art',
            'rules',
            ...(pkg.exports['./campaign'] ? ['campaign'] : []),
          ].map((name) => [name, resolve(root, `src/${name}.js`)]),
        ),
        formats: ['es'],
        cssFileName: `game-${id}`,
      },
    },
  });
}
async function main() {
  const directory = process.cwd(),
    pkg = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  if (!pkg.name.startsWith('@playground/game-') || !directory.startsWith(resolve(project, 'games')))
    throw Error('游戏包：请通过指定游戏工作区运行命令');
  if (process.argv[2] === 'build') {
    await buildGame(directory);
    console.log(`Built ${pkg.name}`);
    return;
  }
  if (process.argv[2] !== 'dev') throw Error('游戏命令：请选择 dev 或 build');
  const server = await createServer({
    configFile: false,
    root: resolve(project, 'packages/game-runtime/preview'),
    resolve: {
      alias: [
        {
          find: '@game/campaign',
          replacement: pkg.exports['./campaign']
            ? resolve(directory, 'src/campaign.js')
            : resolve(project, 'packages/game-runtime/preview/empty-campaign.js'),
        },
        { find: '@game/manifest', replacement: resolve(directory, 'src/manifest.js') },
        { find: '@game/rules', replacement: resolve(directory, 'src/rules.js') },
        { find: /^@game$/, replacement: resolve(directory, 'src/index.js') },
      ],
    },
    server: { host: '127.0.0.1', port: 5173, fs: { allow: [project] } },
  });
  await server.listen();
  server.printUrls();
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
