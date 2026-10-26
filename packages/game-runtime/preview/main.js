import {createGame} from '@game';
import {manifest as game} from '@game/manifest';
import {rules} from '@game/rules';
import {mountGame,gameSurface} from '../src/index.js';
import {bindTouchActivation} from '../src/activation.js';
const root=document.querySelector('#app'),key=`tiny-break-arcade:dev:${game.id}`;
let best;try{best=JSON.parse(localStorage.getItem(key));}catch{}
document.title=`${game.title} · 独立预览`;
root.innerHTML=`<h1>${game.title}</h1><p>${game.description}</p><div class="play-layout">${gameSurface(game,{backHref:'./',backLabel:'← 返回预览'})}</div><p id="best">${rules.format(best)}</p><p role="status" id="notice"></p>`;
bindTouchActivation(document);
const session=mountGame({root,game,createGame,seed:123,
  readyHtml:`<div class="overlay-card"><h2>${game.title}</h2><p>${game.rules[0]}</p><button class="button primary" data-action="start">${game.cta}</button></div>`,
  onFinish(result,{overlay}){
    if(rules.compare(result,best)){best=result;try{localStorage.setItem(key,JSON.stringify(best));}catch{root.querySelector('#notice').textContent='本机存储不可用：成绩暂时无法保存。';}}
    root.querySelector('#best').textContent=rules.format(best);
    overlay.hidden=false;overlay.innerHTML=`<div class="overlay-card result-card"><h2>${rules.format(result)}</h2><button class="button primary" data-action="again">再玩一次</button></div>`;
  },onToast:message=>{root.querySelector('#notice').textContent=message;}
});
window.addEventListener('pagehide',()=>session.destroy(),{once:true});
if(import.meta.hot)import.meta.hot.dispose(()=>session.destroy());
