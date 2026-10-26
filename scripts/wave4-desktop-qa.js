async(page)=>{
  const origin=new URL(page.url()).origin,checks=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
  await page.addInitScript(()=>{
    const original=crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues=array=>{if(array instanceof Uint32Array&&array.length===1){array[0]=123;return array;}return original(array);};
    document.addEventListener('click',event=>{if(event.target.closest('[data-action]')?.dataset.action==='start')window.__gameStartedAt=performance.now();},true);
  });
  const check=(name,passed,extra={})=>{checks.push({name,passed:!!passed,...extra});if(!passed)throw Error(JSON.stringify(checks.at(-1)));};
  await page.setViewportSize({width:1440,height:900});
  const score=async()=>Number(await page.locator('#live-score').textContent());
  for(const id of ['slide','bubbles','jump','rhythm']){
    await page.goto(origin+`/#/play/${id}`);await page.reload();await page.locator('[data-action="start"]').waitFor();
    await page.getByRole('button',{name:'全屏游戏',exact:true}).press('Enter');await page.locator('.play-main.is-fullscreen').waitFor();
    const native=await page.evaluate(()=>document.fullscreenElement===document.querySelector('.play-main'));
    check(`${id}_desktop_keyboard_enters_native_fullscreen`,native);
    // Keyboard press does not wait for the browser's fullscreen resize animation.
    await page.waitForTimeout(250);
    await page.locator('[data-action="start"]').press('Enter');
    if(id==='slide'){
      const puzzle=await page.evaluate(async()=>{const{generateSlide}=await import('./games/slide.js');return generateSlide(123);});
      let blank=puzzle.blank;
      for(const cell of puzzle.solution){const key={1:'ArrowRight','-1':'ArrowLeft',3:'ArrowDown','-3':'ArrowUp'}[cell-blank];await page.locator('canvas').press(key);blank=cell;}
      await page.locator('.result-card').waitFor();check('slide_desktop_keyboard_full_solution',await score()===400);
    }else if(id==='bubbles'){
      await page.locator('canvas').press('Space');check('bubbles_desktop_keyboard_pops_group',await score()===40);
    }else if(id==='jump'){
      const first=await page.evaluate(async()=>{const{generateJumpSchedule}=await import('./games/jump.js');return generateJumpSchedule(123)[0].time;});
      await page.waitForFunction(t=>performance.now()>=window.__gameStartedAt+t*1000,first-.53);
      await page.locator('canvas').press('ArrowUp');await page.waitForFunction(()=>document.querySelector('#live-score').textContent==='100');
      check('jump_desktop_arrow_key_clears_first_obstacle',await page.locator('#live-extra').textContent()==='♥ ♥ ♥');
    }else{
      for(let i=0;i<5;i++)await page.locator('canvas').press('a');
      await page.locator('.result-card').waitFor();check('rhythm_desktop_keys_use_five_lives',await page.locator('#live-extra').textContent()==='♥ 0');
    }
    await page.getByRole('button',{name:'退出全屏',exact:true}).press('Enter');await page.locator('.play-main.is-fullscreen').waitFor({state:'detached'});
    check(`${id}_desktop_keyboard_exits_fullscreen`,!await page.evaluate(()=>document.body.classList.contains('has-fullscreen-game')));
  }
  check('no_desktop_runtime_errors',errors.length===0,{errors});return{origin,passed:checks.length,checks};
}
