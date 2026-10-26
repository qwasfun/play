import {games,byId} from '@playground/game-registry';
import {loaders} from '@playground/game-registry/browser';
import {mountGame,gameSurface} from '@playground/game-runtime';
import {beijingDate,dailyGame,dailySeed,playLink,parseRoute,resultText,RULE_VERSION} from '@playground/game-registry/core';
import {createStore} from './storage.js';
import {art} from './art.js';
import {bindTouchActivation} from '@playground/game-runtime/activation';
import {setupPwa} from './pwa.js';
import {createLeaderboardClient} from './leaderboard-client.js';
import {mountLeaderboard,mountSubmission} from './leaderboard-ui.js';
import {createAnalytics} from './analytics.js';

const app=document.querySelector('#app');
bindTouchActivation(document);
const pwa=setupPwa();
const leaderboard=createLeaderboardClient();
const track=createAnalytics();
const notice=document.querySelector('#storage-notice');
let local;
try {local=window.localStorage;} catch {local=null;}
const store=createStore(local,()=>{notice.hidden=false;});
let active=null, routeToken=0, homeFilter='全部', today=beijingDate(), toastTimer, audioContext;
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;},2800);}
function sound(kind='tap') {
  if (!store.data.sound) return;
  try {
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended') audioContext.resume().catch(()=>{});
    const oscillator=audioContext.createOscillator(), gain=audioContext.createGain(), now=audioContext.currentTime;
    oscillator.type='sine';oscillator.frequency.setValueAtTime(({tap:420,collect:760,hit:150,win:960})[kind]||420,now);
    gain.gain.setValueAtTime(.075,now);gain.gain.exponentialRampToValueAtTime(.001,now+.14);
    oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(now);oscillator.stop(now+.15);
  }catch{}
}
function updateSound(){const el=document.querySelector('#sound-toggle');el.setAttribute('aria-pressed',String(store.data.sound));el.setAttribute('aria-label',store.data.sound?'关闭音效':'开启音效');el.querySelector('.sound-label').textContent=store.data.sound?'音效开':'音效关';}
document.querySelector('#sound-toggle').addEventListener('click',()=>{store.sound(!store.data.sound);updateSound();sound();});
updateSound();
function dateLabel(date){return `${Number(date.slice(5,7))} 月 ${Number(date.slice(8))} 日`;}
function gameCard(game){const fav=store.data.favorites.includes(game.id);return `<article class="game-card" data-game="${game.id}"><a class="card-art art-${game.id}" href="${playLink(game.id)}" aria-label="开始${game.title}">${art(game.id)}${game.isNew?'<span class="new-badge">新游戏</span>':''}</a><div class="card-body"><div class="card-topline"><span class="game-category">${game.category}</span><button class="favorite-button ${fav?'active':''}" data-favorite="${game.id}" aria-pressed="${fav}" aria-label="${fav?'取消收藏':'收藏'}${game.title}">${fav?'♥':'♡'}</button></div><h3><a href="${playLink(game.id)}">${game.title}</a></h3><p class="card-description">${game.description}</p><p class="card-controls">${game.controls}</p><div class="card-bottom"><span class="game-duration">◷ ${game.duration}</span><a class="play-link" href="${playLink(game.id)}">玩一局 <span aria-hidden="true">↗</span></a></div></div></article>`;}
function favoriteEmpty(){return `<div class="empty-state"><span aria-hidden="true">♡</span><div><strong>把喜欢的小快乐，留在这里</strong><p>点击游戏卡片上的爱心，下次就能更快找到它。</p></div></div>`;}
function home(favoritesOnly=false){
  const id=dailyGame(today), game=byId[id], record=store.data.daily[today]?.[id];
  const recent=store.data.recent;
  const selected=games.filter(g=>homeFilter==='全部'||g.tag===homeFilter).sort((a,b)=>Number(Boolean(b.isNew))-Number(Boolean(a.isNew)));
  app.innerHTML=`<div class="page-container" id="main-content">${favoritesOnly?`<section class="favorites-section favorites-page"><div class="section-heading"><div><p class="eyebrow">YOUR LITTLE COLLECTION</p><h1>收藏的小快乐<span class="accent-dot">.</span></h1><p>喜欢的游戏，总要留个位置。</p></div><a class="text-button" href="#/">返回游乐场 ↗</a></div><div class="game-grid">${games.filter(g=>store.data.favorites.includes(g.id)).map(gameCard).join('')}</div>${store.data.favorites.length?'':favoriteEmpty()}</section>`:`
    <section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="little-spark">✳</span> 今天，也值得轻松一下</p><h1>给自己三分钟，<br><span>玩一点开心。</span></h1><p class="hero-description">暂时放下忙碌，来这里换换心情。<br>${games.length} 个小世界，随时欢迎你。</p><div class="hero-actions"><button class="button primary" data-random>随机来一局 <span aria-hidden="true">↗</span></button><a class="button secondary" href="#games">挑个喜欢的 <span aria-hidden="true">↓</span></a><button class="button secondary" data-install-app>添加到桌面</button></div><p class="hero-note"><span>●</span> 免登录 &nbsp;·&nbsp; 手机电脑都能玩</p><div class="offline-note" aria-live="polite"><span data-offline-status>正在准备离线游戏…</span><button class="text-button" data-offline-retry hidden>重新准备</button><small data-pwa-update hidden>新版本已准备好，关闭全部游乐场窗口后再次打开即可更新。</small></div></div><div class="hero-art">${art('hero')}</div></section>
    <section class="daily-section" id="daily"><div class="section-heading"><div><p class="eyebrow">A NEW LITTLE CHALLENGE</p><h2>每天，一点新鲜感<span class="accent-dot">.</span></h2></div><span class="section-side-note">北京时间 00:00 更新</span></div><div class="daily-card"><div class="daily-info"><div class="daily-meta"><span class="badge">✳ 每日挑战</span><span class="daily-date">${dateLabel(today)}</span></div><h3>今天，来玩${game.title}。</h3><p>相同的起点，不同的小惊喜。<br>看看今天的你，能创造怎样的纪录。</p><div class="daily-record">${record?`今日最佳：${resultText(id,record)}`:'今日挑战还没开始，第一份快乐留给你。'}</div><a class="button dark" href="${playLink(id,today)}">${record?'再挑战一次':'开始今日挑战'} <span aria-hidden="true">↗</span></a></div><div class="daily-art">${art(id,'daily')}<span class="daily-art-caption">${game.english} / DAILY ${String(Math.floor(Date.parse(today)/86400000)%1000).padStart(3,'0')}</span></div></div></section>
    ${recent.length?`<section class="recent-section"><div class="section-heading"><div><p class="eyebrow">PICK UP THE FUN</p><h2>再来一局？</h2></div><span class="section-side-note">最近玩过</span></div><div class="recent-list">${recent.map(id=>`<a class="recent-item" href="${playLink(id)}"><span class="recent-art art-${id}">${art(id)}</span><span class="recent-info"><strong>${byId[id].title}</strong><small>${resultText(id,store.data.best[id])}</small></span><span class="recent-play" aria-hidden="true">↗</span></a>`).join('')}</div></section>`:''}
    <section id="games" class="games-section"><div class="section-heading"><div><p class="eyebrow">SMALL GAMES, BIG SMILES</p><h2>挑一个，快乐出发<span class="accent-dot">.</span></h2><p>动动手，或者动动脑。跟着心情选就好。</p></div><div class="filter-bar" aria-label="游戏分类">${['全部','动手','动脑'].map(tag=>`<button class="filter-chip ${tag===homeFilter?'active':''}" data-filter="${tag}" aria-pressed="${tag===homeFilter}">${tag==='动手'?'✹ ':tag==='动脑'?'✧ ':''}${tag}</button>`).join('')}</div></div><div class="game-grid">${selected.map(gameCard).join('')}</div></section>
    <section class="favorites-section"><div class="section-heading"><div><p class="eyebrow">SAVED FOR ANOTHER HAPPY DAY</p><h2>我的小收藏<span class="accent-dot">.</span></h2></div>${store.data.favorites.length?'<a class="text-button" href="#/favorites">查看收藏 ↗</a>':''}</div>${store.data.favorites.length?`<div class="recent-list">${store.data.favorites.map(id=>`<a class="recent-item" href="${playLink(id)}"><span class="recent-art art-${id}">${art(id)}</span><span class="recent-info"><strong>${byId[id].title}</strong><small>${byId[id].duration}的小快乐</small></span><span class="recent-play" aria-hidden="true">↗</span></a>`).join('')}</div>`:favoriteEmpty()}</section>`}</div>`;
  pwa.sync();
}
app.addEventListener('click',event=>{
  const fav=event.target.closest('[data-favorite]');
  if(fav){store.toggleFavorite(fav.dataset.favorite);const route=parseRoute(location.hash,today);const scroll=window.scrollY;home(route.type==='favorites');window.scrollTo(0,scroll);return;}
  const filter=event.target.closest('[data-filter]');if(filter){homeFilter=filter.dataset.filter;const scroll=window.scrollY;home();window.scrollTo(0,scroll);return;}
  if(event.target.closest('[data-random]')){const random=new Uint32Array(1);crypto.getRandomValues(random);location.hash=playLink(games[random[0]%games.length].id);}
});

async function gamePage(route,token){
  const game=byId[route.id], date=route.date, historic=date&&date!==beijingDate();
  const record=date?store.data.daily[date]?.[game.id]:store.data.best[game.id];
  app.innerHTML=`<div class="page-container game-page" id="main-content"><div class="game-topline"><a class="back-link" href="#/">← 返回游乐场</a><span class="daily-tag">${date?`${historic?'历史':'每日'}挑战 · ${dateLabel(date)}`:'随心游玩'}</span></div><div class="game-heading"><p class="eyebrow">${game.english}</p><h1>${game.title}<span class="accent-dot">.</span></h1><p>${game.description}</p></div><div class="play-layout">${gameSurface(game)}<aside class="game-sidebar"><div class="side-card"><p class="eyebrow">HOW TO PLAY</p><h3>一点提示，马上出发</h3><ol class="rule-list">${game.rules.map(rule=>`<li>${rule}</li>`).join('')}</ol></div><div class="side-card best-card"><p class="eyebrow">${date?'DAILY BEST':'PERSONAL BEST'}</p><h3>${date?'当日最佳':'我的最佳'}</h3><p id="best-record">${resultText(game.id,record)}</p><small>记录保存在当前浏览器。</small></div>${date?`<div class="side-card challenge-note"><span class="badge">${historic?'历史挑战':'每日挑战'}</span><p>同一天，相同的起点。<br>可以反复挑战，刷新自己的纪录。</p><small>规则版本 ${RULE_VERSION} · 北京时间</small></div>`:''}<div class="side-card next-game-card"><p class="eyebrow">NEXT LITTLE ADVENTURE</p><h3>${games[(games.indexOf(game)+1)%games.length].title}</h3><a class="text-button" href="${playLink(games[(games.indexOf(game)+1)%games.length].id)}">换个心情 ↗</a></div></aside></div></div>`;
  const overlay=document.querySelector('#game-overlay');overlay.innerHTML='<div class="overlay-card"><p>正在打开小世界…</p></div>';
  let module;
  try{module=await loaders[game.id]();}catch{if(token===routeToken)overlay.innerHTML='<div class="overlay-card"><h2>游戏资源暂时未能加载</h2><p>请刷新页面后重试。</p><a class="button primary" href="#/">返回首页</a></div>';return;}
  if(token!==routeToken)return;
  let seed=date?dailySeed(date,game.id):crypto.getRandomValues(new Uint32Array(1))[0];
  let rankedRun=null,lastOnlineRun=null,localReason='',submissionController;
  active=mountGame({root:app,game,createGame:module.createGame,seed,sound,onToast:toast,readyHtml:`<div class="overlay-card"><div class="overlay-icon" aria-hidden="true">${game.icon||'✳'}</div><p class="eyebrow">${date?`${dateLabel(date)} · ${historic?'历史':'每日'}挑战`:'YOUR LITTLE BREAK STARTS HERE'}</p><h2>${game.title}</h2><p>${game.rules[0]}</p><button class="button primary" data-action="start">${game.cta} ↗</button><small class="ready-note">${game.controls}</small></div>`,
    onMount(signal){signal.addEventListener('abort',()=>submissionController?.abort(),{once:true});mountLeaderboard(app.querySelector('.game-sidebar'),{client:leaderboard,gameId:game.id,date,track,signal});},
    async onBeforeStart({overlay}){
      submissionController?.abort();rankedRun=null;localReason='休闲榜尚未开放，成绩继续保存在本机。';
      if(date&&date!==beijingDate())localReason='历史挑战仅供游玩和查看榜单，本局成绩保存在本机。';
      else if(leaderboard.enabled){
        overlay.hidden=false;overlay.innerHTML='<div class="overlay-card"><p role="status">正在连接休闲榜…</p><small>连接不可用时会自动进入本机游玩。</small></div>';
        try{rankedRun=await leaderboard.start({gameId:game.id,date,restartOf:date?undefined:lastOnlineRun?.id});seed=rankedRun.seed;lastOnlineRun=rankedRun;localReason='';}catch(error){localReason=error.message;}
      }
      return seed;
    },
    onStarted(){store.recent(game.id);track('game_start',{game_id:game.id,mode:date?'daily':'normal',rules_version:RULE_VERSION});},
    onFinish(result,{overlay}){
    const improved=store.record(game.id,result,date);document.querySelector('#best-record').textContent=resultText(game.id,date?store.data.daily[date]?.[game.id]:store.data.best[game.id]);
    const headline=result.won?'漂亮，这局完成了！':(game.failureHeadline||'这局的小快乐，已收好。');
    overlay.hidden=false;overlay.innerHTML=`<div class="overlay-card result-card"><p class="result-kicker">${date?`${dateLabel(date)} · ${date===beijingDate()?'每日':'历史'}挑战`:'NICE LITTLE BREAK'}</p><h2>${headline}</h2><div class="result-score">${resultText(game.id,result)}</div><p class="result-details">${improved?'✦ 创造了新的本机最佳纪录':'每一次尝试，都算数。'} · 用时 ${Math.ceil(result.elapsed)} 秒</p><div class="overlay-actions"><button class="button primary" data-action="again">再玩一次 ↻</button><button class="button secondary" data-action="share">分享成绩 ↗</button></div><div class="result-links"><a href="${playLink(games[(games.indexOf(game)+1)%games.length].id)}">下一款游戏 →</a><a href="#/">返回首页</a></div><div class="share-fallback" hidden></div></div>`;
    track('game_finish',{game_id:game.id,mode:date?'daily':'normal',rules_version:RULE_VERSION,score:result.score,elapsed:result.elapsed,won:result.won});
    submissionController=new AbortController();
    mountSubmission(overlay.querySelector('.result-card'),{client:leaderboard,run:rankedRun,gameId:game.id,result,reason:localReason,signal:submissionController.signal});
    },
    async onShare(lastResult,overlay){
    if(!lastResult)return;
    const url=new URL(location.href);url.hash=playLink(game.id,date);
    const text=`三分钟游乐场 · ${game.title}${date?`\n${date} ${date===beijingDate()?'每日':'历史'}挑战`:''}\n我的成绩：${resultText(game.id,lastResult)}\n来一起玩一局！`;
    try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(`${text}\n${url.href}`);toast('成绩和游戏链接已复制');return;}}catch{}
    const box=overlay.querySelector('.share-fallback');box.hidden=false;box.innerHTML='<label>复制以下成绩与链接<textarea readonly aria-label="分享成绩与链接"></textarea></label>';const area=box.querySelector('textarea');area.value=`${text}\n${url.href}`;area.focus();area.select();toast('请复制下方文字分享给朋友');
    }
  });
}
async function render(){
  const token=++routeToken;active?.destroy();active=null;
  const route=parseRoute(location.hash,today);
  document.body.classList.toggle('has-game',route.type==='play');
  if(location.hash==='#/daily'&&route.type==='play')history.replaceState(null,'',playLink(route.id,route.date));
  document.querySelectorAll('[data-nav]').forEach(el=>{const selected=(el.dataset.nav==='daily'&&route.type==='play'&&route.date)||(el.dataset.nav==='favorites'&&route.type==='favorites')||(el.dataset.nav==='home'&&route.type==='home');if(selected)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  document.title=route.type==='play'?`${byId[route.id].title}${route.date?' · 每日挑战':''} — 三分钟游乐场`:'三分钟游乐场 · 给快乐留点时间';
  if(route.type==='play')await gamePage(route,token);
  else if(route.type==='error')app.innerHTML=`<div class="page-container error-page" id="main-content"><h1>这个入口迷路了</h1><p>${escape(route.message)}</p><a class="button primary" href="#/">回到游乐场</a></div>`;
  else home(route.type==='favorites');
  if(token===routeToken){window.scrollTo({top:0,behavior:'instant'});app.focus({preventScroll:true});}
  pwa.sync();
}
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();app.focus({preventScroll:true});app.scrollIntoView({behavior:'instant'});});
window.addEventListener('hashchange',async()=>{await render();if(location.hash==='#games')document.querySelector('#games')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
setInterval(()=>{const date=beijingDate();if(date!==today){today=date;if(!active)render();else{const tag=document.querySelector('.daily-tag');const route=parseRoute(location.hash,date);if(tag&&route.date&&route.date!==date)tag.textContent=`历史挑战 · ${dateLabel(route.date)}`;}}},1000);
render();
