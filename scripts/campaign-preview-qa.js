async(page)=>{
  if(new URL(page.url()).port!=='5173')throw Error('独立预览验收：请打开灯塔方阵开发服务');
  const checks=[],requests=[],errors=[];const check=(name,passed)=>{checks.push({name,passed:!!passed});if(!passed)throw Error(name);};
  page.on('request',request=>requests.push(request.url()));page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:900,height:1200});await page.clock.install();await page.reload();await page.locator('#preview-level').waitFor();
  check('preview_offers_twenty_levels_and_original_mode',await page.locator('#preview-level option').count()===21);
  await page.evaluate(()=>{localStorage.setItem('tiny-break-arcade:v1','{"keep":"ordinary"}');localStorage.setItem('tiny-break-arcade:campaign:v1','{"keep":"campaign"}');});
  await page.locator('#preview-level').selectOption('20');await page.locator('[data-action="start"]').waitFor();check('preview_uses_square_unlimited_canvas',await page.locator('canvas').getAttribute('height')==='600'&&(await page.locator('.game-toolbar').textContent()).includes('已用时间'));
  await page.locator('[data-action="start"]').click();await page.locator('#game-overlay').waitFor({state:'hidden'});await page.clock.runFor(182000);
  check('real_runtime_continues_beyond_three_minutes',Number((await page.locator('#live-time').textContent()).replace(/\D/g,''))>=181&&await page.locator('.result-card').count()===0);
  await page.locator('#pause').click();const paused=await page.locator('#live-time').textContent();await page.clock.runFor(10000);check('paused_time_is_not_counted',await page.locator('#live-time').textContent()===paused);await page.locator('[data-action="resume"]').click();
  const definitionUrl=requests.find(url=>/\/games\/lights\/src\/campaign\.js/.test(url));if(!definitionUrl)throw Error('独立预览：未观察到关卡模块');const level=await page.evaluate(async url=>(await import(url)).campaign.levels[19],definitionUrl);
  for(const cell of level.solution){const rect=await page.locator('canvas').boundingBox();await page.mouse.click(rect.x+(20+(cell%5+.5)*560/5)*rect.width/600,rect.y+(20+(Math.floor(cell/5)+.5)*560/5)*rect.height/600);}
  await page.locator('.result-card').waitFor();const storage=await page.evaluate(()=>({ordinary:localStorage.getItem('tiny-break-arcade:v1'),campaign:localStorage.getItem('tiny-break-arcade:campaign:v1'),debug:JSON.parse(localStorage.getItem('tiny-break-arcade:dev:lights:campaign:v1:20'))}));
  check('campaign_preview_saves_only_debug_record',storage.ordinary==='{"keep":"ordinary"}'&&storage.campaign==='{"keep":"campaign"}'&&storage.debug.won&&storage.debug.elapsed>180);
  await page.locator('#preview-level').selectOption('0');check('original_preview_keeps_old_dimensions',await page.locator('canvas').getAttribute('height')==='480');const engines=[...new Set(requests.flatMap(url=>url.match(/\/games\/(\w+)\/src\//)?.[1]||[]))];check('only_target_game_is_loaded',engines.length===1&&engines[0]==='lights');check('no_online_services_or_worker',!requests.some(url=>/:8787|umami/i.test(url))&&await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length===0));check('no_runtime_errors',errors.length===0);return{passed:checks.length,checks};
}
