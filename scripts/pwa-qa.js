async(page)=>{
  const base=new URL('./',page.url()),origin=base.origin,context=page.context(),checks=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{
    const original=crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues=array=>{if(array instanceof Uint32Array&&array.length===1){array[0]=123;return array;}return original(array);};
  });
  const check=(name,passed,details={})=>{checks.push({name,passed:!!passed,...details});if(!passed)throw Error(JSON.stringify(checks.at(-1)));};
  const cdp=await context.newCDPSession(page);
  const url=hash=>base.href+hash;
  let offline=false,installability={};
  async function network(value){
    await context.setOffline(value);
    // Keep the explicit CDP session used for cache/manifest diagnostics in
    // the same network mode across full document navigations as Playwright.
    await cdp.send('Network.emulateNetworkConditions',{offline:value,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    offline=value;
  }
  async function activate(locator){if(await page.evaluate(()=>navigator.maxTouchPoints>0))await locator.tap();else await locator.click();}
  async function tapCanvas(x,y){const r=await page.locator('canvas').boundingBox();const p={x:r.x+x*r.width/600,y:r.y+y*r.height/480};if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
  const score=async()=>Number(await page.locator('#live-score').textContent());
  async function ready(){await page.waitForFunction(()=>[...document.querySelectorAll('[data-offline-status]')].some(node=>node.dataset.state==='ready'),{},{timeout:30000});}
  try{
    await cdp.send('Network.enable');await network(false);await page.setViewportSize({width:390,height:844});
    // Use a dedicated browser session. Remove only this app's offline copies,
    // preserving local scores, so an older test release cannot mask the result.
    await page.evaluate(async scope=>{
      for(const registration of await navigator.serviceWorker.getRegistrations())if(registration.scope===scope)await registration.unregister();
      const prefix='three-minute-playground-offline:'+new URL(scope).pathname+':';
      for(const name of await caches.keys())if(name.startsWith(prefix))await caches.delete(name);
    },base.href);
    await page.goto(url('#/'));await page.reload();await ready();
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    const cold=await page.evaluate(()=>({imports:performance.getEntriesByType('resource').filter(entry=>entry.initiatorType==='script'&&/\/games\/[^/]+\.js(?:\?|$)/.test(entry.name)).map(entry=>entry.name),status:[...document.querySelectorAll('[data-offline-status]')].find(node=>node.dataset.state==='ready')?.textContent}));
    check('homepage_prepared_without_opening_a_game',cold.imports.length===0&&cold.status.includes('20'),cold);
    const catalog=await page.evaluate(async base=>{const{games}=await import(new URL('catalog.js',base));return games;},base.href);
    const cached=await page.evaluate(async()=>{
      const registration=await navigator.serviceWorker.ready;
      const status=await new Promise((resolve,reject)=>{const channel=new MessageChannel(),timer=setTimeout(()=>reject(Error('status timeout')),5000);channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};registration.active.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);});
      const names=await caches.keys(),name=names.find(value=>value.endsWith(status.version));
      const entries=name?(await(await caches.open(name)).keys()).map(request=>new URL(request.url).pathname):[];
      return{...status,name,entries,games:entries.filter(path=>/\/games\/[^/]+\.js$/.test(path)).length};
    });
    check('active_worker_confirms_all_twenty_modules_cached',cached.ready===true&&cached.games===20&&cached.assetCount>=32,{version:cached.version,assetCount:cached.assetCount,gameModules:cached.games});
    try{await cdp.send('Page.enable');installability=await cdp.send('Page.getInstallabilityErrors');}catch(error){installability={unavailable:String(error.message||error)};}
    try{const manifest=await cdp.send('Page.getAppManifest');installability.manifest={url:manifest.url,errors:manifest.errors};}catch(error){installability.manifestUnavailable=String(error.message||error);}

    // Exercise the native-prompt branch with a dismissed mock, never install an
    // application on the host computer during automated verification.
    const prevented=await page.evaluate(()=>{
      window.__pwaMockPromptCalls=0;const event=new Event('beforeinstallprompt',{cancelable:true});
      Object.defineProperties(event,{prompt:{value:async()=>{window.__pwaMockPromptCalls++;}},userChoice:{value:Promise.resolve({outcome:'dismissed',platform:'web'})}});
      window.dispatchEvent(event);return event.defaultPrevented;
    });
    await activate(page.locator('[data-install-app]').first());
    await page.waitForFunction(()=>window.__pwaMockPromptCalls===1);
    check('install_prompt_branch_is_user_activated_and_dismissible',prevented&&await page.evaluate(()=>window.__pwaMockPromptCalls===1)&&!await page.locator('[data-install-app]').first().isDisabled(),{simulated:true,actuallyInstalled:false});
    await activate(page.locator('[data-install-app]').first());await page.locator('#install-guide').waitFor({state:'visible'});
    check('manual_install_guide_explains_offline_readiness',(await page.locator('#install-offline-note').textContent()).includes('20')&&(await page.locator('#install-steps li').count())>=2);
    await page.screenshot({path:'output/playwright/pwa-guide.png'});
    await activate(page.getByRole('button',{name:'知道了',exact:true}));
    await page.evaluate(()=>{window.__pwaUserAgentDescriptor=Object.getOwnPropertyDescriptor(navigator,'userAgent');Object.defineProperty(navigator,'userAgent',{configurable:true,value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1'});});
    await activate(page.locator('[data-install-app]').first());await page.locator('#install-guide').waitFor({state:'visible'});
    check('ios_manual_guide_has_safari_and_home_screen_steps',(await page.locator('#install-steps').textContent()).includes('Safari')&&(await page.locator('#install-steps').textContent()).includes('添加到主屏幕'),{simulatedUserAgent:true,physicalDevice:false});
    await activate(page.getByRole('button',{name:'知道了',exact:true}));
    await page.evaluate(()=>{const original=window.__pwaUserAgentDescriptor;if(original)Object.defineProperty(navigator,'userAgent',original);else delete navigator.userAgent;});
    await page.screenshot({path:'output/playwright/pwa-home.png'});

    await cdp.send('Network.enable');await cdp.send('Network.clearBrowserCache');
    await network(true);
    await page.waitForFunction(()=>navigator.onLine===false);
    check('network_is_really_unavailable',await page.evaluate(async()=>{try{await fetch(new URL('__pwa_network_probe__',location.href),{cache:'no-store'});return false;}catch{return true;}}));
    const manifestAssets=await page.evaluate(async()=>{
      const manifestUrl=document.querySelector('link[rel="manifest"]').href,response=await fetch(manifestUrl,{cache:'no-store'}),manifest=await response.json();
      const sources=manifest.icons.map(icon=>({url:new URL(icon.src,manifestUrl).href,expected:icon.sizes,purpose:icon.purpose}));
      sources.push({url:document.querySelector('link[rel="apple-touch-icon"]').href,expected:'180x180',purpose:'apple'});
      const icons=[];
      for(const source of sources){const imageResponse=await fetch(source.url,{cache:'no-store'}),bitmap=await createImageBitmap(await imageResponse.blob());icons.push({...source,width:bitmap.width,height:bitmap.height,ok:imageResponse.ok,type:imageResponse.headers.get('Content-Type')});bitmap.close();}
      return{manifest,icons,manifestOk:response.ok,manifestUrl,appleCapable:document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content};
    });
    check('manifest_is_available_offline_and_uses_standalone_scope',manifestAssets.manifestOk&&manifestAssets.manifest.display==='standalone'&&manifestAssets.manifest.orientation==='any'&&new URL(manifestAssets.manifest.scope,manifestAssets.manifestUrl).href===base.href&&new URL(manifestAssets.manifest.start_url,manifestAssets.manifestUrl).origin===origin);
    check('all_four_png_icons_decode_offline',manifestAssets.icons.length===4&&manifestAssets.icons.every(icon=>icon.ok&&icon.expected===`${icon.width}x${icon.height}`&&/image\/png/i.test(icon.type))&&manifestAssets.icons.some(icon=>icon.purpose==='maskable')&&manifestAssets.appleCapable==='yes',{icons:manifestAssets.icons.map(({expected,purpose,width,height})=>({expected,purpose,width,height}))});

    for(const game of catalog){
      await page.goto(url(`#/play/${game.id}`));const navigation=await page.reload();
      await page.locator('[data-action="start"]').waitFor({state:'visible'});
      check(`${game.id}_direct_reload_loads_offline_module`,navigation?.fromServiceWorker()===true&&(await page.locator('canvas').getAttribute('width'))==='600'&&await page.locator('.overlay-card h2').textContent()===game.title);
      await activate(page.locator('[data-action="start"]'));await tapCanvas(300,240);
      await activate(page.getByRole('button',{name:'Ⅱ 暂停',exact:true}));await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).waitFor();
      await activate(page.getByRole('button',{name:'↻ 重开',exact:true}));
      await activate(page.getByRole('button',{name:'重新开始',exact:true}));
      await page.locator('#game-overlay').waitFor({state:'hidden'});
      const restarted={disabled:await page.locator('#pause').isDisabled(),overlayVisible:await page.locator('#game-overlay').isVisible(),online:await page.evaluate(()=>navigator.onLine),blocked:await page.evaluate(async()=>{try{await fetch(new URL('__pwa_uncached_probe__?t='+Math.random(),location.href),{cache:'no-store'});return false;}catch{return true;}})};
      check(`${game.id}_starts_pauses_and_restarts_offline`,!restarted.disabled&&!restarted.overlayVisible&&restarted.online===false&&restarted.blocked,restarted);
      await activate(page.getByRole('button',{name:'Ⅱ 暂停',exact:true}));
    }

    await page.goto(url('#/'));await page.reload();await ready();
    for(const game of catalog){const favorite=page.getByLabel('收藏'+game.title,{exact:true});if(await favorite.count())await activate(favorite);}
    await page.goto(url('#/favorites'));await page.reload();
    check('all_twenty_favorites_persist_through_offline_reload',await page.locator('.game-card').count()===20);

    await page.goto(url('#/play/mines'));await page.reload();await page.locator('[data-action="start"]').waitFor();
    await activate(page.getByRole('button',{name:'全屏游戏',exact:true}));await page.locator('.play-main.is-fullscreen').waitFor();
    await activate(page.locator('[data-action="start"]'));await tapCanvas(156,96);
    const progressed=await score(),mode=await page.locator('.play-main').getAttribute('data-fullscreen-mode');
    check('offline_game_works_in_fullscreen',progressed>0&&(mode==='native'||mode==='immersive'),{mode});
    await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).waitFor();
    check('offline_rotation_preserves_game_progress',await score()===progressed);
    await activate(page.getByRole('button',{name:'继续游戏 ▶',exact:true}));
    const mines=await page.evaluate(async base=>{const{generateMines}=await import(new URL('games/mines.js',base));return generateMines(123).mines;},base.href);
    for(let cell=0;cell<16;cell++)if(!mines.includes(cell)){
      if(await page.locator('.result-card').isVisible())break;
      await tapCanvas(156+cell%4*96,96+Math.floor(cell/4)*96);
    }
    await page.locator('.result-card').waitFor();const best=await score();
    check('offline_mines_can_complete_a_real_round',best>=400&&(await page.locator('#live-extra').textContent())==='已开 13 / 13',{score:best});
    await activate(page.getByRole('button',{name:'退出全屏',exact:true}));await page.reload();
    check('offline_high_score_survives_reload',(await page.locator('#best-record').textContent()).includes(String(best)));

    const challenge=await page.evaluate(async base=>{const{beijingDate,dailyGame,playLink}=await import(new URL('core.js',base));const date=beijingDate(Date.now()-86400000),id=dailyGame(date);return{date,id,link:playLink(id,date)};},base.href);
    await page.goto(url(challenge.link));await page.reload();await page.locator('[data-action="start"]').waitFor();
    const firstBoard=await page.locator('canvas').evaluate(canvas=>canvas.toDataURL());
    await page.reload();await page.locator('[data-action="start"]').waitFor();
    check('historical_daily_link_reopens_same_board_offline',page.url().includes(challenge.date)&&(await page.locator('.daily-tag').textContent()).includes('历史挑战')&&firstBoard===await page.locator('canvas').evaluate(canvas=>canvas.toDataURL()),challenge);

    await network(false);await page.goto(url('#/'));await page.reload();await ready();
    check('returning_online_keeps_ready_state_and_collection',await page.evaluate(()=>navigator.onLine===true)&&await page.locator('.game-card').count()===20);
    const damaged=await page.evaluate(async({name,base})=>{
      const cache=await caches.open(name),target=new URL('games/star.js',base).href;
      const removed=await cache.delete(target),marker=await cache.match(new URL('__offline_complete__',base));
      window.dispatchEvent(new Event('online'));return{removed,markerStillPresent:!!marker};
    },{name:cached.name,base:base.href});
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-offline-status]')].some(node=>node.dataset.state==='error'));
    check('missing_module_invalidates_ready_even_with_complete_marker',damaged.removed&&damaged.markerStillPresent&&await page.locator('[data-offline-retry]').first().isVisible(),damaged);
    await activate(page.locator('[data-offline-retry]').first());await ready();
    const repaired=await page.evaluate(async({name,base})=>!!await(await caches.open(name)).match(new URL('games/star.js',base).href),{name:cached.name,base:base.href});
    check('retry_prepares_the_complete_collection_again',repaired);
    await cdp.send('Network.clearBrowserCache');await network(true);
    await page.goto(url('#/play/star'));const repairedNavigation=await page.reload();await page.locator('[data-action="start"]').waitFor();
    await activate(page.locator('[data-action="start"]'));await activate(page.getByRole('button',{name:'Ⅱ 暂停',exact:true}));
    check('repaired_module_plays_after_network_is_disabled_again',repairedNavigation?.fromServiceWorker()===true&&await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
    await network(false);await page.goto(url('#/'));await page.reload();await ready();
    check('no_page_runtime_errors',errors.length===0,{errors});
    return{origin,base:base.href,passed:checks.length,checks,installability,offlineVersion:cached.version,actuallyInstalled:false,phoneValidation:'Chromium touch simulation; no physical iOS or Android device'};
  }finally{if(offline)await network(false).catch(()=>{});await cdp.detach().catch(()=>{});}
}
