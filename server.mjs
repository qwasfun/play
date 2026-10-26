import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root = resolve('dist');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const path=resolve(root,`.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(root+sep)) {res.writeHead(403);res.end('Forbidden');return;}
    const file=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(file);
  } catch {res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.PORT)||4175,'0.0.0.0',()=>console.log(`Local: http://localhost:${server.address().port}`));
