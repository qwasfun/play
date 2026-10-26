// Isolated release-transition fixture. Production dist is read only.
import http from 'node:http';
import {cp,mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPrecache,renderPrecache} from './prepare-pwa.mjs';
import {execFileSync} from 'node:child_process';

const project=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(project,'output/playwright');
await mkdir(output,{recursive:true});
const fixture=await mkdtemp(resolve(output,'pwa-update-'));
const roots={A:resolve(fixture,'A'),B:resolve(fixture,'B')};
const legacyIndex=process.argv.indexOf('--from-ref'),legacyRef=legacyIndex<0?null:process.argv[legacyIndex+1];
if(legacyIndex>=0&&!legacyRef)throw Error('历史版本：请提供有效的本地 Git 提交');
if(legacyRef){
  const commit=execFileSync('git',['rev-parse','--verify','--end-of-options',legacyRef+'^{commit}'],{cwd:project,encoding:'utf8'}).trim();
  const files=execFileSync('git',['ls-tree','-r','--name-only',commit,'--','dist'],{cwd:project,encoding:'utf8'}).trim().split('\n').filter(Boolean);
  if(!files.includes('dist/index.html'))throw Error('历史版本：该提交未包含完整的 dist 网页源码');
  for(const file of files){const destination=resolve(roots.A,file.slice(5));if(!destination.startsWith(roots.A+sep))throw Error('历史版本：文件路径超出测试目录');await mkdir(dirname(destination),{recursive:true});await writeFile(destination,execFileSync('git',['show',`${commit}:${file}`],{cwd:project}));}
}else await cp(resolve(project,'dist'),roots.A,{recursive:true});
await cp(resolve(project,'dist'),roots.B,{recursive:true});
const manifest=JSON.parse(await readFile(resolve(roots.B,'module-map.json'),'utf8'));
const stylesheet=Object.values(manifest).flatMap(entry=>entry.css||[])[0];
if(!stylesheet)throw Error('更新测试资源：构建清单中缺少样式');
const style=resolve(roots.B,stylesheet);
await writeFile(style,(await readFile(style,'utf8'))+'\n/* Offline update fixture: release B. */\n');
const releases={};
for(const release of ['A','B']){
  const metadata=await createPrecache(roots[release]);
  await writeFile(resolve(roots[release],'precache.js'),renderPrecache(metadata));
  releases[release]={version:metadata.version,assetCount:metadata.assets.length};
}
if(releases.A.version===releases.B.version)throw Error('更新测试版本：A 与 B 必须不同');
let current='A';
const types={'.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json; charset=utf-8'};
const json=(res,status,value)=>{
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(value));
};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/__qa__/releases'&&req.method==='GET'){
      json(res,200,{kind:'playground-pwa-update-qa',current,...releases});return;
    }
    if(pathname==='/__qa__/release'&&req.method==='POST'){
      let body='';
      for await(const chunk of req){body+=chunk;if(body.length>128){json(res,400,{error:{field:'release',message:'测试版本：最多填写 128 字节'}});return;}}
      let release=body.trim();
      if(release.startsWith('{'))try{release=JSON.parse(release).release;}catch{}
      if(!['A','B'].includes(release)){json(res,400,{error:{field:'release',message:'测试版本：请选择 A 或 B'}});return;}
      current=release;json(res,200,{current,...releases[current]});return;
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method not allowed');return;}
    // Match production hosting's canonical home redirect during installation.
    if(pathname==='/index.html'){res.writeHead(302,{'Location':'/','Cache-Control':'no-cache'});res.end();return;}
    const root=roots[current],path=resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
    if(!path.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
    const content=await readFile(path);
    res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:content);
  }catch{res.writeHead(404);res.end('Not found');}
});
const port=Number(process.env.PWA_UPDATE_PORT??4186);
server.listen(port,'127.0.0.1',()=>{
  console.log(JSON.stringify({origin:`http://127.0.0.1:${server.address().port}`,fixture,...releases}));
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
