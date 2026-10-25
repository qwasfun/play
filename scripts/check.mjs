import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
async function check(dir){for(const file of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${file.name}`;if(file.isDirectory()) await check(path); else if(/\.m?js$/.test(path)){const r=spawnSync(process.execPath,['--check',path],{stdio:'inherit'});if(r.status) process.exit(r.status);}}}
await check('dist');await check('tests');console.log('JavaScript syntax checks passed.');
