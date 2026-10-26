import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash,webcrypto} from 'node:crypto';
import {createPrecache,renderPrecache} from '../scripts/prepare-pwa.mjs';
import {modulePaths} from '../scripts/module-map.mjs';

const source=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const fixture={
  './index.html':{body:'<!doctype html><title>Offline playground</title>',type:'text/html'},
  './app.js':{body:'export const gameCount=20;',type:'text/javascript'},
  './games/example.js':{body:'export function createGame(){}',type:'application/javascript'},
  './style.css':{body:'body{background:cream}',type:'text/css'},
  './manifest.webmanifest':{body:'{"name":"Playground"}',type:'application/manifest+json'},
  './icons/app-192.png':{body:'example-png-binary',type:'image/png'},
};
function withRedirect(response,url){
  const clone=response.clone.bind(response);
  Object.defineProperties(response,{redirected:{value:true},url:{value:url},clone:{value:()=>withRedirect(clone(),url)}});
  return response;
}
class MemoryCache{
  constructor(name,owner){this.name=name;this.owner=owner;this.entries=new Map();}
  async match(request){return this.entries.get(typeof request==='string'?request:request.url)?.clone();}
  async put(request,response){
    const key=typeof request==='string'?request:request.url;
    if(this.owner.failPut?.(key))throw Error('Quota exceeded');
    this.entries.set(key,response.clone());
  }
}
class MemoryCaches{
  entries=new Map();deleted=[];failPut=null;
  async has(name){return this.entries.has(name);}
  async open(name){if(!this.entries.has(name))this.entries.set(name,new MemoryCache(name,this));return this.entries.get(name);}
  async keys(){return[...this.entries.keys()];}
  async delete(name){this.deleted.push(name);return this.entries.delete(name);}
}
function setup({scope='https://games.test/play/',version='test-release',cacheStorage=new MemoryCaches()}={}){
  const handlers={},network=new Map(),calls={fetch:0,claim:0,skipWaiting:0};
  const metadata={version,assets:Object.keys(fixture),revisions:Object.fromEntries(Object.entries(fixture).map(([path,file])=>[path,hash(file.body)]))};
  for(const[path,file]of Object.entries(fixture))network.set(new URL(path,scope).href,{...file});
  let offline=false;
  const self={registration:{scope},clients:{claim:async()=>{calls.claim++;}},skipWaiting:async()=>{calls.skipWaiting++;},addEventListener:(type,handler)=>{handlers[type]=handler;}};
  const context=vm.createContext({self,caches:cacheStorage,URL,Request,Response,Headers,TextEncoder,crypto:webcrypto,
    importScripts:path=>{assert.equal(path,'./precache.js');self.PLAYGROUND_PRECACHE=structuredClone(metadata);},
    fetch:async request=>{
      calls.fetch++;if(offline)throw Error('Network is offline');
      const url=typeof request==='string'?request:request.url,file=network.get(url);
      if(!file)return new Response('Not found',{status:404,headers:{'Content-Type':'text/html'}});
      const response=new Response(file.body,{status:file.status||200,headers:{'Content-Type':file.type,...file.headers}});
      return file.redirectedUrl?withRedirect(response,file.redirectedUrl):response;
    },
  });
  vm.runInContext(source,context,{filename:'sw.js'});
  async function dispatch(type,properties={}){
    const pending=[];handlers[type]({...properties,waitUntil:promise=>pending.push(promise)});await Promise.all(pending);
  }
  async function fetchResource(path,method='GET'){
    let response;
    const request=new Request(new URL(path,scope),{method,...(method==='POST'?{body:'do-not-cache'}:{})});
    handlers.fetch({request,respondWith:value=>{response=value;}});
    return response?await response:undefined;
  }
  async function message(type){let reply;await dispatch('message',{data:{type},ports:[{postMessage:value=>{reply=JSON.parse(JSON.stringify(value));}}]});return reply;}
  const prefix='three-minute-playground-offline:'+new URL(scope).pathname+':',cacheName=prefix+version;
  return{self,metadata,network,calls,caches:cacheStorage,dispatch,fetchResource,message,scope,prefix,cacheName,setOffline:value=>{offline=value;}};
}

test('precache generation covers all twenty lazy game modules and excludes deployment metadata',async()=>{
  const root=resolve('dist'),metadata=await createPrecache(root),ids=(await import('@playground/game-registry')).games.map(game=>game.id);
  const paths=modulePaths(JSON.parse(await readFile(resolve(root,'module-map.json'),'utf8')));
  for(const id of ids)assert.ok(metadata.assets.includes('./'+paths[`games/${id}.js`]));
  for(const file of ['./index.html','./module-map.json','./favicon.svg'])assert.ok(metadata.assets.includes(file));
  assert.ok(metadata.assets.some(file=>file.endsWith('.css')));
  for(const file of ['./sw.js','./precache.js','./CNAME'])assert.equal(metadata.assets.includes(file),false);
  assert.equal(Object.keys(metadata.revisions).length,metadata.assets.length);
  assert.match(metadata.version,/^[0-9a-f]{20}$/);assert.ok(renderPrecache(metadata).startsWith('// Generated'));
});
test('precache version is stable and changes for an asset or worker while ignoring CNAME',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'playground-precache-'));
  try{
    await mkdir(join(temporary,'games'));await writeFile(join(temporary,'index.html'),'<title>fixture</title>');
    await writeFile(join(temporary,'sw.js'),'// worker-v1');await writeFile(join(temporary,'games','sample.js'),'export const score=1;');
    const first=await createPrecache(temporary);assert.deepEqual(await createPrecache(temporary),first);
    await writeFile(join(temporary,'CNAME'),'custom.example');assert.deepEqual(await createPrecache(temporary),first);
    await writeFile(join(temporary,'games','sample.js'),'export const score=2;');const asset=await createPrecache(temporary);assert.notEqual(asset.version,first.version);
    await writeFile(join(temporary,'sw.js'),'// worker-v2');assert.notEqual((await createPrecache(temporary)).version,asset.version);
  }finally{
    assert.ok(resolve(temporary).startsWith(resolve(tmpdir())+sep));await rm(temporary,{recursive:true,force:true});
  }
});
test('Windows and Linux line endings produce the same text revisions and complete release version',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'playground-precache-'));
  try{
    const files={'index.html':'<title>fixture</title>\n','sw.js':'// worker\n// stable\n','app.js':'export const score=1;\n','icon.png':Buffer.from([137,80,78,71,13,10,26,10])};
    for(const[name,content]of Object.entries(files))await writeFile(join(temporary,name),content);
    const linux=await createPrecache(temporary);
    for(const[name,content]of Object.entries(files))if(typeof content==='string')await writeFile(join(temporary,name),content.replace(/\n/g,'\r\n'));
    assert.deepEqual(await createPrecache(temporary),linux);
    await writeFile(join(temporary,'icon.png'),Buffer.from([137,80,78,71,10,26,10]));
    assert.notEqual((await createPrecache(temporary)).revisions['./icon.png'],linux.revisions['./icon.png']);
  }finally{assert.ok(resolve(temporary).startsWith(resolve(tmpdir())+sep));await rm(temporary,{recursive:true,force:true});}
});
test('install prepares every file before reporting ready and never forces a waiting update',async()=>{
  const worker=setup();assert.equal((await worker.message('OFFLINE_STATUS')).ready,false);
  await worker.dispatch('install');const status=await worker.message('OFFLINE_STATUS');
  assert.deepEqual(status,{ready:true,version:'test-release',assetCount:Object.keys(fixture).length});
  assert.equal(worker.calls.skipWaiting,0);assert.equal(worker.calls.claim,0);
  assert.equal(await worker.message('SKIP_WAITING'),undefined);assert.equal(worker.calls.skipWaiting,0);
});
test('a missing or wrong-type asset abandons only the new cache and preserves the previous release',async()=>{
  for(const mode of ['missing','html-in-js']){
    const worker=setup(),old=await worker.caches.open(worker.prefix+'previous');await old.put(new URL('./app.js',worker.scope).href,new Response('old release'));
    if(mode==='missing')worker.network.delete(new URL('./games/example.js',worker.scope).href);
    else worker.network.set(new URL('./app.js',worker.scope).href,{body:'<html>host error</html>',type:'text/html'});
    await assert.rejects(worker.dispatch('install'));
    assert.equal(await worker.caches.has(worker.cacheName),false);assert.equal((await worker.message('OFFLINE_STATUS')).ready,false);
    assert.equal(await(await old.match(new URL('./app.js',worker.scope).href)).text(),'old release');
    assert.equal(await worker.caches.has(worker.prefix+'previous'),true);
  }
});
test('quota failure cannot leave a ready partial release',async()=>{
  const worker=setup();worker.caches.failPut=url=>url.endsWith('/app.js');await assert.rejects(worker.dispatch('install'),/Quota/);
  assert.equal(await worker.caches.has(worker.cacheName),false);assert.equal((await worker.message('OFFLINE_STATUS')).ready,false);
});
test('offline root, index, share query and cached module requests use the canonical release',async()=>{
  const worker=setup();await worker.dispatch('install');worker.setOffline(true);const requests=worker.calls.fetch;
  for(const path of ['./','./?source=installed#/play/snake','./index.html?date=2026-10-26'])assert.match(await(await worker.fetchResource(path)).text(),/Offline playground/);
  assert.match(await(await worker.fetchResource('./games/example.js?source=share')).text(),/createGame/);
  assert.match(await(await worker.fetchResource('./manifest.webmanifest')).text(),/Playground/);
  assert.equal(worker.calls.fetch,requests,'cached navigation must not need an online request');
});
test('unknown, cross-origin, outside-scope, worker-script and non-GET requests are not intercepted',async()=>{
  const worker=setup();await worker.dispatch('install');
  for(const path of ['./api/private','https://other.test/play/app.js','../else/app.js','./sw.js','./precache.js'])assert.equal(await worker.fetchResource(path),undefined);
  assert.equal(await worker.fetchResource('./app.js','POST'),undefined);
});
test('activation claims once and cleans only obsolete caches for this scope',async()=>{
  const worker=setup();await worker.dispatch('install');
  await worker.caches.open(worker.prefix+'old');await worker.caches.open('three-minute-playground-offline:/sibling/:old');await worker.caches.open('another-application');
  await worker.dispatch('activate');assert.equal(worker.calls.claim,1);assert.equal(worker.calls.skipWaiting,0);
  assert.equal(await worker.caches.has(worker.prefix+'old'),false);assert.equal(await worker.caches.has(worker.cacheName),true);
  assert.equal(await worker.caches.has('three-minute-playground-offline:/sibling/:old'),true);assert.equal(await worker.caches.has('another-application'),true);
});
test('status detects a lost asset even with the commit marker and retry restores the complete release',async()=>{
  const worker=setup();await worker.dispatch('install');const cache=await worker.caches.open(worker.cacheName);
  cache.entries.delete(new URL('./games/example.js',worker.scope).href);assert.equal((await worker.message('OFFLINE_STATUS')).ready,false);
  assert.equal((await worker.message('RETRY_OFFLINE')).ready,true);worker.setOffline(true);
  assert.match(await(await worker.fetchResource('./games/example.js')).text(),/createGame/);
});
test('repair refuses changed executable content instead of mixing a newer server release into old games',async()=>{
  const worker=setup();await worker.dispatch('install');const cache=await worker.caches.open(worker.cacheName);
  cache.entries.delete(new URL('./games/example.js',worker.scope).href);
  worker.network.set(new URL('./app.js',worker.scope).href,{body:'export const gameCount=24;',type:'text/javascript'});
  const status=await worker.message('RETRY_OFFLINE');assert.equal(status.ready,false);assert.match(status.error,/资源版本已变化/);
  assert.equal(await worker.caches.has(worker.cacheName),false);
});
test('offline repair failure is reported and cannot claim offline readiness',async()=>{
  const worker=setup();worker.setOffline(true);const status=await worker.message('RETRY_OFFLINE');
  assert.equal(status.ready,false);assert.match(status.error,/offline/);assert.equal(await worker.caches.has(worker.cacheName),false);
});
test('host-wrapped HTML is allowed while an incomplete marker is never used to serve offline assets',async()=>{
  const worker=setup();worker.network.set(new URL('./index.html',worker.scope).href,{body:fixture['./index.html'].body+'<script>hostWrapper()</script>',type:'text/html'});
  await worker.dispatch('install');assert.equal((await worker.message('OFFLINE_STATUS')).ready,true);
  const cache=await worker.caches.open(worker.cacheName);await cache.put(new URL('__offline_complete__',worker.scope).href,new Response('{"version":"other"}'));
  assert.equal((await worker.message('OFFLINE_STATUS')).ready,false);worker.setOffline(true);await assert.rejects(worker.fetchResource('./app.js'),/offline/);
});
test('worker integrity checks normalize text line endings but preserve binary icon bytes',async()=>{
  const worker=setup();worker.metadata.revisions['./app.js']=hash('export const gameCount=20;\n');
  // The worker received a cloned metadata object during importScripts.
  worker.self.PLAYGROUND_PRECACHE.revisions['./app.js']=worker.metadata.revisions['./app.js'];
  worker.network.set(new URL('./app.js',worker.scope).href,{body:'export const gameCount=20;\r\n',type:'text/javascript'});
  await worker.dispatch('install');assert.equal((await worker.message('OFFLINE_STATUS')).ready,true);
  const binary=setup();binary.self.PLAYGROUND_PRECACHE.revisions['./icons/app-192.png']=hash('binary\n');
  binary.network.set(new URL('./icons/app-192.png',binary.scope).href,{body:'binary\r\n',type:'image/png'});
  await assert.rejects(binary.dispatch('install'),/资源版本已变化/);
});
test('same-origin canonical index redirects install and become safe non-redirected offline navigations',async()=>{
  for(const target of ['./','./index.html']){
    const worker=setup();
    worker.network.set(new URL('./index.html',worker.scope).href,{
      ...fixture['./index.html'],redirectedUrl:new URL(target,worker.scope).href,
      headers:{'Content-Encoding':'gzip','Content-Length':'999','Transfer-Encoding':'chunked'},
    });
    await worker.dispatch('install');assert.equal((await worker.message('OFFLINE_STATUS')).ready,true);worker.setOffline(true);
    for(const request of ['./','./?launch=installed#/play/star','./index.html']){
      const response=await worker.fetchResource(request);
      assert.equal(response.redirected,false);assert.match(await response.text(),/Offline playground/);
      for(const name of ['Content-Encoding','Content-Length','Transfer-Encoding'])assert.equal(response.headers.get(name),null);
    }
  }
});
test('HTML redirects to login, another scope, a query or another origin cannot install offline games',async()=>{
  for(const target of ['./login','../','./?login=1','./#login','https://other.test/play/']){
    const worker=setup();worker.network.set(new URL('./index.html',worker.scope).href,{...fixture['./index.html'],redirectedUrl:new URL(target,worker.scope).href});
    await assert.rejects(worker.dispatch('install'),/资源未能完整下载/);assert.equal((await worker.message('OFFLINE_STATUS')).ready,false);
  }
});
test('executable asset redirects remain forbidden even when the final URL is same-origin',async()=>{
  for(const target of ['./app.js','./','https://other.test/app.js']){
    const worker=setup();worker.network.set(new URL('./app.js',worker.scope).href,{...fixture['./app.js'],redirectedUrl:new URL(target,worker.scope).href});
    await assert.rejects(worker.dispatch('install'),/资源未能完整下载/);assert.equal(await worker.caches.has(worker.cacheName),false);
  }
});
