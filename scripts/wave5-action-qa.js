async(page)=>{
  const origin=new URL(page.url()).origin,checks=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
  await page.addInitScript(()=>{
    const original=crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues=array=>{if(array instanceof Uint32Array&&array.length===1){array[0]=123;return array;}return original(array);};
    document.addEventListener('click',event=>{if(['start','again'].includes(event.target.closest('[data-action]')?.dataset.action))window.__gameStartedAt=performance.now();},true);
  });
  const check=(name,passed,extra={})=>{checks.push({name,passed:!!passed,...extra});if(!passed)throw Error(JSON.stringify(checks.at(-1)));};
  const cdp=await page.context().newCDPSession(page);
  const score=async()=>Number(await page.locator('#live-score').textContent());
  async function point(x,y){const r=await page.locator('canvas').boundingBox();return{x:r.x+x*r.width/600,y:r.y+y*r.height/480,id:1};}
  const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  async function tap(x,y){await touch('touchStart',[await point(x,y)]);await touch('touchEnd');}
  async function at(time){await page.waitForFunction(t=>performance.now()>=window.__gameStartedAt+t*1000,time,{timeout:6500});}
  async function open(id){await page.setViewportSize({width:844,height:390});await page.goto(origin+`/#/play/${id}`);await page.reload();await page.locator('[data-action="start"]').waitFor();}
  await open('tower');await page.getByRole('button',{name:'全屏游戏',exact:true}).tap();await page.locator('.play-main.is-fullscreen').waitFor();
  const stages=await page.evaluate(async()=>{const{generateTower,nextPerfectTowerTime}=await import('./games/tower.js');let after=0;return generateTower(123).map(stage=>{const time=nextPerfectTowerTime(stage,300,after);after=time+.6;return time;});});
  await page.locator('[data-action="start"]').tap();
  let previous=0;
  for(let i=0;i<stages.length;i++){
    await at(stages[i]+.02);await tap(300,250);const current=await score();
    check(`tower_places_floor_${i+1}`,current-previous>=100&&(await page.locator('#live-extra').textContent())==='♥ ♥ ♥',{score:current});previous=current;
    if(i===5)await page.screenshot({path:'output/playwright/wave5-tower.png'});
  }
  await page.locator('.result-card').waitFor();check('tower_touch_reaches_twelfth_floor',await score()>=1200,{score:await score()});
  await page.getByRole('button',{name:'退出全屏',exact:true}).tap();await page.reload();
  check('tower_best_persists',Number((await page.locator('#best-record').textContent()).match(/\d+/)?.[0])>=1200);
  await page.locator('[data-action="start"]').tap();await page.locator('canvas').press('Space');
  check('tower_keyboard_places_first_floor',await score()>=100);
  await page.getByRole('button',{name:'Ⅱ 暂停',exact:true}).tap();const before=await page.locator('#live-time').textContent();await page.waitForTimeout(300);
  check('tower_pause_stops_clock',await page.locator('#live-time').textContent()===before);
  await page.getByRole('button',{name:'↻ 重开',exact:true}).tap();await page.getByRole('button',{name:'重新开始',exact:true}).tap();
  check('tower_restart_resets_score',await score()===0&&(await page.locator('#live-extra').textContent())==='♥ ♥ ♥');

  await open('rain');await page.getByRole('button',{name:'全屏游戏',exact:true}).tap();await page.locator('.play-main.is-fullscreen').waitFor();
  const drops=await page.evaluate(async()=>{const{generateRainSchedule}=await import('./games/rain.js');return generateRainSchedule(123);});
  await page.locator('[data-action="start"]').tap();
  for(let i=0;i<drops.length;i++){
    await at(drops[i].crossTime-.18);
    await touch('touchStart',[await point(300,330)]);await touch('touchMove',[await point(drops[i].x,330)]);await touch('touchEnd');
    await at(drops[i].crossTime+.10);
    if(i===3){check('rain_drag_catches_first_four_targets',await score()===100&&(await page.locator('#live-extra').textContent())==='♥ ♥ ♥');await page.screenshot({path:'output/playwright/wave5-rain.png'});}
  }
  await page.locator('.result-card').waitFor();check('rain_all_twenty_four_targets_complete',await score()===600&&(await page.locator('#live-extra').textContent())==='♥ ♥ ♥');
  await page.getByRole('button',{name:'退出全屏',exact:true}).tap();await page.reload();
  check('rain_best_persists',(await page.locator('#best-record').textContent()).includes('600'));
  await page.locator('[data-action="start"]').tap();
  await page.locator('canvas').press('ArrowRight',{delay:150});await page.locator('canvas').press('ArrowLeft',{delay:150});
  await page.getByRole('button',{name:'全屏游戏',exact:true}).tap();await page.locator('.play-main.is-fullscreen').waitFor();
  check('rain_fullscreen_keeps_progress_and_pauses',await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible()&&await score()===0);
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).waitFor();check('rain_rotation_preserves_chances',(await page.locator('#live-extra').textContent())==='♥ ♥ ♥');
  await page.getByRole('button',{name:'退出全屏',exact:true}).tap();
  await cdp.detach();check('no_runtime_errors',errors.length===0,{errors});return{origin,passed:checks.length,checks};
}
