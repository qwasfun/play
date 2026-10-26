async(page)=>{
  const context=page.context(),origin=new URL(page.url()).origin,checks=[],errors=[];
  const check=(name,passed,extra={})=>{checks.push({name,passed:!!passed,...extra});if(!passed)throw Error(JSON.stringify(checks.at(-1)));};
  const observe=target=>{target.setDefaultTimeout(15000);target.on('pageerror',error=>errors.push(error.message));};
  observe(page);
  const releases=await page.evaluate(async()=>{const response=await fetch('/__qa__/releases');return response.json();});
  if(releases.kind!=='playground-pwa-update-qa'||!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('This check requires the isolated pwa-update-server fixture');
  const prefix='three-minute-playground-offline:/:';
  // A dedicated fixture origin may have residue from an interrupted test.
  await page.evaluate(async cachePrefix=>{
    for(const registration of await navigator.serviceWorker.getRegistrations())await registration.unregister();
    for(const name of await caches.keys())if(name.startsWith(cachePrefix))await caches.delete(name);
  },prefix);
  await context.addInitScript(()=>{
    const original=crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues=array=>{if(array instanceof Uint32Array&&array.length===1){array[0]=123;return array;}return original(array);};
  });
  await page.evaluate(()=>fetch('/__qa__/release',{method:'POST',body:'A'}));
  await page.goto(origin+'/#/');await page.reload();
  const ready=target=>target.locator('[data-offline-status][data-state="ready"]').first().waitFor();
  const status=target=>target.evaluate(async()=>{
    const registration=await navigator.serviceWorker.ready;
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel(),timer=setTimeout(()=>reject(Error('worker status timeout')),5000);
      channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};
      registration.active.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);
    });
  });
  await ready(page);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const first=await status(page);
  check('release_A_is_fully_ready',first.ready&&first.version===releases.A.version,first);
  const favorite=page.getByRole('button',{name:'收藏星轨邮差',exact:true});if(await favorite.count())await favorite.click();
  await page.goto(origin+'/#/play/mines');await page.locator('[data-action="start"]').click();
  const mines=await page.evaluate(async()=>{const{generateMines}=await import('./games/mines.js');return generateMines(123).mines;});
  let selected=0;
  for(let cell=0;cell<16;cell++)if(!mines.includes(cell)){
    while(selected%4!==cell%4){await page.locator('canvas').press('ArrowRight');selected=Math.floor(selected/4)*4+(selected%4+1)%4;}
    while(Math.floor(selected/4)!==Math.floor(cell/4)){await page.locator('canvas').press('ArrowDown');selected=(selected+4)%16;}
    await page.locator('canvas').press('Space');if(await page.locator('.result-card').isVisible())break;
  }
  await page.locator('.result-card').waitFor();
  check('release_A_saves_a_real_game_result',Number(await page.locator('#live-score').textContent())>=400);
  await page.getByRole('button',{name:'再玩一次 ↻',exact:true}).click();await page.locator('canvas').press('Space');
  await page.getByRole('button',{name:'Ⅱ 暂停',exact:true}).click();
  const pausedScore=await page.locator('#live-score').textContent();
  const saved=await page.evaluate(()=>{window.__pwaProbe='release-A-game-still-here';return localStorage.getItem('tiny-break-arcade:v1');});
  const record=JSON.parse(saved);
  check('favorite_and_best_exist_before_update',record.favorites.includes('star')&&record.best.mines.won===true&&Number(pausedScore)>0);
  await page.evaluate(async()=>{const unrelated=await caches.open('pwa-update-unrelated');await unrelated.put('/__qa__/keep',new Response('keep me'));});
  const home=await context.newPage();observe(home);await home.goto(origin+'/#/');await ready(home);
  await home.evaluate(()=>fetch('/__qa__/release',{method:'POST',body:'B'}));
  await home.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
  await home.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting);
  await home.locator('[data-pwa-update]').waitFor({state:'visible'});
  check('release_B_waits_with_a_visible_notice',await home.locator('[data-pwa-update]').isVisible());
  const active=await status(page);
  check('waiting_update_does_not_replace_active_A',active.ready&&active.version===releases.A.version,active);
  check('waiting_update_does_not_reload_or_reset_game',await page.evaluate(()=>window.__pwaProbe)==='release-A-game-still-here'&&await page.locator('#live-score').textContent()===pausedScore&&await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  const both=await page.evaluate(()=>caches.keys());
  check('complete_A_and_B_caches_coexist',both.includes(prefix+releases.A.version)&&both.includes(prefix+releases.B.version),{caches:both});
  await context.setOffline(true);
  await page.reload();await page.locator('[data-action="start"]').waitFor();
  const stillA=await status(page);
  check('A_can_reload_a_game_while_offline_and_B_waits',stillA.ready&&stillA.version===releases.A.version);
  await page.goto(origin+'/?offline-update-check=1#/play/tower');await page.locator('[data-action="start"]').waitFor();
  check('A_opens_an_unplayed_game_offline',(await page.title()).includes('叠叠高塔'));
  check('offline_A_keeps_stored_progress',await page.evaluate(()=>localStorage.getItem('tiny-break-arcade:v1'))===saved);
  await Promise.all(context.pages().map(target=>target.close()));
  await new Promise(resolve=>setTimeout(resolve,400));
  const reopened=await context.newPage();observe(reopened);await reopened.goto(origin+'/#/');await ready(reopened);
  const second=await status(reopened);
  check('B_naturally_activates_after_all_old_windows_close',second.ready&&second.version===releases.B.version,second);
  const remaining=await reopened.evaluate(()=>caches.keys());
  check('activation_only_removes_the_old_scope_cache',!remaining.includes(prefix+releases.A.version)&&remaining.includes(prefix+releases.B.version)&&remaining.includes('pwa-update-unrelated'),{caches:remaining});
  check('B_keeps_favorites_and_best_after_offline_reopen',await reopened.evaluate(()=>localStorage.getItem('tiny-break-arcade:v1'))===saved&&await reopened.getByRole('button',{name:'取消收藏星轨邮差',exact:true}).count()===1);
  check('no_runtime_errors_during_update',errors.length===0,{errors});
  await context.setOffline(false);
  return{origin,passed:checks.length,releaseA:releases.A.version,releaseB:releases.B.version,checks};
}
