import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
async function check(dir){for(const file of await readdir(dir,{withFileTypes:true})){if(file.name==='.wrangler')continue;const path=`${dir}/${file.name}`;if(file.isDirectory()) await check(path); else if(/\.m?js$/.test(path)){const r=spawnSync(process.execPath,['--check',path],{stdio:'inherit'});if(r.status) process.exit(r.status);}}}
for(const dir of ['apps','games','packages','scripts','tests','worker'])await check(dir);
await import('./boundaries.mjs');
console.log('JavaScript syntax and package boundary checks passed.');
