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
  async function point(x,y){const r=await page.locator('canvas').boundingBox();return{x:r.x+x*r.width/600,y:r.y+y*r.height/480,id:1};}
  async function tap(x,y){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await point(x,y)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  async function at(time){await page.waitForFunction(t=>performance.now()>=window.__gameStartedAt+t*1000,time,{timeout:6500});}
  const score=async()=>Number(await page.locator('#live-score').textContent());
  async function open(id){await page.setViewportSize({width:844,height:390});await page.goto(origin+`/#/play/${id}`);await page.reload();await page.locator('[data-action="start"]').waitFor();}
  await open('jump');
  await page.getByRole('button',{name:'全屏游戏',exact:true}).tap();await page.locator('.play-main.is-fullscreen').waitFor();
  const native=await page.evaluate(()=>document.querySelector('.play-main').dataset.fullscreenMode);
  check('jump_can_enter_fullscreen_before_start',native==='native'||native==='immersive',{mode:native});
  const jumps=await page.evaluate(async()=>{const{generateJumpSchedule}=await import('./games/jump.js');return generateJumpSchedule(123);});
  await page.locator('[data-action="start"]').tap();
  for(let i=0;i<jumps.length;i++){
    await at(jumps[i].time-.53);await tap(300,280);
    await at(jumps[i].time+.30);
    check(`jump_clears_obstacle_${i+1}`,await score()===(i+1)*100,{score:await score()});
    if(i===1)await page.screenshot({path:'output/playwright/wave4-jump.png'});
  }
  await page.locator('.result-card').waitFor();
  check('jump_touch_full_run_keeps_three_lives',await score()===1200&&(await page.locator('#live-extra').textContent())==='♥ ♥ ♥');
  await page.getByRole('button',{name:'退出全屏',exact:true}).tap();await page.reload();
  check('jump_best_persists',(await page.locator('#best-record').textContent()).includes('1200'));
  await page.locator('[data-action="start"]').tap();await page.locator('canvas').press('Space');
  await page.getByRole('button',{name:'Ⅱ 暂停',exact:true}).tap();
  const before=await page.locator('#live-time').textContent();await page.waitForTimeout(300);
  check('jump_keyboard_and_pause_keep_timer_still',await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible()&&await page.locator('#live-time').textContent()===before);
  await page.getByRole('button',{name:'↻ 重开',exact:true}).tap();await page.getByRole('button',{name:'重新开始',exact:true}).tap();
  check('jump_restart_resets_session',await score()===0&&(await page.locator('#live-extra').textContent())==='♥ ♥ ♥');

  await open('rhythm');await page.locator('[data-action="start"]').tap();
  check('rhythm_five_lives_fit_hud',(await page.locator('#live-extra').textContent())==='♥ 5');
  for(let i=0;i<5;i++)await tap(126,418);
  await page.locator('.result-card').waitFor();check('rhythm_five_early_taps_end_once',await score()===0&&(await page.locator('#live-extra').textContent())==='♥ 0');
  check('sixteenth_game_next_wraps_home_catalog',await page.getByRole('link',{name:'下一款游戏 →',exact:true}).getAttribute('href')==='#/play/star');
  await page.getByRole('link',{name:'下一款游戏 →',exact:true}).tap();await page.locator('[data-action="start"]').waitFor();check('result_next_link_navigates_once',page.url().endsWith('#/play/star'));
  await open('rhythm');await page.getByRole('button',{name:'全屏游戏',exact:true}).tap();await page.locator('.play-main.is-fullscreen').waitFor();
  const notes=await page.evaluate(async()=>{const{generateRhythmSchedule}=await import('./games/rhythm.js');return generateRhythmSchedule(123);});
  await page.locator('[data-action="start"]').tap();
  for(let i=0;i<notes.length;i++){
    await at(notes[i].time);
    if(i%2===0)await tap(126+notes[i].lane*116,418);
    else await page.locator('canvas').press(['ArrowLeft','ArrowUp','ArrowDown','ArrowRight'][notes[i].lane]);
    if(i===3)await page.screenshot({path:'output/playwright/wave4-rhythm.png'});
  }
  await page.locator('.result-card').waitFor();
  check('rhythm_touch_and_keyboard_complete_all_beats',await score()>=3000&&(await page.locator('#live-extra').textContent())==='♥ 5',{score:await score()});
  await page.getByRole('button',{name:'退出全屏',exact:true}).tap();await page.reload();
  check('rhythm_best_persists',Number((await page.locator('#best-record').textContent()).match(/\d+/)?.[0])>=3000);
  await cdp.detach();check('no_runtime_errors',errors.length===0,{errors});
  return{origin,passed:checks.length,checks};
}
