import {byId} from './catalog.js';

export function nicknameError(value) {
  if(typeof value!=='string'||[...value.trim()].length<2||[...value.trim()].length>12)
    return '昵称：请输入 2–12 个字符';
  if(/[\p{Cc}\p{Cf}]/u.test(value))return '昵称：请删除控制字符或不可见字符';
  return '';
}

const caps={star:500,bridge:1800,lights:100000,echo:12,catch:1000,bounce:240,pairs:720,merge:14336,rings:800,snake:100,boxes:450,pipes:420,jump:1200,bubbles:12000,slide:500,rhythm:3200,constellation:700,tower:1800,rain:600,mines:480};
const increments={star:10,bridge:50,catch:10,bounce:10,merge:4,rings:100,snake:10,jump:100,bubbles:10,rhythm:50,constellation:20,tower:50,rain:20};
const counters={bridge:{progress:12,lives:3},star:{lives:3},catch:{lives:3},bounce:{lives:3},lights:{steps:100000},echo:{rounds:12},pairs:{steps:100000},rings:{progress:8,lives:3},snake:{stars:10},boxes:{steps:100000},pipes:{steps:100000},jump:{passed:12,lives:3},bubbles:{cleared:60,round:3},slide:{steps:100000},rhythm:{hits:32,perfects:32,combo:32,lives:5},constellation:{steps:100000},tower:{level:12,lives:3},rain:{handled:24,caught:24,lives:3},mines:{opened:13}};
const names={steps:'步数',rounds:'完成轮数',lives:'剩余机会',progress:'完成进度',stars:'星星数量',passed:'通过障碍数',cleared:'消除数量',round:'关卡',hits:'命中数',perfects:'完美命中数',combo:'连击数',level:'楼层',handled:'目标数量',caught:'接住数量',opened:'翻开格数'};

// Shared by the API and frontend. These are plausibility checks, not replay verification.
export function validateResult(id,value) {
  const errors=[];
  const add=(field,message)=>errors.push({field,code:'invalid_result',message});
  const game=byId[id];
  if(!game)return [{field:'gameId',code:'invalid_game',message:'游戏：请选择已开放的游戏'}];
  const r=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  if(!Number.isInteger(r.score)||r.score<0||r.score>caps[id]||increments[id]&&r.score%increments[id]!==0)add('score',`得分：请提交符合${game.title}规则的有效成绩（0–${caps[id]}）`);
  if(typeof r.elapsed!=='number'||!Number.isFinite(r.elapsed)||r.elapsed<0||r.elapsed>game.limit+.05)add('elapsed',`用时：必须为 0–${game.limit} 秒之间的有效数字`);
  if(typeof r.won!=='boolean')add('won','通关状态：必须明确是否通关');
  for(const[field,max]of Object.entries(counters[id]||{}))if(!Number.isInteger(r[field])||r[field]<0||r[field]>max)add(field,`${names[field]}：请输入 0–${max} 之间的整数`);
  if(errors.length)return errors;
  let valid=true;
  if(id==='lights')valid=r.score===r.steps;
  if(id==='echo')valid=r.score===r.rounds&&r.won===(r.rounds===12);
  if(['bridge','tower'].includes(id)){const n=id==='bridge'?r.progress:r.level;valid=r.score>=n*100&&r.score<=n*150&&r.won===(n===12);}
  if(id==='rings')valid=r.score===r.progress*100&&r.won===(r.progress===8);
  if(id==='snake')valid=r.score===r.stars*10&&r.won===(r.stars===10);
  if(id==='jump')valid=r.score===r.passed*100&&r.won===(r.passed===12);
  if(id==='bounce')valid=r.won===(r.score===240);
  if(['star','catch'].includes(id))valid=!r.won||r.elapsed>=game.limit-.05;
  if(id==='pairs')valid=r.won?r.steps>=12&&r.score===600+Math.max(0,120-r.steps*3):r.score<=500&&r.score%100===0;
  if(id==='boxes')valid=r.won?r.score===300+Math.max(0,150-r.steps*3):r.score<=200&&r.score%100===0;
  if(id==='pipes')valid=r.won?r.score===300+Math.max(0,120-r.steps*2):r.score<=160&&r.score%10===0;
  if(id==='slide')valid=r.won?r.score===300+Math.max(0,200-r.steps*5):r.score<=160&&r.score%20===0;
  if(id==='rhythm')valid=r.perfects<=r.hits&&r.combo<=r.hits&&r.score===(r.hits+r.perfects)*50;
  if(id==='rain')valid=r.caught<=r.handled&&r.score>=r.caught*20&&r.score<=r.caught*40&&r.won===(r.caught===24);
  if(id==='bubbles')valid=r.round>=1&&r.won===(r.cleared===60);
  if(id==='mines')valid=r.won?r.opened===13&&r.score===300+Math.max(0,180-Math.ceil(r.elapsed)):r.opened<13&&r.score===r.opened*20;
  if(id==='constellation'&&r.won)valid=r.score===700;
  if(!valid)add('score','得分、通关状态与游戏进度：不符合游戏规则，请重新游玩后提交');
  return errors;
}

export function cleanResult(value) {
  const out={score:value.score,elapsed:value.elapsed,won:value.won};
  for(const key of Object.keys(names))if(Number.isInteger(value[key]))out[key]=value[key];
  return out;
}
