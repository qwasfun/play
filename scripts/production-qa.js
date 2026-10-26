async(page)=>{
  // Resolve QA imports through Vite's manifest; hashed output names are not API paths.
  const buildMap=await (await page.request.get(new URL('module-map.json',page.url()).href)).json();
  const qaModules={};
  for(const[key,entry]of Object.entries(buildMap)){
    if(key.endsWith('packages/game-registry/src/index.js'))qaModules['catalog.js']=entry.file;
    if(key.endsWith('packages/game-registry/src/core.js'))qaModules['core.js']=entry.file;
    const match=key.match(/(?:^|\/)games\/(\w+)\/src\/index\.js$/);if(match)qaModules['games/'+match[1]+'.js']=entry.file;
  }
  const installQaImports=map=>{
    window.__qaModules=map;
    window.__qaImport=specifier=>{
      const url=new URL(specifier,location.href),match=url.pathname.match(/games\/(\w+)\.js$/),key=match?'games/'+match[1]+'.js':url.pathname.split('/').pop();
      if(!map[key])throw Error('验收模块：未找到 '+key);
      return import(new URL(map[key],new URL('./',location.href)).href);
    };
  };
  await page.addInitScript(installQaImports,qaModules);await page.evaluate(installQaImports,qaModules);

  const origin='https://play.185036.xyz',api='https://api-play.185036.xyz',context=page.context(),checks=[],errors=[];
  if(new URL(page.url()).origin!==origin)throw Error('请在指定生产游戏网站的独立会话运行');
  page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  const check=(name,passed)=>{checks.push({name,passed:!!passed});if(!passed)throw Error(JSON.stringify(checks.at(-1)));};
  const profile=()=>page.evaluate(async api=>{const r=await fetch(api+'/v1/me',{credentials:'include'});return{status:r.status,...await r.json()};},api);
  await page.setViewportSize({width:390,height:844});await page.goto(origin+'/#/play/mines');await page.locator('[data-action="start"]').waitFor();
  await page.getByRole('button',{name:'查看排行榜 ↗',exact:true}).click();await page.getByLabel('我的昵称',{exact:true}).waitFor();
  const first=await profile();check('anonymous_identity_created',first.status===200&&!!first.player.id);
  const cookies=await context.cookies(api);check('production_cookie_is_secure_http_only_strict',cookies.some(c=>c.name==='__Host-arcade_guest'&&c.httpOnly&&c.secure&&c.sameSite==='Strict'));
  check('cookie_not_readable_by_javascript',!await page.evaluate(()=>document.cookie.includes('arcade_guest')));
  await page.reload();await page.locator('[data-action="start"]').waitFor();check('identity_survives_refresh',(await profile()).player.id===first.player.id);
  await page.getByRole('button',{name:'查看排行榜 ↗',exact:true}).click();await page.getByLabel('我的昵称',{exact:true}).waitFor();
  await page.getByLabel('我的昵称',{exact:true}).fill('a');await page.getByRole('button',{name:'保存昵称',exact:true}).click();
  check('specific_nickname_error',(await page.locator('.leaderboard-identity [role="status"]').textContent()).includes('昵称：请输入 2–12 个字符'));
  await page.getByLabel('我的昵称',{exact:true}).fill('上线验收');await page.getByRole('button',{name:'保存昵称',exact:true}).click();await page.getByText('昵称已保存',{exact:true}).waitFor();
  check('nickname_saved',(await profile()).player.nickname==='上线验收');
  const started=page.waitForResponse(r=>r.url()===api+'/v1/runs'&&r.request().method()==='POST');
  await page.locator('[data-action="start"]').click();const startResponse=await started;
  check('production_run_created',startResponse.status()===201);const run=(await startResponse.json()).run;
  await page.waitForFunction(()=>!document.querySelector('#pause').disabled);
  const mines=await page.evaluate(async seed=>(await window.__qaImport('./games/mines.js')).generateMines(seed).mines,run.seed);
  const submitted=page.waitForResponse(r=>r.url()===`${api}/v1/runs/${run.id}/result`&&r.request().method()==='POST');
  await page.locator('canvas').scrollIntoViewIfNeeded();
  for(let cell=0;cell<16;cell++){
    if(await page.locator('.result-card').isVisible())break;if(mines.includes(cell))continue;
    const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+(108+cell%4*96+48)*box.width/600,box.y+(48+Math.floor(cell/4)*96+48)*box.height/480);
  }
  await page.locator('.result-card').waitFor();const submittedResponse=await submitted,receipt=await submittedResponse.json();
  check('real_completed_game_accepted',submittedResponse.status()===200&&!!receipt.accepted&&!!receipt.eligible);
  await page.waitForFunction(()=>document.querySelector('.rank-result')?.textContent.includes('第 '));
  check('result_shows_rank',await page.locator('.rank-result').isVisible());
  await page.getByRole('button',{name:'查看榜单',exact:true}).click();await page.waitForFunction(()=>!!document.querySelector('.leaderboard-table .is-me'));
  check('public_board_shows_own_score',(await page.locator('.leaderboard-table .is-me').textContent()).includes('上线验收'));
  const score=Number(await page.locator('#live-score').textContent());
  check('local_score_saved',await page.evaluate(score=>JSON.parse(localStorage.getItem('tiny-break-arcade:v1')).best.mines.score===score,score));
  await page.screenshot({path:'output/playwright/production-leaderboard.png',fullPage:true});
  const duplicate=await page.evaluate(async({api,id})=>{const r=await fetch(`${api}/v1/runs/${id}/result`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'});return{status:r.status,receipt:await r.json()};},{api,id:run.id});
  check('production_retry_is_idempotent',duplicate.status===200&&JSON.stringify(duplicate.receipt)===JSON.stringify(receipt));
  await page.locator('.leaderboard-filters select').selectOption('daily');await page.waitForFunction(()=>document.querySelector('.leaderboard-status')?.textContent.includes('位玩家'));
  check('daily_board_loads',true);
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-offline-status]')].some(n=>n.dataset.state==='ready'),{},{timeout:30000});
  await context.setOffline(true);
  try{
    await page.reload();await page.locator('[data-action="start"]').click();await page.waitForFunction(()=>!document.querySelector('#pause').disabled);
    await page.getByRole('button',{name:'Ⅱ 暂停',exact:true}).click();check('production_offline_game_plays',await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
    check('offline_score_preserved',await page.evaluate(score=>JSON.parse(localStorage.getItem('tiny-break-arcade:v1')).best.mines.score===score,score));
  }finally{await context.setOffline(false);}
  check('no_runtime_errors',errors.length===0);return{origin,api,passed:checks.length,checks,playerId:first.player.id,runId:run.id,score};
}
