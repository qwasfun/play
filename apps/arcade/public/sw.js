/* A release is installed completely before it can serve offline games. */
importScripts('./precache.js');
const BUILD=self.PLAYGROUND_PRECACHE;
const SCOPE=new URL(self.registration.scope);
const PREFIX='three-minute-playground-offline:'+SCOPE.pathname+':';
const CACHE=PREFIX+BUILD.version;
const COMPLETE=new URL('__offline_complete__',SCOPE).href;
const URLS=BUILD.assets.map(path=>new URL(path,SCOPE).href);
const ASSETS=new Map(URLS.map((url,index)=>[new URL(url).pathname,{url,path:BUILD.assets[index]}]));
ASSETS.set(SCOPE.pathname,ASSETS.get(new URL('./index.html',SCOPE).pathname));
let filling=null;

async function offlineStatus(){
  if(!(await caches.has(CACHE)))return{ready:false,version:BUILD.version,assetCount:BUILD.assets.length};
  const cache=await caches.open(CACHE),marker=await cache.match(COMPLETE);
  let complete=false;
  try{complete=!!marker&&(await marker.json()).version===BUILD.version;}catch{}
  const ready=complete&&(await Promise.all(URLS.map(url=>cache.match(url)))).every(response=>response?.ok);
  return{ready,version:BUILD.version,assetCount:BUILD.assets.length};
}
function expectedType(path){
  if(path.endsWith('.js'))return /(?:javascript|ecmascript)/i;
  if(path.endsWith('.css'))return /text\/css/i;
  if(path.endsWith('.svg'))return /image\/svg\+xml/i;
  if(path.endsWith('.png'))return /image\/png/i;
  if(path.endsWith('.webmanifest')||path.endsWith('.json'))return /application\/(?:manifest\+json|json)/i;
  return /text\/html/i;
}
async function download(path,url){
  let response=await fetch(new Request(url,{cache:'reload',credentials:'same-origin'}));
  if(!response.ok||!expectedType(path).test(response.headers.get('Content-Type')||''))throw Error('资源未能完整下载');
  if(response.redirected){
    const destination=new URL(response.url);
    const canonicalIndex=path==='./index.html'&&destination.origin===SCOPE.origin&&!destination.search&&!destination.hash
      &&[SCOPE.pathname,new URL('./index.html',SCOPE).pathname].includes(destination.pathname);
    if(!canonicalIndex)throw Error('资源未能完整下载');
    // Some static hosts canonicalize index.html to the directory URL. A
    // redirected Response cannot satisfy a later navigation with redirectMode
    // "manual", so store the validated HTML as a fresh, non-redirected body.
    const headers=new Headers(response.headers);
    for(const name of ['Content-Encoding','Content-Length','Transfer-Encoding'])headers.delete(name);
    response=new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }
  // HTML can include the host's publication wrapper; executable assets must
  // match this release, including when repairing a cache after a later deploy.
  const expected=BUILD.revisions?.[path];
  if(expected&&!path.endsWith('.html')){
    // GitHub Pages may check out LF while a Windows publication uses CRLF.
    // Text line endings do not define a different release; PNG bytes do.
    const bytes=path.endsWith('.png')?await response.clone().arrayBuffer():new TextEncoder().encode((await response.clone().text()).replace(/\r\n/g,'\n'));
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    const actual=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
    if(actual!==expected)throw Error('资源版本已变化，请关闭所有游乐场窗口后重新打开');
  }
  return response;
}
function prepareOffline(){
  if(filling)return filling;
  filling=(async()=>{
    if((await offlineStatus()).ready)return;
    // The previous release has a different cache name and is never touched by
    // an incomplete install or repair. The marker is the commit point.
    await caches.delete(CACHE);
    const cache=await caches.open(CACHE);
    try{
      const responses=await Promise.all(BUILD.assets.map((path,index)=>download(path,URLS[index])));
      await Promise.all(responses.map((response,index)=>cache.put(URLS[index],response)));
      await cache.put(COMPLETE,new Response(JSON.stringify({version:BUILD.version}),{headers:{'Content-Type':'application/json'}}));
    }catch(error){await caches.delete(CACHE);throw error;}
  })().finally(()=>{filling=null;});
  return filling;
}
self.addEventListener('install',event=>{
  // Deliberately no skipWaiting: an update cannot replace a running game's
  // worker. Close every old playground window to activate the next release.
  event.waitUntil(prepareOffline());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    if(!(await offlineStatus()).ready)throw Error('离线资源尚未完整准备');
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==SCOPE.origin)return;
  const asset=ASSETS.get(url.pathname);
  if(!asset)return;
  const canonical=asset.url;
  event.respondWith((async()=>{
    if(await caches.has(CACHE)){
      const cache=await caches.open(CACHE),marker=await cache.match(COMPLETE);
      let complete=false;try{complete=!!marker&&(await marker.json()).version===BUILD.version;}catch{}
      if(complete){const cached=await cache.match(canonical);if(cached)return cached;}
    }
    return fetch(request);
  })());
});
self.addEventListener('message',event=>{
  const type=event.data?.type,port=event.ports?.[0];
  if(!port||!['OFFLINE_STATUS','RETRY_OFFLINE'].includes(type))return;
  event.waitUntil((async()=>{
    try{
      if(type==='RETRY_OFFLINE')await prepareOffline();
      port.postMessage(await offlineStatus());
    }catch(error){port.postMessage({ready:false,version:BUILD.version,assetCount:BUILD.assets.length,error:error.message});}
  })());
});
