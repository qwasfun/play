async(page)=>{
  const context=page.context(),origin=new URL(page.url()).origin,api='http://127.0.0.1:8787',checks=[],errors=[];
  page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
  const check=(name,passed)=>{checks.push({name,passed:!!passed});if(!passed)throw Error(JSON.stringify(checks.at(-1)));};
  const profile=()=>page.evaluate(async api=>{const r=await fetch(api+'/v1/me',{credentials:'include'});return{status:r.status,...await r.json()};},api);
  async function open(id){await page.goto(origin+'/#/play/'+id);await page.reload();await page.locator('[data-action="start"]').waitFor();}
  async function start(){
    const response=page.waitForResponse(response=>response.url()===api+'/v1/runs'&&response.request().method()==='POST');
    await page.locator('[data-action="start"],[data-action="again"]').first().click();
    const run=(await(await response).json()).run;await page.waitForFunction(()=>!document.querySelector('#pause').disabled);return run;
  }
  async function clearMines(seed){
    const mines=await page.evaluate(async seed=>(await import('./games/mines.js')).generateMines(seed).mines,seed);
    await page.locator('canvas').scrollIntoViewIfNeeded();
    for(let cell=0;cell<16;cell++){
      if(await page.locator('.result-card').isVisible())break;
      if(mines.includes(cell))continue;
      const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+(108+(cell%4)*96+48)*box.width/600,box.y+(48+Math.floor(cell/4)*96+48)*box.height/480);
    }
    await page.locator('.result-card').waitFor();
  }
  await page.unroute('**/v1/runs/*/result');await page.unroute('**/v1/**');
  await page.evaluate(async()=>{
    for(const registration of await navigator.serviceWorker.getRegistrations())if(registration.scope===location.origin+'/')await registration.unregister();
    for(const name of await caches.keys())if(name.startsWith('three-minute-playground-offline:/'))await caches.delete(name);
  });
  await context.clearCookies();await page.setViewportSize({width:1280,height:900});await open('mines');
  await page.getByRole('button',{name:'查看排行榜 ↗',exact:true}).click();await page.getByLabel('我的昵称',{exact:true}).waitFor();
  const initial=await profile();check('anonymous_identity_created_without_form',initial.status===200&&initial.player.nickname.startsWith('游客·'));
  const cookies=await context.cookies(api);check('local_cookie_http_only_and_invisible_to_javascript',cookies.some(x=>x.name==='arcade_guest_dev'&&x.httpOnly)&&!await page.evaluate(()=>document.cookie.includes('arcade_guest')));
  await page.reload();await page.locator('[data-action="start"]').waitFor();check('identity_survives_reload',(await profile()).player.id===initial.player.id);
  await page.getByRole('button',{name:'查看排行榜 ↗',exact:true}).click();await page.getByLabel('我的昵称',{exact:true}).waitFor();
  await page.getByLabel('我的昵称',{exact:true}).fill('a');await page.getByRole('button',{name:'保存昵称',exact:true}).click();
  check('nickname_error_names_field_and_requirement',(await page.locator('.leaderboard-identity [role="status"]').textContent()).includes('昵称：请输入 2–12 个字符'));
  await page.getByLabel('我的昵称',{exact:true}).fill('<b>榜友</b>');await page.getByRole('button',{name:'保存昵称',exact:true}).click();await page.getByText('昵称已保存',{exact:true}).waitFor();
  const run=await start();await clearMines(run.seed);
  await page.waitForFunction(()=>document.querySelector('.rank-result')?.textContent.includes('第 '));
  check('real_game_completion_submits_to_d1',(await page.locator('#live-extra').textContent())==='已开 13 / 13');
  const receipt=await page.evaluate(async({api,run})=>{const r=await fetch(`${api}/v1/runs/${run.id}/result`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'});return await r.json();},{api,run});
  check('browser_retry_gets_original_receipt',receipt.accepted===1&&receipt.eligible===1&&receipt.rank>=1);
  await page.getByRole('button',{name:'查看榜单',exact:true}).click();await page.waitForFunction(()=>!!document.querySelector('.leaderboard-table .is-me'));
  check('nickname_is_rendered_as_text',(await page.locator('.leaderboard-table .is-me').textContent()).includes('<b>榜友</b>')&&await page.locator('.leaderboard-table .is-me b').count()===0);
  check('best_score_saved_locally',await page.evaluate(()=>!!JSON.parse(localStorage.getItem('tiny-break-arcade:v1')).best.mines));
  await page.screenshot({path:'output/playwright/leaderboard-desktop.png',fullPage:true});

  await page.setViewportSize({width:390,height:844});
  const response=page.waitForResponse(response=>response.url()===api+'/v1/runs'&&response.request().method()==='POST');
  await page.getByRole('button',{name:'再玩一次 ↻',exact:true}).click();const next=(await(await response).json()).run;
  await page.waitForFunction(()=>!document.querySelector('#pause').disabled);check('restart_keeps_same_puzzle',next.seed===run.seed);
  await page.route('**/v1/runs/*/result',route=>route.abort());await clearMines(next.seed);
  await page.getByRole('button',{name:'重试提交',exact:true}).waitFor();check('failed_submission_retains_local_result',(await page.locator('.rank-result').textContent()).includes('本机'));
  await page.getByRole('button',{name:'重试提交',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/leaderboard-mobile-retry.png',fullPage:true});
  await page.unroute('**/v1/runs/*/result');await page.getByRole('button',{name:'重试提交',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.rank-result')?.textContent.includes('第 '));
  check('retry_submission_recovers_without_replaying',await page.locator('.result-card').isVisible());

  await page.locator('.leaderboard-filters select').selectOption('daily');await page.waitForFunction(()=>document.querySelector('.leaderboard-status')?.textContent.includes('位玩家'));
  const yesterday=await page.evaluate(async()=>{const{beijingDate}=await import('./core.js');return beijingDate(Date.now()-86400000);});
  await page.getByLabel('榜单挑战日期',{exact:true}).fill(yesterday);await page.getByRole('button',{name:'查看榜单',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.leaderboard-status')?.textContent.includes('位玩家'));
  check('historical_daily_board_can_be_browsed',!await page.getByLabel('榜单挑战日期',{exact:true}).isHidden());
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/playwright/leaderboard-mobile.png',fullPage:true});
  check('mobile_board_has_no_horizontal_overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

  await page.waitForFunction(()=>[...document.querySelectorAll('[data-offline-status]')].some(n=>n.dataset.state==='ready'));
  await context.setOffline(true);
  try{
    await open('mines');await page.reload();await page.locator('[data-action="start"]').click();await page.waitForFunction(()=>!document.querySelector('#pause').disabled);
    await page.getByRole('button',{name:'Ⅱ 暂停',exact:true}).click();check('offline_game_still_starts_and_pauses',await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
    await page.getByRole('button',{name:'查看排行榜 ↗',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.leaderboard-status')?.textContent.includes('离线'));check('offline_board_has_actionable_message',true);
  }finally{await context.setOffline(false);}

  await open('mines');const oldId=(await profile()).player.id;await context.clearCookies();
  await page.getByRole('button',{name:'查看排行榜 ↗',exact:true}).click();await page.getByLabel('我的昵称',{exact:true}).waitFor();
  check('clearing_identity_creates_new_player',(await profile()).player.id!==oldId);
  check('old_public_record_remains',(await page.locator('.leaderboard-table').textContent()).includes('<b>榜友</b>'));
  const catalog=await page.evaluate(async()=>(await import('./catalog.js')).games);
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
    await page.setViewportSize(size);
    for(const game of catalog){await open(game.id);check(`${game.id}_${size.width}_sidebar_and_layout`,await page.locator('[aria-label="休闲排行榜"]').count()===1&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  }
  await page.route('**/v1/**',route=>route.abort());await open('mines');await page.locator('[data-action="start"]').click();await page.waitForFunction(()=>!document.querySelector('#pause').disabled);
  check('api_outage_falls_back_to_local_play',await page.locator('#game-overlay').isHidden());await page.unroute('**/v1/**');
  await open('mines');await page.route('**/v1/runs',async route=>{await new Promise(resolve=>setTimeout(resolve,250));await route.continue();});
  await page.locator('[data-action="start"]').click();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).waitFor();check('losing_focus_during_connection_starts_paused',true);await page.unroute('**/v1/runs');
  await page.setViewportSize({width:390,height:844});await page.goto(origin+'/#/');await page.reload();
  check('no_browser_runtime_errors',errors.length===0);return{passed:checks.length,checks};
}
