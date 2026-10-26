import {build} from 'vite';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {createPrecache,renderPrecache} from './prepare-pwa.mjs';
export async function buildArcade(){
  const project=fileURLToPath(new URL('../',import.meta.url));
  await build({configFile:resolve(project,'vite.config.js')});
  const root=resolve(project,'dist');
  await writeFile(resolve(root,'precache.js'),renderPrecache(await createPrecache(root)));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildArcade();
