import {rng,roundRect,label} from '@playground/game-sdk';
export function createGame({seed,onFinish=()=>{},sound=()=>{}}){
 let elapsed=0,score=0,finished=false,won=false,cursor=0,pressed=-1;
 const random=rng(`${seed}:jugs:v1`);
 let a=0,b=0,rounds=0,steps=0;const targets=[4,2,1],names=['装满小壶','装满大壶','倒空小壶','倒空大壶','小 → 大','大 → 小'];
 function finish(success=false){if(finished)return;finished=true;won=success;onFinish({score,elapsed,won,rounds,steps});}
 function cell(p){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return -1;if(p.x<90||p.x>=510||p.y<260||p.y>=440)return -1;return Math.floor((p.y-260)/90)*3+Math.floor((p.x-90)/140);}
 function act(i){if(finished||i<0)return;if(i>5)return;steps++;if(i===0)a=3;if(i===1)b=5;if(i===2)a=0;if(i===3)b=0;if(i===4){const n=Math.min(a,5-b);a-=n;b+=n;}if(i===5){const n=Math.min(b,3-a);b-=n;a+=n;}if(a===targets[rounds]||b===targets[rounds]){rounds++;score=rounds*100;a=0;b=0;sound('win');if(rounds===3)finish(true);}}
 return {update(dt){if(finished||!Number.isFinite(dt)||dt<=0)return;elapsed=Math.min(180,elapsed+dt); if(elapsed>=180)finish();},
 input(type,p={}){if(type==='primary-cancel'){pressed=-1;return;}if(finished)return;
 if(type==='primary-down')pressed=cell(p);if(type==='primary-up'){const i=cell(p);if(i===pressed)act(i);pressed=-1;}
 if(type==='key-down'&&!p.repeat){const k=String(p.key).toLowerCase();if(k==='arrowleft'||k==='a')cursor=(cursor+5)%6;if(k==='arrowright'||k==='d')cursor=(cursor+1)%6;if(k==='arrowup'||k==='arrowdown'||k==='w'||k==='s')cursor=(cursor+3)%6;if(k===' '||k==='enter')act(cursor);}},
 getState(){return {elapsed,score,finished,won,cursor,a,b,rounds,steps,target:targets[Math.min(rounds,2)],extra:`${rounds} / 3`,hint:'倒水会一直倒到一壶满或另一壶空'};},
 draw(ctx){ctx.fillStyle='#f5eddb';ctx.fillRect(0,0,600,480);label(ctx,'量水茶坊',300,32,26);label(ctx,`第 ${Math.min(rounds+1,3)} 题：量出 ${targets[Math.min(rounds,2)]} 杯水`,300,75,23);for(const [x,n,cap]of [[170,a,3],[350,b,5]]){roundRect(ctx,x,110,80,120,12,'#fff9ec','#a28b6c');if(n)roundRect(ctx,x+5,225-110*n/cap,70,110*n/cap,6,'#9fc6b3');label(ctx,`${n} / ${cap}`,x+40,180,24);}for(let i=0;i<6;i++){const x=90+i%3*140,y=260+Math.floor(i/3)*90;roundRect(ctx,x+5,y+5,130,75,14,cursor===i?'#c5d5b7':'#e3cfac',cursor===i?'#6e8e78':null);label(ctx,names[i],x+70,y+43,18);}label(ctx,`已操作 ${steps} 步`,300,463,16);},
 destroy(){finished=true;pressed=-1;}};
}
