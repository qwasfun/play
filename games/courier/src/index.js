import {rng,roundRect,label} from '@playground/game-sdk';
export function createGame({seed,onFinish=()=>{},sound=()=>{}}){
 let elapsed=0,score=0,finished=false,won=false,cursor=0,pressed=-1;
 const random=rng(`${seed}:courier:v1`);
 let position=0,handled=0,lives=3,phase=0,bee=0;const path=[12,13,14,15,16,17,16,15,14,13],walls=[8,9,20,21],letters=[5,30,11,24,35];function move(to){if(to<0||to>=36||walls.includes(to)||Math.abs(to%6-position%6)+Math.abs(Math.floor(to/6)-Math.floor(position/6))!==1)return;position=to;collect();}function collect(){if(position===path[bee]){lives--;position=0;if(!lives)finish();return;}if(position===letters[handled]){handled++;score=handled*100;sound('win');if(handled===5)finish(true);}}
 function finish(success=false){if(finished)return;finished=true;won=success;onFinish({score,elapsed,won,handled,lives});}
 function cell(p){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return -1;if(p.x<120||p.x>=480||p.y<70||p.y>=430)return -1;return Math.floor((p.y-70)/60)*6+Math.floor((p.x-120)/60);}
 function act(i){if(finished||i<0)return;move(i);}
 return {update(dt){if(finished||!Number.isFinite(dt)||dt<=0)return;elapsed=Math.min(90,elapsed+dt);phase+=dt;while(phase>=.65&&!finished){phase-=.65;bee=(bee+1)%path.length;collect();} if(elapsed>=90)finish();},
 input(type,p={}){if(type==='primary-cancel'){pressed=-1;return;}if(finished)return;
 if(type==='primary-down')pressed=cell(p);if(type==='primary-up'){const i=cell(p);if(i===pressed)act(i);pressed=-1;}
 if(type==='key-down'&&!p.repeat){const k=String(p.key).toLowerCase();if(k==='arrowleft'||k==='a')move(position-1);if(k==='arrowright'||k==='d')move(position+1);if(k==='arrowup'||k==='w')move(position-6);if(k==='arrowdown'||k==='s')move(position+6);}},
 getState(){return {elapsed,score,finished,won,cursor,position,handled,lives,bee:path[bee],nextBee:path[(bee+1)%path.length],extra:`${handled} / 5`,hint:'点相邻格移动，留心蜜蜂的下一站'};},
 draw(ctx){ctx.fillStyle='#f5eddb';ctx.fillRect(0,0,600,480);label(ctx,'花径送信',300,32,26);for(let i=0;i<36;i++){const x=120+i%6*60,y=70+Math.floor(i/6)*60;roundRect(ctx,x+3,y+3,54,54,12,walls.includes(i)?'#789b74':'#e3dcc0');if(i===letters[handled]){roundRect(ctx,x+10,y+17,40,28,3,'#fffaf0','#b78a63');label(ctx,'✉',x+30,y+31,24);}if(i===path[(bee+1)%path.length])label(ctx,'·',x+30,y+30,35,'#a77532');if(i===path[bee])label(ctx,'蜂',x+30,y+30,24,'#98602b');if(i===position){roundRect(ctx,x+14,y+12,32,36,14,'#66958a');label(ctx,'你',x+30,y+30,19,'#fff');}}label(ctx,`信件 ${handled}/5 · 机会 ${lives}`,300,456,19);},
 destroy(){finished=true;pressed=-1;}};
}
