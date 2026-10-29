import {campaignView,recordPolicy,betterLevelResult,levelResultText} from '@playground/game-sdk/level';
import {createGame} from '@game';
import {manifest as game} from '@game/manifest';
import {rules} from '@game/rules';
import {campaign} from '@game/campaign';
import {mountGame,gameSurface} from '../src/index.js';
import {bindTouchActivation} from '../src/activation.js';
const root=document.querySelector('#app');let session;
bindTouchActivation(document);
function render(number=0){
session?.destroy();
const level=campaign?.levels[number-1],view=level?campaignView(game,level):game,key=`tiny-break-arcade:dev:${game.id}${level?`:campaign:v${campaign.version}:${number}`:''}`;
let best;try{best=JSON.parse(localStorage.getItem(key));}catch{}
const policy=recordPolicy(game.id,game.campaign),format=result=>level?levelResultText(result,policy):rules.format(result);
document.title=`${game.title} · 独立预览`;
root.innerHTML=`<h1>${game.title}</h1><p>${level?level.objective:game.description}</p>${campaign?`<label>预览关卡 <select id="preview-level"><option value="0">原随心模式</option>${campaign.levels.map(item=>`<option value="${item.number}" ${number===item.number?'selected':''}>第 ${item.number} 关 · ${item.title}</option>`).join('')}</select></label>`:''}<div class="play-layout">${gameSurface(view,{backHref:'./',backLabel:'← 返回预览'})}</div><p id="best">${format(best)}</p><p role="status" id="notice"></p>`;
session=mountGame({root,game:view,createGame,level,seed:123,
  readyHtml:`<div class="overlay-card"><h2>${game.title}${level?` · 第 ${number} 关`:''}</h2><p>${level?level.objective:game.rules[0]}</p><button class="button primary" data-action="start">${level?'开始这一关':game.cta}</button></div>`,
  onFinish(result,{overlay}){
    const improved=level?result.won&&betterLevelResult(result,best,policy):rules.compare(result,best);
    if(improved){best=result;try{localStorage.setItem(key,JSON.stringify(best));}catch{root.querySelector('#notice').textContent='本机存储不可用：成绩暂时无法保存。';}}
    root.querySelector('#best').textContent=format(best);
    overlay.hidden=false;overlay.innerHTML=`<div class="overlay-card result-card"><h2>${result.won?'完成了！':'再试一次'}</h2><p>${format(result)}</p><button class="button primary" data-action="again">再玩一次</button></div>`;
  },onToast:message=>{root.querySelector('#notice').textContent=message;}
});
}
root.addEventListener('change',event=>{if(event.target.id==='preview-level')render(Number(event.target.value));});
render();
window.addEventListener('pagehide',()=>session?.destroy(),{once:true});
if(import.meta.hot)import.meta.hot.dispose(()=>session?.destroy());
