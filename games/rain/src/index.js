import {rng,roundRect,label} from '@playground/game-sdk';

const LIMIT=60, TARGET=24, UMBRELLA_Y=330, WIDTH=116, SPEED=440;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const direction=key=>['arrowleft','a'].includes(String(key).toLowerCase())?-1:['arrowright','d'].includes(String(key).toLowerCase())?1:0;

export function generateRainSchedule(seed){
  const random=rng(`${seed}:little-rain-shelter`);let time=.4;
  return Array.from({length:TARGET},(_,index)=>{
    const fallTime=2.15,drop={id:index,time,crossTime:time+fallTime,x:[120,240,360,480][Math.floor(random()*4)]+(random()-.5)*38,type:index%4===3?'sun':'rain',speed:(UMBRELLA_Y+28)/fallTime};
    time+=1.3+random()*.17;return drop;
  });
}

export function rainBlocked(dropX,umbrellaX){return Math.abs(dropX-umbrellaX)<=WIDTH/2+1e-9;}

export function createGame({seed,onFinish=()=>{},sound=()=>{}}){
  const schedule=generateRainSchedule(seed),keys=new Set(),sparks=[];
  let elapsed=0,score=0,lives=3,handled=0,caught=0,x=300,dragging=false,finished=false,won=false,flash=0;
  let notice='移动小伞，雨滴和阳光都要接住';
  const move=value=>{if(Number.isFinite(value))x=clamp(value,64,536);};
  function finish(reason){if(finished)return;finished=true;dragging=false;keys.clear();onFinish({score,elapsed,lives,handled,caught,won,reason});}
  return{
    update(dt){
      if(finished||!Number.isFinite(dt)||dt<=0)return;
      const before=elapsed,end=Math.min(LIMIT,elapsed+dt),step=end-before,previousX=x;
      const velocity=dragging?0:clamp([...keys].reduce((sum,key)=>sum+direction(key),0),-1,1)*SPEED;
      move(previousX+velocity*step);flash=Math.max(0,flash-step);
      for(const spark of sparks)spark.life-=step;
      for(let i=sparks.length-1;i>=0;i--)if(sparks[i].life<=0)sparks.splice(i,1);
      while(handled<TARGET&&schedule[handled].crossTime<=end+1e-9){
        const drop=schedule[handled],atX=clamp(previousX+velocity*(drop.crossTime-before),64,536);
        elapsed=drop.crossTime;handled++;
        if(rainBlocked(drop.x,atX)){
          caught++;const points=drop.type==='sun'?40:20;score+=points;notice=drop.type==='sun'?'+40 · 接住一束温暖阳光':'+20 · 小花又躲过一滴雨';sound('collect');
          sparks.push({x:drop.x,points,type:drop.type,life:.5});
        }else{
          lives--;flash=.4;notice=lives?'小花淋到了，提前移到下一滴雨下方':'让小花歇一歇，下次再撑起小伞';sound('hit');
          if(!lives){x=atX;finish('lives');return;}
        }
        if(handled===TARGET){x=atX;won=caught===TARGET;sound(won?'win':'tap');finish('complete');return;}
      }
      elapsed=end;
      if(elapsed>=LIMIT)finish('time');
    },
    input(type,payload={}){
      if(type==='primary-cancel'){dragging=false;keys.clear();return;}
      if(finished)return;
      if(type==='primary-down'){dragging=true;move(payload.x);}
      if(type==='primary-move'&&dragging)move(payload.x);
      if(type==='primary-up'){if(dragging)move(payload.x);dragging=false;}
      if(type==='key-down'&&!payload.repeat&&direction(payload.key))keys.add(String(payload.key).toLowerCase());
      if(type==='key-up')keys.delete(String(payload.key).toLowerCase());
    },
    getState(){return{score,elapsed,lives,handled,caught,finished,won,extra:`${handled} / ${TARGET}`,hint:notice,umbrella:{x,y:UMBRELLA_Y,width:WIDTH,dragging},schedule:schedule.map(drop=>({...drop})),items:schedule.slice(handled).filter(drop=>drop.time<=elapsed).map(drop=>({...drop,y:-28+drop.speed*(elapsed-drop.time)}))};},
    draw(ctx){
      ctx.fillStyle='#dce8ec';ctx.fillRect(0,0,600,480);
      ctx.fillStyle='#cbdbe2';ctx.beginPath();ctx.moveTo(0,301);ctx.quadraticCurveTo(110,230,225,303);ctx.quadraticCurveTo(390,209,600,303);ctx.lineTo(600,480);ctx.lineTo(0,480);ctx.fill();
      for(let lane=0;lane<4;lane++){
        const lx=120+lane*120;ctx.save();ctx.setLineDash([4,11]);ctx.strokeStyle='#bfd2d9';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(lx,84);ctx.lineTo(lx,365);ctx.stroke();ctx.restore();
      }
      for(let i=0;i<14;i++){
        const rx=(i*61+36)%600,ry=((i*73+elapsed*58)%360+360)%360;
        ctx.strokeStyle='#aac6d055';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx-5,ry+14);ctx.stroke();
      }
      roundRect(ctx,0,399,600,81,0,'#afc9ad');
      roundRect(ctx,0,397,600,9,0,'#98b69b');
      for(const[cx,cy]of[[72,73],[278,56],[485,90]]){
        ctx.fillStyle='#a7beca';ctx.beginPath();ctx.ellipse(cx,cy,53,17,0,0,Math.PI*2);ctx.ellipse(cx-22,cy-12,27,23,0,0,Math.PI*2);ctx.ellipse(cx+13,cy-14,31,27,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#cad9df';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx-26,cy+16);ctx.lineTo(cx-31,cy+27);ctx.moveTo(cx+8,cy+18);ctx.lineTo(cx+3,cy+29);ctx.stroke();
      }
      for(const drop of schedule.slice(handled)){
        if(drop.time>elapsed)break;
        const y=-28+drop.speed*(elapsed-drop.time);
        if(drop.type==='sun'){
          ctx.save();ctx.translate(drop.x,y);ctx.rotate(elapsed*.6);
          ctx.strokeStyle='#e8c16a';ctx.lineWidth=3;
          for(let ray=0;ray<8;ray++){const a=ray*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*16,Math.sin(a)*16);ctx.lineTo(Math.cos(a)*21,Math.sin(a)*21);ctx.stroke();}
          ctx.fillStyle='#f2d285';ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();ctx.restore();
        }else{
          ctx.fillStyle='#679fb6';ctx.beginPath();ctx.moveTo(drop.x,y-19);ctx.bezierCurveTo(drop.x-22,y+5,drop.x-11,y+17,drop.x,y+17);ctx.bezierCurveTo(drop.x+11,y+17,drop.x+22,y+5,drop.x,y-19);ctx.fill();
          ctx.strokeStyle='#d1e8ed';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(drop.x-6,y+1);ctx.lineTo(drop.x-5,y+7);ctx.stroke();
        }
      }
      const sway=Math.sin(elapsed*3)*2;
      ctx.strokeStyle='#6e9272';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(300,399);ctx.lineTo(300+sway,365);ctx.stroke();
      ctx.fillStyle='#83a37d';ctx.beginPath();ctx.ellipse(286,384,13,6,.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=flash>0?'#c99e97':'#edb699';
      for(let petal=0;petal<6;petal++){const a=petal*Math.PI/3;ctx.beginPath();ctx.arc(300+sway+Math.cos(a)*12,365+Math.sin(a)*12,9,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#f7e0a3';ctx.beginPath();ctx.arc(300+sway,365,8,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.translate(x,UMBRELLA_Y);
      ctx.strokeStyle='#6a7d7c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-29);ctx.lineTo(0,38);ctx.quadraticCurveTo(0,50,12,46);ctx.stroke();
      ctx.fillStyle='#e8aa94';ctx.beginPath();ctx.moveTo(-58,0);ctx.quadraticCurveTo(-48,-46,0,-51);ctx.quadraticCurveTo(48,-46,58,0);ctx.quadraticCurveTo(43,-13,29,0);ctx.quadraticCurveTo(14,-13,0,0);ctx.quadraticCurveTo(-14,-13,-29,0);ctx.quadraticCurveTo(-43,-13,-58,0);ctx.fill();
      ctx.strokeStyle='#c78f7f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-49);ctx.quadraticCurveTo(-22,-29,-29,-2);ctx.moveTo(0,-49);ctx.quadraticCurveTo(22,-29,29,-2);ctx.stroke();
      ctx.restore();
      for(const spark of sparks){ctx.save();ctx.globalAlpha=Math.min(1,spark.life*3);label(ctx,`+${spark.points}`,spark.x,UMBRELLA_Y-57-(.5-spark.life)*34,19,spark.type==='sun'?'#af883d':'#547f91','center',750);ctx.restore();}
      label(ctx,'LITTLE RAIN SHELTER',25,27,11,'#718f9c','left',750);
      label(ctx,`${handled} / ${TARGET} 份小天气`,575,27,13,'#6e8a91','right',650);
      roundRect(ctx,134,424,332,32,15,'#edf3df');label(ctx,'雨滴 +20 · 阳光 +40 · 漏接 −1 次',300,441,13,'#688672','center',600);
      label(ctx,'左右拖动 / ← → · 提前把小伞移到它下方',300,469,12,'#69856f','center',550);
      if(flash>0){ctx.fillStyle=`rgba(213,146,125,${flash*.3})`;ctx.fillRect(0,0,600,480);}
    },
    destroy(){finished=true;dragging=false;keys.clear();sparks.length=0;}
  };
}
