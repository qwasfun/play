import {rng, roundRect, label} from '@playground/game-sdk';

const LIMIT=60, TARGET=12, SPEED=176, PLAYER_X=150, GROUND=367;
const GRAVITY=880, JUMP_VELOCITY=470, JUMP_DURATION=2*JUMP_VELOCITY/GRAVITY;
const TAU=Math.PI*2;

export function generateJumpSchedule(seed){
  const random=rng(`${seed}:meadow-relay`);
  let time=3.1;
  return Array.from({length:TARGET},(_,index)=>{
    const obstacle={id:index,time,width:32+Math.floor(random()*11),height:37+Math.floor(random()*19),color:index%3};
    time+=2.65+random()*.5;
    return obstacle;
  });
}

export function jumpHeight(time){
  return Math.max(0,JUMP_VELOCITY*time-GRAVITY*time*time/2);
}

export function createGame({seed,onFinish=()=>{},sound=()=>{}}){
  const schedule=generateJumpSchedule(seed);
  const resolved=new Set(),collisions=new Set();
  let elapsed=0,score=0,lives=3,passed=0,finished=false,won=false,jumpAt=null,flash=0,notice='看见小木桩，轻轻跳过去';
  function finish(reason){
    if(finished)return;
    finished=true;
    onFinish({score,elapsed,lives,passed,won,reason});
  }
  function height(){return jumpAt===null?0:jumpHeight(elapsed-jumpAt);}
  function jump(){
    if(finished||jumpAt!==null)return;
    jumpAt=elapsed;notice='跳起来，把快乐传下去';sound('tap');
  }
  function step(dt){
    elapsed=Math.min(LIMIT,elapsed+dt);
    flash=Math.max(0,flash-dt);
    if(jumpAt!==null&&elapsed-jumpAt>=JUMP_DURATION)jumpAt=null;
    const foot=GROUND-height();
    for(const obstacle of schedule){
      if(resolved.has(obstacle.id))continue;
      const x=PLAYER_X+(obstacle.time-elapsed)*SPEED;
      if(!collisions.has(obstacle.id)&&x-obstacle.width/2<PLAYER_X+15&&x+obstacle.width/2>PLAYER_X-15&&foot>GROUND-obstacle.height+5){
        collisions.add(obstacle.id);lives--;flash=.4;notice=lives?'擦到木桩了，看准时机再跳':'先休息一下，下次会更轻盈';sound('hit');
        if(lives<=0){finish('lives');return;}
      }
      if(x+obstacle.width/2<PLAYER_X-18){
        resolved.add(obstacle.id);
        if(!collisions.has(obstacle.id)){passed++;score+=100;notice='+100 · 轻轻越过一座小木桩';sound('collect');}
        if(resolved.size===TARGET){won=passed===TARGET;sound(won?'win':'tap');finish('complete');return;}
      }
    }
    if(elapsed>=LIMIT)finish('time');
  }
  return{
    update(dt){
      if(finished||!Number.isFinite(dt)||dt<=0)return;
      // Small deterministic collision steps avoid passing through narrow logs
      // after a slow frame or a large update used by the host's rule tests.
      let remaining=Math.min(dt,LIMIT-elapsed);
      while(remaining>1e-9&&!finished){const amount=Math.min(remaining,1/120);step(amount);remaining-=amount;}
    },
    input(type,payload={}){
      if(type==='primary-down')jump();
      if(type==='key-down'&&!payload.repeat&&[' ','Enter','ArrowUp','w','W'].includes(payload.key))jump();
    },
    getState(){
      return{score,elapsed,lives,passed,finished,won,jumping:jumpAt!==null,jumpHeight:height(),jumpAt,extra:`${passed} / ${TARGET}`,hint:notice,
        schedule:schedule.map(obstacle=>({...obstacle})),obstacles:schedule.filter(obstacle=>!resolved.has(obstacle.id)).map(obstacle=>({...obstacle,x:PLAYER_X+(obstacle.time-elapsed)*SPEED,hit:collisions.has(obstacle.id)}))};
    },
    draw(ctx){
      ctx.fillStyle='#e5eee3';ctx.fillRect(0,0,600,480);
      ctx.fillStyle='#f4d889';ctx.beginPath();ctx.arc(492,78,33,0,TAU);ctx.fill();
      for(let i=0;i<4;i++){
        const x=((i*186-elapsed*12)%760+760)%760-80,y=85+(i%2)*58;
        ctx.fillStyle='#f9f9e9';ctx.beginPath();ctx.ellipse(x,y,44,14,0,0,TAU);ctx.ellipse(x+24,y-10,28,23,0,0,TAU);ctx.fill();
      }
      ctx.fillStyle='#c5d9b7';ctx.beginPath();ctx.moveTo(0,315);ctx.bezierCurveTo(120,215,220,340,350,267);ctx.bezierCurveTo(445,209,510,252,600,268);ctx.lineTo(600,480);ctx.lineTo(0,480);ctx.fill();
      ctx.fillStyle='#a8c398';ctx.beginPath();ctx.moveTo(0,353);ctx.bezierCurveTo(150,286,229,375,390,320);ctx.bezierCurveTo(492,286,556,322,600,324);ctx.lineTo(600,480);ctx.lineTo(0,480);ctx.fill();
      roundRect(ctx,0,GROUND,600,115,0,'#d7d7ad');
      roundRect(ctx,0,GROUND,600,12,0,'#8eae7e');
      for(let i=0;i<15;i++){
        const x=((i*53-elapsed*SPEED)%795+795)%795-90;
        roundRect(ctx,x,GROUND+40+(i%2)*31,23,4,2,'#bdc398');
      }
      for(const obstacle of schedule){
        if(resolved.has(obstacle.id))continue;
        const x=PLAYER_X+(obstacle.time-elapsed)*SPEED;
        if(x< -50||x>650)continue;
        const hit=collisions.has(obstacle.id);
        roundRect(ctx,x-obstacle.width/2,GROUND-obstacle.height+4,obstacle.width,obstacle.height,7,hit?'#c9af8d':'#a97853');
        roundRect(ctx,x-obstacle.width/2,GROUND-obstacle.height,obstacle.width,obstacle.height-4,7,hit?'#e2c6a4':'#d2a572');
        ctx.strokeStyle=hit?'#c1a786':'#b5875a';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x-7,GROUND-obstacle.height+11);ctx.lineTo(x-7,GROUND-7);ctx.moveTo(x+6,GROUND-obstacle.height+17);ctx.lineTo(x+6,GROUND-10);ctx.stroke();
        if(!hit){label(ctx,'✦',x,GROUND-obstacle.height-20,18,'#d2a553');}
      }
      const feet=GROUND-height(),bounce=jumpAt===null?Math.sin(elapsed*14)*2:0;
      ctx.fillStyle='#829f76';ctx.beginPath();ctx.ellipse(PLAYER_X,GROUND+3,21-height()*.04,6,0,0,TAU);ctx.fill();
      ctx.save();ctx.translate(PLAYER_X,feet+bounce);
      ctx.rotate(jumpAt!==null?-.08:Math.sin(elapsed*12)*.025);
      roundRect(ctx,-18,-38,36,33,12,flash?'#efa28a':'#70a69a');
      ctx.fillStyle='#f2ca90';ctx.beginPath();ctx.arc(0,-48,19,0,TAU);ctx.fill();
      ctx.fillStyle='#efb66c';ctx.beginPath();ctx.ellipse(-9,-65,6,16,-.3,0,TAU);ctx.ellipse(7,-65,6,16,.14,0,TAU);ctx.fill();
      ctx.fillStyle='#36594b';ctx.beginPath();ctx.arc(4,-49,2,0,TAU);ctx.arc(13,-49,2,0,TAU);ctx.fill();
      ctx.strokeStyle='#cb9070';ctx.lineWidth=2;ctx.beginPath();ctx.arc(9,-44,4,0,Math.PI);ctx.stroke();
      roundRect(ctx,-20,-7,16,8,4,'#497c6c');roundRect(ctx,5,-7,16,8,4,'#497c6c');
      roundRect(ctx,-28,-30,13,7,3,'#d1b780');ctx.restore();
      const next=schedule.find(obstacle=>!resolved.has(obstacle.id)&&!collisions.has(obstacle.id));
      const until=next?next.time-elapsed:0;
      const cue=jumpAt===null&&until>.36&&until<.70;
      roundRect(ctx,176,189,248,48,18,cue?'#fff0b8':'#f7f5e8');
      label(ctx,cue?'现在跳！ ↑':'点击 / 空格，轻轻起跳',300,214,17,cue?'#9d7437':'#7d9276','center',700);
      label(ctx,'MEADOW RELAY',28,32,11,'#7e9b7b','left',750);
      label(ctx,`小木桩 ${Math.min(TARGET,resolved.size+1)} / ${TARGET}`,570,33,13,'#7e9b7b','right',600);
      roundRect(ctx,116,425,368,35,15,'#eef0d7');label(ctx,notice,300,443,13,'#75866a','center',600);
      if(flash>0){ctx.fillStyle=`rgba(238,141,118,${flash*.3})`;ctx.fillRect(0,0,600,480);}
    },
    destroy(){finished=true;jumpAt=null;}
  };
}
