import {build} from 'vite';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {games} from '@playground/game-registry';
import {createPrecache,renderPrecache} from './prepare-pwa.mjs';
export async function buildArcade(){
  const project=fileURLToPath(new URL('../',import.meta.url));
  await build({configFile:resolve(project,'vite.config.js')});
  const root=resolve(project,'dist');
  const description=`${games.length} 款中文小游戏与每日挑战，支持手机、电脑和离线游玩。`;
  const manifest=JSON.parse(await readFile(resolve(root,'manifest.webmanifest'),'utf8'));
  manifest.description=description;
  await writeFile(resolve(root,'manifest.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
  const index=await readFile(resolve(root,'index.html'),'utf8');
  await writeFile(resolve(root,'index.html'),index.replace(/(<meta name="description" content=")[^"]*(")/,`$1给自己三分钟，来玩一点开心。${description}$2`));
  await writeFile(resolve(root,'precache.js'),renderPrecache(await createPrecache(root)));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildArcade();
