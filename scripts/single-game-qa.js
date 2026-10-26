async(page)=>{
  if(new URL(page.url()).port!=='5173')throw Error('独立预览验收：请打开目标游戏开发服务');
  const checks=[],errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
  const check=(name,passed)=>{checks.push({name,passed:!!passed});if(!passed)throw Error(JSON.stringify(checks.at(-1)));};
  await page.clock.install();await page.reload();await page.setViewportSize({width:390,height:844});
  await page.locator('[data-action="start"]').waitFor();
  await page.evaluate(()=>localStorage.setItem('tiny-break-arcade:v1','{"keep":"production-records"}'));
  check('single_game_title',await page.title()==='星轨邮差 · 独立预览');
  await page.locator('[data-action="start"]').tap();await page.locator('#game-overlay').waitFor({state:'hidden'});
  await page.locator('#pause').tap();check('shared_runtime_pauses',await page.locator('[data-action="resume"]').isVisible());
  await page.locator('#fullscreen-toggle').tap();check('shared_runtime_enters_fullscreen',await page.locator('.play-main').evaluate(node=>node.classList.contains('is-fullscreen')));
  await page.locator('#fullscreen-toggle').tap();await page.locator('[data-action="resume"]').tap();
  await page.clock.runFor(61000);await page.locator('.result-card').waitFor();
  const storage=await page.evaluate(()=>({production:localStorage.getItem('tiny-break-arcade:v1'),development:JSON.parse(localStorage.getItem('tiny-break-arcade:dev:star'))}));
  check('game_completes_and_saves_only_development_record',storage.production==='{"keep":"production-records"}'&&typeof storage.development?.score==='number');
  const engines=[...new Set(requests.flatMap(url=>url.match(/\/games\/(\w+)\/src\//)?.[1]||[]))];
  check('only_target_game_loaded',engines.length===1&&engines[0]==='star');
  check('no_leaderboard_or_analytics_requests',!requests.some(url=>/:8787|umami/i.test(url)));
  check('no_service_worker_registered',await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length===0));
  check('no_runtime_errors',errors.length===0);
  await page.screenshot({path:'output/playwright/single-game-star.png',fullPage:true});
  return {passed:checks.length,checks,engines};
}
