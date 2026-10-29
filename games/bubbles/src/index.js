import {createCampaignGame} from './campaign-engine.js';
import { rng, roundRect, label } from '@playground/game-sdk';

const WIDTH=5, HEIGHT=4, CELL=96, X=60, Y=48, LIMIT=90;
const COLORS=['#ed9c88','#eac977','#8cb9ae','#9aaed0'];
const MARKS=['✿','✦','●','◆'];

export function generateBubbles(seed) {
  const random=rng(`${seed}:bubble-garden`);
  return Array.from({length:3},()=>{
    const palette=[0,1,2,3];
    for(let i=3;i>0;i--){const j=Math.floor(random()*(i+1));[palette[i],palette[j]]=[palette[j],palette[i]];}
    const board=Array(WIDTH*HEIGHT).fill(null);
    for(let col=0;col<WIDTH;col++){
      const top=palette[col%4], bottom=palette[Math.floor(random()*4)];
      board[col]=board[WIDTH+col]=top;
      board[WIDTH*2+col]=board[WIDTH*3+col]=bottom;
    }
    return board;
  });
}

export {findGroup,collapseBubbles} from './model.js';
import {findGroup,collapseBubbles} from './model.js';
function cellAt(x,y) {
  if(!Number.isFinite(x)||!Number.isFinite(y))return -1;
  const col=Math.floor((x-X)/CELL),row=Math.floor((y-Y)/CELL);
  return col>=0&&col<WIDTH&&row>=0&&row<HEIGHT?row*WIDTH+col:-1;
}

export function createGame({level:campaignLevel,seed,onFinish=()=>{},sound=()=>{}}) {
  if(campaignLevel)return createCampaignGame({level:campaignLevel,onFinish,sound});
  const boards=generateBubbles(seed);
  let board=[...boards[0]],round=1,cleared=0,score=0,elapsed=0,selected=0,pressed=-1,finished=false,won=false,transition=0;
  let flash=[],flashTime=0,message='找到相邻的同色气泡，轻轻点一下';
  function finish(reason){if(finished)return;finished=true;pressed=-1;onFinish({score,elapsed,won,cleared,round,reason});}
  function pop(cell){
    if(finished||transition>0)return;
    const group=findGroup(board,cell);
    selected=cell>=0?cell:selected;
    if(group.length<2){message='至少两个相邻的同色气泡，才能一起消除';return;}
    flash=group.map(index=>({index,color:board[index]}));flashTime=.32;
    for(const index of group)board[index]=null;
    cleared+=group.length;score+=group.length*group.length*10;
    board=collapseBubbles(board);sound('collect');message=`一口气消除了 ${group.length} 个！继续寻找更大的组合`;
    if(board.every(value=>value===null)){
      if(round===3){won=true;sound('win');finish('complete');}
      else{transition=.55;message='这一盘干干净净，下一盘马上来';}
    }
  }
  return{
    update(dt){
      if(finished||!Number.isFinite(dt)||dt<=0)return;
      elapsed=Math.min(LIMIT,elapsed+dt);flashTime=Math.max(0,flashTime-dt);
      if(transition>0){transition=Math.max(0,transition-dt);if(transition===0){round++;board=[...boards[round-1]];selected=0;message='新的一盘，试试把更多气泡连在一起';}}
      if(elapsed>=LIMIT)finish('time');
    },
    input(type,payload={}){
      if(type==='primary-cancel'){pressed=-1;return;}
      if(finished||transition>0)return;
      if(type==='primary-down')pressed=cellAt(payload.x,payload.y);
      if(type==='primary-up'){
        const cell=cellAt(payload.x,payload.y),origin=pressed;pressed=-1;
        if(cell>=0&&cell===origin)pop(cell);
      }
      if(type!=='key-down'||payload.repeat)return;
      let row=Math.floor(selected/WIDTH),col=selected%WIDTH;
      const key=String(payload.key).toLowerCase();
      if(key==='arrowup'||key==='w')row=(row+HEIGHT-1)%HEIGHT;
      else if(key==='arrowdown'||key==='s')row=(row+1)%HEIGHT;
      else if(key==='arrowleft'||key==='a')col=(col+WIDTH-1)%WIDTH;
      else if(key==='arrowright'||key==='d')col=(col+1)%WIDTH;
      else if(key===' '||key==='enter')pop(selected);
      else return;
      selected=row*WIDTH+col;
    },
    getState(){return{board:[...board],score,elapsed,round,cleared,selected,finished,won,transition,extra:`${cleared} / 60`,hint:message};},
    draw(ctx){
      ctx.fillStyle='#f7ecdf';ctx.fillRect(0,0,600,480);
      label(ctx,`第 ${round} / 3 盘 · 把相同的小快乐连在一起`,300,25,15,'#977d69','center',600);
      roundRect(ctx,X-10,Y-9,500,402,25,'#eadac6');
      for(let i=0;i<20;i++){
        const cx=X+i%WIDTH*CELL+CELL/2,cy=Y+Math.floor(i/WIDTH)*CELL+CELL/2;
        roundRect(ctx,cx-45,cy-45,90,90,20,'#f3e7d6');
        if(board[i]!=null){
          const color=COLORS[board[i]];
          ctx.fillStyle='#cfbda3';ctx.beginPath();ctx.ellipse(cx,cy+31,33,10,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=color;ctx.beginPath();ctx.arc(cx,cy-1,35,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#fff8e8';ctx.globalAlpha=.55;ctx.beginPath();ctx.ellipse(cx-12,cy-15,11,5,-.7,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
          label(ctx,MARKS[board[i]],cx,cy+1,27,'#fff6e1','center',700);
        }else{ctx.fillStyle='#e1d2bd';ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fill();}
        if(selected===i){ctx.save();ctx.strokeStyle='#a08362';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.roundRect(cx-44,cy-44,88,88,19);ctx.stroke();ctx.restore();}
      }
      if(flashTime>0){
        ctx.save();ctx.globalAlpha=flashTime/.32;
        for(const{index,color}of flash){
          const cx=X+index%WIDTH*CELL+48,cy=Y+Math.floor(index/WIDTH)*CELL+48;
          ctx.strokeStyle=COLORS[color];ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,37+(1-flashTime/.32)*16,0,Math.PI*2);ctx.stroke();
        }
        ctx.restore();
      }
      if(transition>0){roundRect(ctx,158,190,284,78,20,'#fff8e9');label(ctx,'漂亮！下一盘准备中…',300,229,20,'#8a745c','center',700);}
      label(ctx,'点击同色组合 · 方向键选择，空格消除',300,461,13,'#a08b74','center',500);
    },
    destroy(){pressed=-1;finished=true;},
  };
}
