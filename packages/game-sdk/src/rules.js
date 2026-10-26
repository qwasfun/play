// Shared mechanisms only; game-specific policy belongs to each game package.
const names={steps:'步数',rounds:'完成轮数',lives:'剩余机会',progress:'完成进度',stars:'星星数量',passed:'通过障碍数',cleared:'消除数量',round:'关卡',hits:'命中数',perfects:'完美命中数',combo:'连击数',level:'楼层',handled:'目标数量',caught:'接住数量',opened:'翻开格数'};
export function nicknameError(value){
  if(typeof value!=='string'||[...value.trim()].length<2||[...value.trim()].length>12)return '昵称：请输入 2–12 个字符';
  if(/[\p{Cc}\p{Cf}]/u.test(value))return '昵称：请删除控制字符或不可见字符';
  return '';
}
export function cleanResult(value){
  const out={score:value.score,elapsed:value.elapsed,won:value.won};
  for(const key of Object.keys(names))if(Number.isInteger(value[key]))out[key]=value[key];
  return out;
}
const isRecord=r=>r&&typeof r==='object'&&Number.isFinite(r.score)&&r.score>=0&&Number.isFinite(r.elapsed)&&r.elapsed>=0&&typeof r.won==='boolean'&&(!('steps'in r)||Number.isFinite(r.steps)&&r.steps>=0)&&(!('rounds'in r)||Number.isFinite(r.rounds)&&r.rounds>=0);
/** Build a game's pure, Node-safe result policy without depending on a catalog. */
export function createResultRules({manifest,cap,increment=0,counters={},labels={},check=()=>true,compare=(a,b)=>a.score>b.score||(a.score===b.score&&a.elapsed<b.elapsed),format=r=>`${r.score} 分`,stored=()=>true,ranking={field:'score',sign:-1,requiresWin:false},seedCap}){
  return {
    ranking,seedCap,
    clean(value){
      const out={score:value.score,elapsed:value.elapsed,won:value.won};
      for(const key of Object.keys(counters))if(Number.isInteger(value[key]))out[key]=value[key];
      return out;
    },
    stored:r=>Boolean(isRecord(r)&&stored(r)),
    compare:(next,previous)=>!previous||compare(next,previous),
    format:r=>r?format(r):'等待你的第一个纪录',
    validate(value){
      const errors=[],r=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
      const add=(field,message)=>errors.push({field,code:'invalid_result',message});
      if(!Number.isInteger(r.score)||r.score<0||r.score>cap||increment&&r.score%increment!==0)add('score',`得分：请提交符合${manifest.title}规则的有效成绩（0–${cap}）`);
      if(typeof r.elapsed!=='number'||!Number.isFinite(r.elapsed)||r.elapsed<0||r.elapsed>manifest.limit+.05)add('elapsed',`用时：必须为 0–${manifest.limit} 秒之间的有效数字`);
      if(typeof r.won!=='boolean')add('won','通关状态：必须明确是否通关');
      for(const[field,max]of Object.entries(counters))if(!Number.isInteger(r[field])||r[field]<0||r[field]>max)add(field,`${labels[field]||names[field]||field}：请输入 0–${max} 之间的整数`);
      if(!errors.length&&!check(r))add('score','得分、通关状态与游戏进度：不符合游戏规则，请重新游玩后提交');
      return errors;
    }
  };
}
