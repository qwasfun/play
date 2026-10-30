import {roundRect,label} from '@playground/game-sdk';
import {FLIGHT,generateCourse,passTime,ringCenter,ringX,fitsRing} from './course.js';
export {FLIGHT,generateCourse,passTime,ringCenter,ringX,fitsRing} from './course.js';

export function createGame({seed,onFinish=()=>{},sound=()=>{}}) {
  const course=generateCourse(seed), keys=new Set(), outcomes=[];
  let elapsed=0,y=240,passed=0,handled=0,lives=3,finished=false,won=false,pointer=null,flash=0;
  const direction=()=>pointer ?? ((keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0));
  const cancel=()=>{keys.clear();pointer=null;};
  const region=p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=600&&p.y>=0&&p.y<=480 ? (p.y<240?-1:1) : null;
  function finish(success) {
    if(finished)return;
    finished=true;won=success;cancel();
    onFinish({score:passed*100,elapsed,won,passed,handled,lives});
  }
  function step(dt) {
    const before=elapsed,oldY=y;
    elapsed=Math.min(FLIGHT.limit,elapsed+dt);
    y=Math.max(FLIGHT.top,Math.min(FLIGHT.bottom,y+direction()*FLIGHT.lift*(elapsed-before)));
    flash=Math.max(0,flash-dt);
    while(handled<course.length&&passTime(course[handled])<=elapsed+1e-9) {
      const ring=course[handled],time=passTime(ring);
      const crossing=oldY+(y-oldY)*Math.max(0,Math.min(1,(time-before)/(elapsed-before||1)));
      const hit=fitsRing(crossing,ringCenter(ring,time));
      outcomes.push(hit);handled++;
      if(hit){passed++;sound('collect');}else{lives--;flash=.35;sound('hit');}
      if(!lives){finish(false);return;}
      if(handled===course.length){finish(passed>=10);return;}
    }
    if(elapsed>=FLIGHT.limit)finish(false);
  }
  return {
    update(dt) {
      if(finished||!Number.isFinite(dt)||dt<=0)return;
      let left=Math.min(dt,FLIGHT.limit-elapsed);
      // Substeps preserve crossing and input behavior even in a delayed host frame.
      while(left>1e-10&&!finished){const slice=Math.min(left,1/120);step(slice);left-=slice;}
    },
    input(type,p={}) {
      if(type==='primary-cancel'){cancel();return;}
      if(finished)return;
      if(type==='primary-down')pointer=region(p);
      if(type==='primary-move'&&pointer!==null)pointer=region(p);
      if(type==='primary-up')pointer=null;
      const key=String(p.key).toLowerCase();
      if(['arrowup','arrowdown','w','s'].includes(key)){
        if(type==='key-down'&&!p.repeat)keys.add(key);
        if(type==='key-up')keys.delete(key);
      }
    },
    getState() {
      return {elapsed,score:passed*100,finished,won,y,passed,handled,lives,direction:direction(),
        rings:course.map((ring,i)=>({x:ringX(ring,elapsed),y:ringCenter(ring,elapsed),hit:outcomes[i]??null})),
        extra:`${handled} / 12`,hint:`花环 ${handled}/12 · 穿过 ${passed} · 按住上半区升、下半区降，松手停住`};
    },
    draw(ctx) {
      ctx.fillStyle='#edf2e3';ctx.fillRect(0,0,600,480);
      ctx.fillStyle='#f7deb0';ctx.beginPath();ctx.arc(505,93,37,0,Math.PI*2);ctx.fill();
      const drift=(elapsed*12)%690;
      for(let i=0;i<3;i++){
        const x=i*245+70-drift;
        ctx.fillStyle='#fffaf0';ctx.beginPath();ctx.ellipse(x,120+i%2*55,47,14,0,0,Math.PI*2);ctx.fill();
      }
      ctx.fillStyle='#dbe3cb';ctx.beginPath();ctx.moveTo(0,407);ctx.bezierCurveTo(120,355,220,445,350,397);ctx.bezierCurveTo(450,363,515,404,600,380);ctx.lineTo(600,480);ctx.lineTo(0,480);ctx.fill();
      ctx.save();ctx.setLineDash([5,8]);ctx.strokeStyle='#b9cbb7';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(140,76);ctx.lineTo(140,400);ctx.stroke();ctx.restore();
      for(let i=0;i<course.length;i++){
        const x=ringX(course[i],elapsed),center=ringCenter(course[i],elapsed);
        if(x < -25||x>625)continue;
        const faded=i<handled;
        ctx.save();ctx.globalAlpha=faded?.35:1;ctx.strokeStyle=faded&&outcomes[i]?'#759e7f':'#c5a779';ctx.lineWidth=7;
        ctx.beginPath();ctx.ellipse(x,center,18,FLIGHT.halfGap,0,0,Math.PI*2);ctx.stroke();
        for(const offset of [-1,1]){
          const fy=center+offset*FLIGHT.halfGap;
          ctx.fillStyle=i%2?'#d88f80':'#ddb965';
          for(let petal=0;petal<5;petal++){const a=petal*Math.PI*2/5;ctx.beginPath();ctx.arc(x+Math.cos(a)*8,fy+Math.sin(a)*8,6,0,Math.PI*2);ctx.fill();}
          ctx.fillStyle='#faf0c9';ctx.beginPath();ctx.arc(x,fy,5,0,Math.PI*2);ctx.fill();
        }
        label(ctx,i+1,x,center,15,'#7e947e');ctx.restore();
      }
      ctx.strokeStyle='#acaa8a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(140,y+20);ctx.bezierCurveTo(118,y+45,85,y+10,67,y+48);ctx.stroke();
      for(let i=0;i<2;i++){
        const x=110-i*25,fy=y+25+i*8;
        ctx.fillStyle='#ddb469';ctx.beginPath();ctx.moveTo(x-7,fy-5);ctx.lineTo(x+7,fy+5);ctx.lineTo(x+7,fy-5);ctx.lineTo(x-7,fy+5);ctx.closePath();ctx.fill();
      }
      ctx.fillStyle=flash?'#ce8d79':'#d77e69';ctx.beginPath();ctx.moveTo(140,y-19);ctx.lineTo(155,y);ctx.lineTo(140,y+19);ctx.lineTo(125,y);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#f9e2ad';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(140,y-19);ctx.lineTo(140,y+19);ctx.moveTo(125,y);ctx.lineTo(155,y);ctx.stroke();
      roundRect(ctx,18,17,564,39,16,'#fff8e7');
      label(ctx,'纸鸢乘风',104,37,20);label(ctx,`穿过 ${passed}/12 · 机会 ${lives}`,440,37,17,'#617b69');
      roundRect(ctx,30,428,540,36,16,'#fff8e7');
      label(ctx,direction()<0?'↑ 轻轻升高':direction()>0?'↓ 缓缓降低':'上半区 ↑ 升高    ·    松手停住    ·    下半区 ↓ 降低',300,447,16,'#617b69');
    },
    destroy(){finished=true;cancel();}
  };
}
