import {createCampaignGame} from './campaign-engine.js';
import {rng,roundRect,label} from '@playground/game-sdk';

const LIMIT=180,SIZE=4,CELL=96,X=108,Y=48,HOLD=.45;
export function mineNeighbors(cell){
  if(!Number.isInteger(cell)||cell<0||cell>=16)return [];
  const result=[],x=cell%SIZE,y=Math.floor(cell/SIZE);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy;if((dx||dy)&&nx>=0&&nx<SIZE&&ny>=0&&ny<SIZE)result.push(ny*SIZE+nx);
  }
  return result;
}
export function generateMines(seed){
  const random=rng(`${seed}:flower-meadow-mines`),candidates=Array.from({length:16},(_,i)=>i).filter(i=>![0,1,4,5].includes(i));
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  const mines=candidates.slice(0,3).sort((a,b)=>a-b);
  const counts=Array.from({length:16},(_,i)=>mines.includes(i)?-1:mineNeighbors(i).filter(n=>mines.includes(n)).length);
  return{mines,counts};
}
export function revealMeadow(counts,revealed,flags,start){
  const next=[...revealed];
  if(!Number.isInteger(start)||start<0||start>=16||flags[start]||counts[start]<0)return next;
  const queue=[start];
  for(let head=0;head<queue.length;head++){
    const cell=queue[head];if(next[cell]||flags[cell]||counts[cell]<0)continue;
    next[cell]=true;if(counts[cell]===0)for(const neighbor of mineNeighbors(cell))if(!next[neighbor])queue.push(neighbor);
  }
  return next;
}
function cellAt(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return -1;
  const col=Math.floor((x-X)/CELL),row=Math.floor((y-Y)/CELL);return col>=0&&col<4&&row>=0&&row<4?row*4+col:-1;
}
export function createGame({level,seed,onFinish=()=>{},sound=()=>{}}) {
  if(level)return createCampaignGame({level,onFinish,sound});
  const{mines,counts}=generateMines(seed);
  let revealed=Array(16).fill(false),flags=Array(16).fill(false),elapsed=0,selected=0,pressed=null,finished=false,won=false,exploded=-1;
  let message='先点左上角安全花苞，再看数字找小地雷';
  const opened=()=>revealed.filter((value,index)=>value&&counts[index]>=0).length;
  const score=()=>won?300+Math.max(0,180-Math.ceil(elapsed)):opened()*20;
  function finish(reason){if(finished)return;finished=true;pressed=null;onFinish({score:score(),elapsed,won,opened:opened(),reason});}
  function flag(cell){
    if(cell<0||revealed[cell])return;
    if(!flags[cell]&&flags.filter(Boolean).length===3){message='只有三枚小旗；先取消一处标记再放新旗';return;}
    flags[cell]=!flags[cell];selected=cell;sound('tap');message=flags[cell]?'小旗放好了；再次长按或回车可取消':'小旗收好了，短按可以翻开花苞';
  }
  function reveal(cell){
    if(cell<0||flags[cell]||revealed[cell])return;selected=cell;
    if(mines.includes(cell)){exploded=cell;revealed[cell]=true;message='遇到小地雷了，下一局再来种花';sound('hit');finish('mine');return;}
    revealed=revealMeadow(counts,revealed,flags,cell);sound('collect');message='数字是周围八格的雷数；长按可标记';
    if(opened()===13){won=true;sound('win');finish('complete');}
  }
  return{
    update(dt){if(finished||!Number.isFinite(dt)||dt<=0)return;elapsed=Math.min(LIMIT,elapsed+dt);if(elapsed>=LIMIT)finish('time');},
    input(type,payload={}){
      if(type==='primary-cancel'){pressed=null;return;}
      if(finished)return;
      if(type==='primary-down'){const cell=cellAt(payload.x,payload.y);pressed=cell<0?null:{cell,time:elapsed};if(cell>=0)selected=cell;}
      if(type==='primary-move'&&pressed&&cellAt(payload.x,payload.y)!==pressed.cell)pressed=null;
      if(type==='primary-up'){
        const pending=pressed;pressed=null;const cell=cellAt(payload.x,payload.y);
        if(!pending||cell!==pending.cell)return;
        if(elapsed-pending.time>=HOLD-1e-9)flag(cell);else reveal(cell);
      }
      if(type!=='key-down'||payload.repeat)return;
      const key=String(payload.key).toLowerCase();let row=Math.floor(selected/4),col=selected%4;
      if(key==='arrowup'||key==='w')row=(row+3)%4;
      else if(key==='arrowdown'||key==='s')row=(row+1)%4;
      else if(key==='arrowleft'||key==='a')col=(col+3)%4;
      else if(key==='arrowright'||key==='d')col=(col+1)%4;
      else if(key===' ')reveal(selected);
      else if(key==='enter')flag(selected);
      else return;
      selected=row*4+col;
    },
    getState(){return{score:score(),elapsed,selected,mines:[...mines],counts:[...counts],revealed:[...revealed],flags:[...flags],opened:opened(),flagCount:flags.filter(Boolean).length,pressed:pressed?.cell??-1,finished,won,exploded,extra:`已开 ${opened()} / 13`,hint:message};},
    draw(ctx){
      ctx.fillStyle='#edf1df';ctx.fillRect(0,0,600,480);
      label(ctx,`花田里有三颗小地雷 · 已标 ${flags.filter(Boolean).length} / 3`,300,25,15,'#7b9271','center',600);
      roundRect(ctx,X-11,Y-10,406,404,26,'#bfcea9');
      for(let i=0;i<16;i++){
        const x=X+i%4*CELL,y=Y+Math.floor(i/4)*CELL,cx=x+48,cy=y+48,open=revealed[i];
        roundRect(ctx,x+3,y+7,90,88,16,open?'#c3d1b0':'#8faa80');
        roundRect(ctx,x+3,y+3,90,86,16,open?'#e6ecd7':'#cfe0b7');
        if(open&&counts[i]>0)label(ctx,counts[i],cx,cy,31,['','#589590','#b38c50','#b77465'][counts[i]]||'#806f98','center',800);
        if((open&&counts[i]===0)||(!open&&!flags[i]&&!(finished&&mines.includes(i)))){
          ctx.strokeStyle=open?'#bbcea3':'#8cad7c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy+10);ctx.lineTo(cx,cy+26);ctx.stroke();
          ctx.fillStyle=open?'#d9e5b8':'#88ac7a';ctx.beginPath();ctx.ellipse(cx-8,cy+15,9,4,.4,0,Math.PI*2);ctx.fill();
          const petal=open?'#e6c98a':'#aec890';ctx.fillStyle=petal;for(let p=0;p<5;p++){const a=p*Math.PI*2/5;ctx.beginPath();ctx.arc(cx+Math.cos(a)*10,cy-5+Math.sin(a)*10,7,0,Math.PI*2);ctx.fill();}
          ctx.fillStyle=open?'#fbefb9':'#dce5b1';ctx.beginPath();ctx.arc(cx,cy-5,7,0,Math.PI*2);ctx.fill();
          if(i===0&&!open)label(ctx,'安全起点',cx,cy+37,10,'#749367','center',650);
        }
        if(flags[i]){
          ctx.strokeStyle='#7f8d6c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx-10,cy+21);ctx.lineTo(cx-10,cy-25);ctx.stroke();
          ctx.fillStyle='#e7a28a';ctx.beginPath();ctx.moveTo(cx-8,cy-25);ctx.lineTo(cx+22,cy-15);ctx.lineTo(cx-8,cy-4);ctx.closePath();ctx.fill();
        }
        if((open&&counts[i]<0)||(finished&&mines.includes(i))){
          ctx.fillStyle=i===exploded?'#c87765':'#a4a58c';ctx.beginPath();ctx.arc(cx,cy,17,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='#fff2d8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx-6,cy-6);ctx.lineTo(cx+6,cy+6);ctx.moveTo(cx+6,cy-6);ctx.lineTo(cx-6,cy+6);ctx.stroke();
        }
        if(selected===i){ctx.save();ctx.strokeStyle='#719570';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.roundRect(x+1,y+1,94,92,18);ctx.stroke();ctx.restore();}
        if(pressed?.cell===i&&elapsed-pressed.time>=HOLD){roundRect(ctx,cx-31,cy+26,62,20,7,'#fff2d4');label(ctx,'松手标记',cx,cy+36,10,'#9f7e55','center',650);}
      }
      label(ctx,'短按翻开 · 长按标旗 / 空格翻开，回车标旗',300,462,12,'#7b9470','center',500);
    },
    destroy(){finished=true;pressed=null;},
  };
}
