import {rng,roundRect,label} from '@playground/game-sdk';
export function createCampaignGame({level:config,seed,onFinish=()=>{},sound=()=>{}}){
 seed=config.seed;const emitFinish=onFinish;onFinish=result=>emitFinish({...result,reason:result.won?'complete':result.lives<=0?'lives':'target-shortfall',mistakes:Math.max(0,3-(result.lives??3))});
 let elapsed=0,score=0,finished=false,won=false,cursor=0,pressed=-1;
 const random=rng(`${seed}:windmill:v1`);
 let angle=0,target=config.targets[0],hits=0,lives=3;
 function finish(success=false){if(finished)return;finished=true;won=success;onFinish({score,elapsed,won,hits,lives});}
 function cell(p){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return -1;return p.x>=60&&p.x<=540&&p.y>=65&&p.y<=455?0:-1;}
 function act(i){if(finished||i<0)return;const delta=Math.abs(Math.atan2(Math.sin(angle-target),Math.cos(angle-target)));if(delta<=config.window){hits++;score=hits*50;target=config.targets[hits%config.targets.length];sound('win');if(hits===config.target)finish(true);}else{lives--;sound('tap');if(!lives)finish();}}
 return {update(dt){if(finished||!Number.isFinite(dt)||dt<=0)return;elapsed=elapsed+dt;angle=(angle+dt*(config.speed+hits*.025))%(Math.PI*2); },
 input(type,p={}){if(type==='primary-cancel'){pressed=-1;return;}if(finished)return;
 if(type==='primary-down')pressed=cell(p);if(type==='primary-up'){const i=cell(p);if(i===pressed)act(i);pressed=-1;}
 if(type==='key-down'&&!p.repeat){const k=String(p.key).toLowerCase();if(k===' '||k==='enter')act(0);}},
 getState(){return {elapsed,score,finished,won,cursor,angle,target,hits,lives,extra:`${hits} / ${config.target}`,hint:'指针进入金色扇区时采蜜'};},
 draw(ctx){ctx.fillStyle='#f5eddb';ctx.fillRect(0,0,600,480);label(ctx,'风车采蜜',300,32,26);ctx.strokeStyle='#e1d2b2';ctx.lineWidth=35;ctx.beginPath();ctx.arc(300,250,145,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#e9b953';ctx.beginPath();ctx.arc(300,250,145,target-config.window,target+config.window);ctx.stroke();ctx.strokeStyle='#658b78';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(300,250);ctx.lineTo(300+140*Math.cos(angle),250+140*Math.sin(angle));ctx.stroke();roundRect(ctx,280,230,40,40,20,'#bc855d');label(ctx,`采蜜 ${hits}/${config.target} · 机会 ${lives}`,300,430,21);},
 destroy(){finished=true;pressed=-1;}};
}
