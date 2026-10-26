import {readFile,readdir} from 'node:fs/promises';
import {resolve,relative,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';
const project=fileURLToPath(new URL('../',import.meta.url));
const packages=new Map(),files=[],graph=new Map();
for(const group of ['packages','games','apps'])for(const entry of await readdir(resolve(project,group),{withFileTypes:true}))if(entry.isDirectory()){
  const root=resolve(project,group,entry.name),pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
  packages.set(pkg.name,{root,pkg,group});
}
async function collect(dir){for(const item of await readdir(dir,{withFileTypes:true})){if(['dist','node_modules','.wrangler'].includes(item.name))continue;const path=resolve(dir,item.name);if(item.isDirectory())await collect(path);else if(/\.(?:m?js)$/.test(path))files.push(path);}}
for(const dir of ['apps','games','packages','worker'])await collect(resolve(project,dir));
const owner=path=>[...packages.values()].find(item=>path.startsWith(item.root+sep));
function literals(node,out=[],allowDynamic=false){
  if(!node||typeof node!=='object')return out;
  if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration','ImportExpression'].includes(node.type)&&node.source){
    if(node.source.type==='Literal')out.push(node.source.value);
    else if(!allowDynamic)throw Error('模块加载：源代码须使用明确的静态导入入口');
  }
  for(const value of Object.values(node)){
    if(Array.isArray(value)){for(const item of value)literals(item,out,allowDynamic);}
    else if(value&&typeof value==='object')literals(value,out,allowDynamic);
  }
  return out;
}
export function allowedDependency(source,target){
  if(!source||source===target)return true;
  if(source.group==='games')return target.pkg.name==='@playground/game-sdk';
  if(source.pkg.name==='@playground/game-sdk')return false;
  if(source.pkg.name==='@playground/game-runtime')return target.pkg.name==='@playground/game-sdk';
  return source.pkg.dependencies?.[target.pkg.name]!==undefined;
}
for(const file of files){
  const sourceOwner=owner(file),test=file.includes(`${sep}tests${sep}`),preview=file.includes(`${sep}preview${sep}`);
  const specifiers=literals(parse(await readFile(file,'utf8'),{ecmaVersion:'latest',sourceType:'module'}),[],test);
  const edges=[];
  for(const specifier of specifiers){
    if(preview&&specifier.startsWith('@game'))continue;
    let target;
    if(specifier.startsWith('.'))target=resolve(dirname(file),specifier);
    else if(specifier.startsWith('@playground/')){const parts=specifier.split('/'),name=parts.slice(0,2).join('/'),pkg=packages.get(name);if(!pkg)throw Error(`包依赖：${relative(project,file)} 引用了未知包 ${name}`);const subpath=parts.length===2?'.':'./'+parts.slice(2).join('/');const entry=pkg.pkg.exports[subpath];if(!entry)throw Error(`包入口：${name} 未导出 ${subpath}`);target=resolve(pkg.root,entry);}
    else {
      if(!test&&sourceOwner&&['games','packages'].includes(sourceOwner.group))throw Error(`包依赖：${relative(project,file)} 未声明外部依赖 ${specifier}`);
      continue;
    }
    if(target.split(sep).includes('dist'))throw Error(`源码依赖：${relative(project,file)} 不得引用构建产物`);
    const targetOwner=owner(target);
    if(!test&&sourceOwner&&!targetOwner)throw Error(`包边界：${relative(project,file)} 引用了工作区外部源码`);
    if(!test&&sourceOwner&&targetOwner&&!allowedDependency(sourceOwner,targetOwner))throw Error(`包边界：${relative(project,file)} 不得引用 ${targetOwner.pkg.name}`);
    if(!test&&specifier.startsWith('.')&&sourceOwner&&targetOwner&&sourceOwner!==targetOwner)throw Error(`包入口：${relative(project,file)} 必须通过包的公开入口引用依赖`);
    await readFile(target);if(/\.m?js$/.test(target))edges.push(target);
  }
  graph.set(file,edges);
}
const visiting=new Set(),done=new Set();
function visit(file,trail=[]){if(visiting.has(file))throw Error(`循环依赖：${[...trail,file].map(path=>relative(project,path)).join(' → ')}`);if(done.has(file))return;visiting.add(file);for(const edge of graph.get(file)||[])visit(edge,[...trail,file]);visiting.delete(file);done.add(file);}
for(const file of files)visit(file);
console.log(`Package boundaries passed (${packages.size} workspaces, ${files.length} modules).`);
