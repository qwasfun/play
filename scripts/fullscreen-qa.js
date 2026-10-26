async(page)=>{
  const origin=new URL(page.url()).origin,checks=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
  const check=(name,passed,extra={})=>{checks.push({name,passed:!!passed,...extra});if(!passed)throw Error(JSON.stringify(checks.at(-1)));};
  const open=async id=>{await page.goto(origin+`/#/play/${id}`);await page.locator('[data-action="start"]').waitFor();};
  const full=()=>page.locator('.play-main.is-fullscreen');
  await page.setViewportSize({width:390,height:844});await open('rings');
  await page.getByRole('button',{name:'全屏游戏',exact:true}).tap();await full().waitFor();
  const native=await page.evaluate(()=>({enabled:document.fullscreenEnabled,mode:document.querySelector('.play-main').dataset.fullscreenMode,native:document.fullscreenElement===document.querySelector('.play-main')}));
  check('user_touch_enters_fullscreen',native.mode==='native'||native.mode==='immersive',native);
  check('native_api_used_when_available',!native.enabled||native.native,native);
  await page.locator('[data-action="start"]').tap();await page.waitForTimeout(120);
  await page.getByRole('button',{name:'退出全屏',exact:true}).tap();await full().waitFor({state:'detached'});
  check('exit_retains_session_and_pauses',await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  await page.getByRole('button',{name:'全屏游戏',exact:true}).press('Enter');await full().waitFor();
  if(await page.evaluate(()=>!!document.fullscreenElement))await page.evaluate(()=>document.exitFullscreen());
  else await page.keyboard.press('Escape');
  await full().waitFor({state:'detached'});
  check('external_native_exit_syncs_button',await page.getByRole('button',{name:'全屏游戏',exact:true}).getAttribute('aria-pressed')==='false');

  // Force the exact path used when a phone or embedded page blocks native fullscreen.
  await page.addInitScript(()=>Object.defineProperty(document,'fullscreenEnabled',{get:()=>false,configurable:true}));
  await page.reload();await page.locator('[data-action="start"]').waitFor();
  await page.getByRole('button',{name:'全屏游戏',exact:true}).tap();await full().waitFor();
  check('unsupported_native_uses_page_fullscreen',await full().getAttribute('data-fullscreen-mode')==='immersive');
  await page.keyboard.press('Escape');await full().waitFor({state:'detached'});
  check('escape_exits_page_fullscreen',!await page.evaluate(()=>document.body.classList.contains('has-fullscreen-game')));
  const games=await page.evaluate(async()=>{const{games}=await import('./catalog.js');return games.map(g=>g.id);});
  const sizes=[[375,812],[812,375],[390,844],[844,390],[320,568],[568,320],[768,1024],[1440,900]];
  let layouts=0;
  for(const [width,height] of sizes){
    await page.setViewportSize({width,height});
    for(const id of games){
      await open(id);await page.getByRole('button',{name:'全屏游戏',exact:true}).tap();await full().waitFor();
      const metrics=await page.evaluate(()=>{
        const r=el=>{const{x,y,width,height,right,bottom}=el.getBoundingClientRect();return{x,y,width,height,right,bottom};};
        return{width:innerWidth,height:innerHeight,canvas:r(document.querySelector('canvas')),controls:[...document.querySelectorAll('.game-controls .button')].map(r),start:r(document.querySelector('[data-action="start"]')),scrollWidth:document.documentElement.scrollWidth};
      });
      const within=r=>r.x>=-1&&r.y>=-1&&r.right<=metrics.width+1&&r.bottom<=metrics.height+1;
      const valid=within(metrics.canvas)&&within(metrics.start)&&metrics.controls.every(r=>within(r)&&r.width>=44&&r.height>=44)&&metrics.scrollWidth<=metrics.width+1;
      if(!valid)throw Error(JSON.stringify({id,width,height,metrics}));
      layouts++;
      await page.locator('[data-action="start"]').tap();
      await page.setViewportSize({width:height,height:width});
      await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).waitFor();
      await page.getByRole('button',{name:'退出全屏',exact:true}).tap();await full().waitFor({state:'detached'});
      await page.setViewportSize({width,height});
    }
  }
  check('all_games_fullscreen_layout_and_rotation',layouts===games.length*sizes.length,{layouts});
  await page.setViewportSize({width:844,height:390});await open('bridge');await page.locator('[data-action="start"]').tap();
  const cdp=await page.context().newCDPSession(page),canvas=await page.locator('canvas').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:canvas.x+canvas.width/2,y:canvas.y+canvas.height/2,id:1}]});
  await page.waitForTimeout(450);
  await page.evaluate(()=>document.querySelector('#fullscreen-toggle').click());await full().waitFor();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  check('fullscreen_cancels_held_bridge_without_loss',await page.locator('#live-extra').textContent()==='♥ ♥ ♥'&&await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();await page.waitForTimeout(700);
  check('late_release_does_not_drop_bridge',await page.locator('#live-extra').textContent()==='♥ ♥ ♥'&&Number(await page.locator('#live-score').textContent())===0);
  await page.getByRole('button',{name:'Ⅱ 暂停',exact:true}).tap();
  await page.screenshot({path:'output/playwright/fullscreen-mobile.png'});
  await page.getByRole('link',{name:'← 游乐场',exact:true}).tap();await page.locator('.hero').waitFor();
  check('home_cleans_fullscreen_and_scroll_lock',await full().count()===0&&!await page.evaluate(()=>document.body.classList.contains('has-fullscreen-game')));
  await cdp.detach();check('no_runtime_errors',errors.length===0,{errors});
  return{origin,passed:checks.length,layouts,checks};
}
