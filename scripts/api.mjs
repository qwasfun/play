import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const config=resolve(root,'worker/wrangler.jsonc');
const commands={
  setup:['d1','migrations','apply','arcade-leaderboard','--local','--env','local','--config',config],
  dev:['dev','--local','--env','local','--ip','127.0.0.1','--port','8787','--config',config],
  build:['deploy','--dry-run','--config',config,'--outdir',resolve(root,'output/worker/bundle')]
};
const args=commands[process.argv[2]];
if(!args)throw Error('请选择 setup、dev 或 build');
mkdirSync(resolve(root,'output/worker'),{recursive:true});
const result=spawnSync(process.execPath,[resolve(root,'node_modules/wrangler/bin/wrangler.js'),...args],{
  cwd:root,stdio:'inherit',env:{...process.env,WRANGLER_LOG_PATH:resolve(root,'output/worker/wrangler.log'),WRANGLER_SEND_METRICS:'false'}
});
if(result.error)console.error(result.error.message);
process.exitCode=result.status??1;
