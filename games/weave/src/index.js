import {createCampaignGame} from './campaign-engine.js';
import {rng,roundRect,label} from '@playground/game-sdk';
export function createGame({level:campaignLevel,seed,onFinish=()=>{},sound=()=>{}}){
  if(campaignLevel)return createCampaignGame({level:campaignLevel,onFinish,sound});
 let elapsed=0,score=0,finished=false,won=false,cursor=0,pressed=-1;
 const random=rng(`${seed}:weave:v1`);
 const solution=Array.from({length:25},()=>random()<.48);if(!solution.some(Boolean))solution[12]=true;const filled=Array(25).fill(false);let notice='照着线索织一扇花窗';const groups=a=>{const out=[];let n=0;for(const v of [...a,false]){if(v)n++;else if(n){out.push(n);n=0;}}return out.length?out:[0];};const rows=Array.from({length:5},(_,r)=>groups(solution.slice(r*5,r*5+5))),cols=Array.from({length:5},(_,c)=>groups(solution.filter((_,i)=>i%5===c)));
 function finish(success=false){if(finished)return;finished=true;won=success;onFinish({score,elapsed,won,steps:filled.filter(Boolean).length});}
 function cell(p){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return -1;if(p.x>=200&&p.x<=440&&p.y>=405&&p.y<=455)return 25;if(p.x<200||p.x>=500||p.y<90||p.y>=390)return -1;return Math.floor((p.y-90)/60)*5+Math.floor((p.x-200)/60);}
 function act(i){if(finished||i<0)return;if(i===25){const valid=rows.every((r,j)=>String(r)===String(groups(filled.slice(j*5,j*5+5))))&&cols.every((c,j)=>String(c)===String(groups(filled.filter((_,i)=>i%5===j))));if(valid){score=500;finish(true);}else notice='还有线索没对上，继续调整吧';}else if(i<25)filled[i]=!filled[i];}
 return {update(dt){if(finished||!Number.isFinite(dt)||dt<=0)return;elapsed=Math.min(180,elapsed+dt); if(elapsed>=180)finish();},
 input(type,p={}){if(type==='primary-cancel'){pressed=-1;return;}if(finished)return;
 if(type==='primary-down')pressed=cell(p);if(type==='primary-up'){const i=cell(p);if(i===pressed)act(i);pressed=-1;}
 if(type==='key-down'&&!p.repeat){const k=String(p.key).toLowerCase();if(k==='arrowleft'||k==='a')cursor=(cursor+24)%25;if(k==='arrowright'||k==='d')cursor=(cursor+1)%25;if(k==='arrowup'||k==='w')cursor=(cursor+20)%25;if(k==='arrowdown'||k==='s')cursor=(cursor+5)%25;if(k===' ')act(cursor);if(k==='enter')act(25);}},
 getState(){return {elapsed,score,finished,won,cursor,filled:[...filled],rows,cols,extra:`${filled.filter(Boolean).length} 格`,hint:notice};},
 draw(ctx){ctx.fillStyle='#f5eddb';ctx.fillRect(0,0,600,480);label(ctx,'花窗数织',300,32,26);for(let j=0;j<5;j++){label(ctx,rows[j].join(' '),180,120+j*60,19,'#775d42','right');const c=cols[j];c.forEach((v,k)=>label(ctx,v,230+j*60,80-(c.length-1-k)*18,16));}for(let i=0;i<25;i++){const x=200+i%5*60,y=90+Math.floor(i/5)*60;roundRect(ctx,x+2,y+2,56,56,7,filled[i]?'#849c86':'#fff9eb',cursor===i?'#9c7149':'#dbceb1');}roundRect(ctx,200,405,240,50,18,'#708e7c');label(ctx,'检查花窗 · Enter',320,430,19,'#fffaf0');},
 destroy(){finished=true;pressed=-1;}};
}
