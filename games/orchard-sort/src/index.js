import {rng,roundRect,label} from '@playground/game-sdk';
const CAPACITY=3, LIMIT=180;
export const isSorted=baskets=>baskets.every(b=>b.length===0||b.length===CAPACITY&&b.every(f=>f===b[0]));
export function moveFruit(baskets,from,to){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>3||to<0||to>3||from===to||!baskets[from].length||baskets[to].length===CAPACITY)return false;
 baskets[to].push(baskets[from].pop());return true;
}
export function generateBoard(seed,round=0){
 const random=rng(`${seed}:orchard-sort:v1:${round}`),b=[[0,0,0],[1,1,1],[2,2,2],[]];
 for(let n=0;n<30+round*8;n++){
  const moves=[];for(let a=0;a<4;a++)for(let c=0;c<4;c++)if(a!==c&&b[a].length&&b[c].length<3)moves.push([a,c]);
  const [a,c]=moves[Math.floor(random()*moves.length)];moveFruit(b,a,c);
 }
 if(isSorted(b)){const a=b.findIndex(x=>x.length),c=b.findIndex(x=>!x.length);moveFruit(b,a,c);}
 return b;
}
export function createGame({seed,onFinish=()=>{},sound=()=>{}}){
 let baskets=generateBoard(seed),elapsed=0,rounds=0,steps=0,finished=false,won=false,cursor=0,selected=-1,pressed=-1,history=[],message='先选一个篮子，再选有空位的篮子';
 const finish=success=>{if(finished)return;finished=true;won=success;onFinish({score:rounds*100,elapsed,won,rounds,steps});};
 function undo(){if(!history.length){message='这一盘还没有可撤销的搬动';return;}baskets=history.pop();selected=-1;message='已撤销，步数和时间保留';}
 function act(i){
  if(i===4){undo();return;}if(i<0||i>3)return;cursor=i;
  if(selected===i){selected=-1;message='已取消选择';return;}
  if(selected<0){if(baskets[i].length){selected=i;message='再选一个有空位的篮子';}else message='空篮没有水果，请选择其他篮子';return;}
  const before=baskets.map(b=>[...b]);
  if(!moveFruit(baskets,selected,i)){message='这个篮子已满，请选择其他篮子';return;}
  history.push(before);steps++;selected=-1;message='搬好一颗，继续整理吧';sound('tap');
  if(isSorted(baskets)){rounds++;sound('win');if(rounds===3)finish(true);else{baskets=generateBoard(seed,rounds);history=[];message='这一盘归篮完成，开始下一盘';}}
 }
 function hit(p){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return -1;if(p.x>=220&&p.x<380&&p.y>=382&&p.y<426)return 4;if(p.y<128||p.y>=338)return -1;for(let i=0;i<4;i++)if(p.x>=38+i*140&&p.x<142+i*140)return i;return -1;}
 return{update(dt){if(finished||!Number.isFinite(dt)||dt<=0)return;elapsed=Math.min(LIMIT,elapsed+dt);if(elapsed>=LIMIT)finish(false);},
 input(type,p={}){if(type==='primary-cancel'){pressed=-1;return;}if(finished)return;
 if(type==='primary-down')pressed=hit(p);if(type==='primary-up'){const i=hit(p);if(i>=0&&i===pressed)act(i);pressed=-1;}
 if(type==='key-down'&&!p.repeat){const k=String(p.key).toLowerCase();if(k==='arrowleft'||k==='a')cursor=(cursor+3)%4;if(k==='arrowright'||k==='d')cursor=(cursor+1)%4;if(k===' '||k==='enter')act(cursor);if(k==='z'||k==='backspace')undo();if(k==='escape')selected=-1;}},
 getState(){return{baskets:baskets.map(b=>[...b]),elapsed,score:rounds*100,rounds,steps,finished,won,selected,cursor,extra:`${rounds} / 3 · ${steps} 步`,hint:message};},
 draw(ctx){ctx.fillStyle='#f7efdc';ctx.fillRect(0,0,600,480);label(ctx,'果园分篮',300,38,28);label(ctx,`第 ${Math.min(rounds+1,3)} 盘 · 每次搬动篮顶一颗`,300,82,19);
 const colors=['#ce7663','#d2ac53','#8ba674'],names=['苹果','橘子','青梨'];
 for(let i=0;i<4;i++){const x=38+i*140;roundRect(ctx,x,128,104,210,18,selected===i?'#f5d9a6':'#fffaf0',cursor===i?'#7e947c':'#c7ad86');
 for(let j=0;j<baskets[i].length;j++){const f=baskets[i][j],y=306-j*61;ctx.fillStyle=colors[f];ctx.beginPath();ctx.arc(x+52,y-8,24,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#74896b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+52,y-31);ctx.lineTo(x+56,y-39);ctx.stroke();label(ctx,names[f],x+52,y-5,14,'#fffaf0');}
 label(ctx,`${i+1} 号篮`,x+52,360,17);}
 roundRect(ctx,220,382,160,44,12,history.length?'#d7dfc6':'#e7e1d3');label(ctx,'撤销一步 · Z',300,409,17);label(ctx,message,300,458,16);},
 destroy(){finished=true;pressed=-1;history=[];}};
}
