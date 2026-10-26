import {rng,roundRect,label} from '@playground/game-sdk';

const LIMIT=180, RADIUS=48;
const TEMPLATES=[
  {nodes:[[150,130],[300,70],[450,130],[410,340],[190,340]],solution:[0,1,2,3,4,0]},
  {nodes:[[150,90],[300,90],[450,90],[450,330],[300,380],[150,330]],solution:[0,1,2,3,4,5,0,3]},
  {nodes:[[140,100],[300,70],[460,100],[460,330],[300,390],[140,330],[300,230]],solution:[0,1,6,2,3,4,6,5,0]},
];
const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
export function generateConstellations(seed){
  const random=rng(`${seed}:one-line-starlight`);
  return TEMPLATES.map(source=>{
    const mirrorX=random()<.5,mirrorY=random()<.5;
    const order=source.nodes.map((_,i)=>i);
    for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    const remap=Object.fromEntries(order.map((old,index)=>[old,index]));
    const nodes=order.map(old=>({x:mirrorX?600-source.nodes[old][0]:source.nodes[old][0],y:mirrorY?480-source.nodes[old][1]:source.nodes[old][1]}));
    const solution=source.solution.map(old=>remap[old]);
    const edges=solution.slice(1).map((to,i)=>[solution[i],to]);
    return{nodes,edges,solution};
  });
}
export function constellationNodeAt(nodes,x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return -1;
  let result=-1,distance=RADIUS;
  nodes.forEach((node,index)=>{const d=Math.hypot(x-node.x,y-node.y);if(d<=distance){distance=d;result=index;}});
  return result;
}
export function validConstellationStep(puzzle,path,next){
  if(!Number.isInteger(next)||next<0||next>=puzzle.nodes.length)return false;
  if(!path.length)return true;
  const last=path[path.length-1],key=edgeKey(last,next);
  if(!puzzle.edges.some(([a,b])=>edgeKey(a,b)===key))return false;
  return !path.slice(1).some((to,i)=>edgeKey(path[i],to)===key);
}
export function createGame({seed,onFinish=()=>{},sound=()=>{}}){
  const puzzles=generateConstellations(seed);
  let level=0,path=[],selected=0,steps=0,elapsed=0,banked=0,finished=false,won=false,transition=0,gesture=null;
  let message='选一颗星星，一笔走过每条虚线';
  const puzzle=()=>puzzles[level];
  const score=()=>banked+(path.length?path.length-1:0)*20;
  function finish(reason){if(finished)return;finished=true;gesture=null;onFinish({score:score(),elapsed,steps,won,reason});}
  function commit(trail){
    if(finished||transition>0||!trail.length)return;
    const added=Math.max(0,trail.length-Math.max(1,path.length));
    path=[...trail];selected=path[path.length-1];steps+=added;
    sound(added?'collect':'tap');message=added?'沿着亮起的端点，继续连下一颗星':'起点选好了，沿虚线去下一颗星';
    if(path.length-1===puzzle().edges.length){
      banked+=puzzle().edges.length*20+100;path=[];sound('win');
      if(level===2){won=true;finish('complete');}
      else{transition=.5;message='这一片星空点亮了，下一张星图马上来';}
    }
  }
  function extend(trail,node){
    if(node<0||trail[trail.length-1]===node)return;
    if(validConstellationStep(puzzle(),trail,node))trail.push(node);
    else message='沿已有虚线继续；走错了可以撤销';
  }
  return{
    update(dt){
      if(finished||!Number.isFinite(dt)||dt<=0)return;
      elapsed=Math.min(LIMIT,elapsed+dt);
      if(transition>0){transition=Math.max(0,transition-dt);if(transition===0){level++;selected=0;message='新的星图，从任意合适的起点试一试';}}
      if(elapsed>=LIMIT)finish('time');
    },
    input(type,payload={}){
      if(type==='primary-cancel'){gesture=null;return;}
      if(finished||transition>0)return;
      if(type==='undo'){
        gesture=null;
        if(path.length){path.pop();selected=path.length?path[path.length-1]:selected;message='退回一段星光，已计步数保留';sound('tap');}
        return;
      }
      if(type==='primary-down'){
        const node=constellationNodeAt(puzzle().nodes,payload.x,payload.y);
        if(node<0){gesture=null;return;}
        const trail=[...path];extend(trail,node);gesture={trail,start:node,moved:false};selected=node;
      }
      if(type==='primary-move'&&gesture){
        const node=constellationNodeAt(puzzle().nodes,payload.x,payload.y);
        if(node>=0&&node!==gesture.start)gesture.moved=true;
        extend(gesture.trail,node);
      }
      if(type==='primary-up'&&gesture){
        const pending=gesture;gesture=null;
        const node=constellationNodeAt(puzzle().nodes,payload.x,payload.y);
        if(node>=0)extend(pending.trail,node);
        if(node===pending.start||pending.moved||pending.trail.length>path.length+1)commit(pending.trail);
      }
      if(type!=='key-down'||payload.repeat)return;
      const key=String(payload.key).toLowerCase(),n=puzzle().nodes.length;
      if(['arrowleft','arrowup','a','w'].includes(key))selected=(selected+n-1)%n;
      else if(['arrowright','arrowdown','d','s'].includes(key))selected=(selected+1)%n;
      else if(key===' '||key==='enter'){const trail=[...path];extend(trail,selected);commit(trail);}
    },
    getState(){return{score:score(),elapsed,steps,level:level+1,path:[...path],usedEdges:path.slice(1).map((to,i)=>[path[i],to]),selected,finished,won,transition,canUndo:path.length>0,extra:`${Math.min(3,level+(transition>0||won?1:0))} / 3`,hint:message,nodes:puzzle().nodes.map(n=>({...n})),edges:puzzle().edges.map(e=>[...e]),dragging:!!gesture};},
    draw(ctx){
      ctx.fillStyle='#293e50';ctx.fillRect(0,0,600,480);
      for(let i=0;i<33;i++){const x=(i*137+43)%600,y=(i*89+57)%480;ctx.fillStyle=i%3?'#7c92a0':'#c9c8aa';ctx.beginPath();ctx.arc(x,y,i%3?1:2,0,Math.PI*2);ctx.fill();}
      label(ctx,`星图 ${level+1} / 3 · 一笔点亮整片星空`,300,25,15,'#d1decd','center',600);
      const {nodes,edges}=puzzle(),trail=gesture?.trail||path,used=new Set(trail.slice(1).map((to,i)=>edgeKey(trail[i],to)));
      for(const[a,b]of edges){
        const lit=used.has(edgeKey(a,b));ctx.save();ctx.strokeStyle=lit?'#f2d58b':'#718797';ctx.lineWidth=lit?6:3;ctx.lineCap='round';if(!lit)ctx.setLineDash([7,9]);
        ctx.beginPath();ctx.moveTo(nodes[a].x,nodes[a].y);ctx.lineTo(nodes[b].x,nodes[b].y);ctx.stroke();ctx.restore();
      }
      nodes.forEach((node,index)=>{
        const endpoint=trail[trail.length-1]===index,visited=trail.includes(index);
        ctx.fillStyle=endpoint?'#f4d88a':visited?'#c8d5b3':'#b0c2cd';ctx.beginPath();ctx.arc(node.x,node.y,25,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=endpoint?'#fff6cc':'#e7eee2';ctx.beginPath();for(let p=0;p<10;p++){const a=-Math.PI/2+p*Math.PI/5,r=p%2?9:18;const x=node.x+Math.cos(a)*r,y=node.y+Math.sin(a)*r;if(p===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();
        label(ctx,index+1,node.x,node.y+1,13,'#405b64','center',800);
        if(selected===index){ctx.save();ctx.strokeStyle='#b8ccbb';ctx.lineWidth=2;ctx.setLineDash([4,6]);ctx.beginPath();ctx.arc(node.x,node.y,43,0,Math.PI*2);ctx.stroke();ctx.restore();}
        if(endpoint)label(ctx,'接着画',node.x,node.y+38,11,'#efd998','center',600);
      });
      if(transition>0){roundRect(ctx,162,198,276,72,20,'#eef0d7');label(ctx,'一片星光，收好啦！',300,234,20,'#496257','center',700);}
      label(ctx,`已连 ${trail.length?trail.length-1:0} / ${edges.length} 条线 · 可点击或按住连线`,300,456,12,'#b4c9c3','center',500);
    },
    destroy(){finished=true;gesture=null;},
  };
}
