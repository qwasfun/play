async(page)=>{
  const origin=new URL(page.url()).origin,checks=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(8000);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{
    const original=crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues=array=>{if(array instanceof Uint32Array&&array.length===1){array[0]=123;return array;}return original(array);};
  });
  const cdp=await page.context().newCDPSession(page),portrait={width:390,height:844},landscape={width:844,height:390};
  const check=(name,passed,detail={})=>{checks.push({name,passed:!!passed,...detail});if(!passed)throw Error(JSON.stringify(checks.at(-1)));};
  const score=async()=>Number(await page.locator('#live-score').textContent());
  const hint=()=>page.locator('#game-hint').textContent();
  async function point(x,y){const r=await page.locator('canvas').boundingBox();return{x:r.x+x*r.width/600,y:r.y+y*r.height/480,id:17};}
  async function tapAt(x,y){const p=await point(x,y);await page.touchscreen.tap(p.x,p.y);}
  const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  async function holdAt(x,y,ending='touchEnd'){await touch('touchStart',[await point(x,y)]);await page.waitForTimeout(600);await touch(ending);}
  async function open(id,{fullscreen=false}={}){
    await page.setViewportSize(portrait);await page.goto(origin+`/#/play/${id}`);await page.reload();
    await page.locator('[data-action="start"]').waitFor();
    if(fullscreen){await page.getByRole('button',{name:'全屏游戏',exact:true}).tap();await page.locator('.play-main.is-fullscreen').waitFor();}
    await page.locator('[data-action="start"]').tap();await page.locator('canvas').scrollIntoViewIfNeeded();
  }
  await page.setViewportSize(portrait);await page.goto(origin+'/#/');await page.reload();
  check('twenty_cards_and_four_badges',await page.locator('.game-card').count()===20&&await page.locator('.new-badge').count()===4);
  check('latest_four_games_sort_first',(await page.locator('.game-card').evaluateAll(cards=>cards.slice(0,4).map(card=>card.dataset.game))).join(',')==='constellation,tower,rain,mines');
  const catalog=await page.evaluate(async()=>{const{games}=await import('./catalog.js');return games;});
  for(const game of catalog){const favorite=page.getByLabel('收藏'+game.title,{exact:true});if(await favorite.count())await favorite.tap();}
  await page.getByRole('link',{name:'我的收藏',exact:true}).tap();await page.reload();
  check('all_twenty_favorites_survive_reload',await page.locator('.game-card').count()===20);

  await open('constellation');
  const starPuzzles=await page.evaluate(async()=>{const{generateConstellations}=await import('./games/constellation.js');return generateConstellations(123);});
  const starTap=(puzzle,node)=>tapAt(puzzle.nodes[node].x,puzzle.nodes[node].y);
  const first=starPuzzles[0],a=first.solution[0],b=first.solution[1],c=first.solution[2];
  await starTap(first,a);await starTap(first,b);
  check('constellation_first_edge_scores_twenty',await score()===20);
  await touch('touchStart',[await point(first.nodes[b].x,first.nodes[b].y)]);
  await touch('touchMove',[await point(first.nodes[c].x,first.nodes[c].y)]);await touch('touchCancel');
  check('constellation_cancel_retains_prior_committed_edge',await score()===20);
  await page.getByRole('button',{name:'全屏游戏',exact:true}).tap();await page.locator('.play-main.is-fullscreen').waitFor();
  const starNative=await page.evaluate(()=>({enabled:document.fullscreenEnabled,native:document.fullscreenElement===document.querySelector('.play-main')}));
  check('constellation_native_fullscreen_pauses_and_keeps_score',(!starNative.enabled||starNative.native)&&await score()===20&&await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible(),starNative);
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();
  await page.setViewportSize(landscape);await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).waitFor();
  check('constellation_rotation_keeps_the_edge',await score()===20);
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();
  await page.getByRole('button',{name:'退出全屏',exact:true}).tap();await page.locator('.play-main.is-fullscreen').waitFor({state:'detached'});
  check('constellation_exit_preserves_score_and_pause',await score()===20&&await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).tap();check('constellation_undo_removes_edge_score',await score()===0);
  // Commit the first graph in two gestures, so a released line can continue at its endpoint.
  await touch('touchStart',[await point(first.nodes[a].x,first.nodes[a].y)]);
  for(const node of first.solution.slice(1,4))await touch('touchMove',[await point(first.nodes[node].x,first.nodes[node].y)]);
  await touch('touchEnd');
  check('constellation_partial_drag_commits_three_edges',await score()===60);
  await page.screenshot({path:'output/playwright/wave5-constellation.png'});
  for(const node of first.solution.slice(4))await starTap(first,node);
  await page.waitForTimeout(650);
  for(const puzzle of starPuzzles.slice(1)){
    for(const node of puzzle.solution)await starTap(puzzle,node);
    if(puzzle!==starPuzzles.at(-1))await page.waitForTimeout(650);
  }
  await page.locator('.result-card').waitFor();check('constellation_touch_and_drag_clear_three_graphs',await score()===700);
  await page.reload();check('constellation_best_survives_reload',(await page.locator('#best-record').textContent()).includes('700'));
  await page.locator('[data-action="start"]').press('Enter');
  for(let level=0;level<starPuzzles.length;level++){
    const puzzle=starPuzzles[level];let selected=0;
    for(const node of puzzle.solution){
      for(let n=(node-selected+puzzle.nodes.length)%puzzle.nodes.length;n>0;n--)await page.locator('canvas').press('ArrowRight');
      await page.locator('canvas').press('Space');selected=node;
    }
    if(level<2)await page.waitForTimeout(650);
  }
  await page.locator('.result-card').waitFor();check('constellation_keyboard_clears_three_graphs',await score()===700);

  await open('mines',{fullscreen:true});
  const minePuzzle=await page.evaluate(async()=>{const{generateMines}=await import('./games/mines.js');return generateMines(123);});
  const minePoint=cell=>({x:156+cell%4*96,y:96+Math.floor(cell/4)*96});
  const mineTap=cell=>{const p=minePoint(cell);return tapAt(p.x,p.y);};
  const mineHold=(cell,ending)=>{const p=minePoint(cell);return holdAt(p.x,p.y,ending);};
  const bomb=minePuzzle.mines[0];
  const mineNative=await page.evaluate(()=>({enabled:document.fullscreenEnabled,native:document.fullscreenElement===document.querySelector('.play-main')}));
  check('mines_can_enter_native_fullscreen_before_start',!mineNative.enabled||mineNative.native,mineNative);
  await mineHold(bomb);
  check('mines_long_press_marks_without_revealing',await score()===0&&(await hint()).includes('小旗放好了')&&!await page.locator('.result-card').isVisible());
  await mineTap(bomb);
  check('mines_short_tap_cannot_reveal_flagged_bomb',await score()===0&&!await page.locator('.result-card').isVisible());
  await mineHold(bomb);
  check('mines_second_long_press_removes_flag',(await hint()).includes('小旗收好了'));
  await mineHold(0,'touchCancel');
  check('mines_cancelled_long_press_neither_flags_nor_reveals',await score()===0&&(await page.locator('#live-extra').textContent())==='已开 0 / 13');
  const start=minePoint(0);await touch('touchStart',[await point(start.x,start.y)]);await page.waitForTimeout(600);
  await page.setViewportSize(landscape);await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).waitFor();await touch('touchEnd');
  check('mines_rotation_cancels_held_flag_gesture',await score()===0&&(await page.locator('#live-extra').textContent())==='已开 0 / 13');
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();await mineTap(0);
  check('mines_safe_start_still_opens_after_cancel_and_rotation',await score()>=80&&!await page.locator('.result-card').isVisible());
  await page.screenshot({path:'output/playwright/wave5-mines.png'});
  for(let cell=0;cell<16;cell++){
    if(await page.locator('.result-card').isVisible())break;
    if(!minePuzzle.mines.includes(cell))await mineTap(cell);
  }
  await page.locator('.result-card').waitFor();const mineBest=await score();
  check('mines_touch_opens_thirteen_safe_flowers',mineBest>=400&&(await page.locator('#live-extra').textContent())==='已开 13 / 13',{score:mineBest});
  await page.getByRole('button',{name:'退出全屏',exact:true}).tap();await page.reload();
  check('mines_best_survives_reload',(await page.locator('#best-record').textContent()).includes(String(mineBest)));
  await page.locator('[data-action="start"]').tap();await mineTap(bomb);await page.locator('.result-card').waitFor();
  check('mines_bomb_ends_game_and_keeps_better_record',await score()===0&&(await page.locator('#best-record').textContent()).includes(String(mineBest)));
  check('twentieth_game_next_wraps_to_star',await page.getByRole('link',{name:'下一款游戏 →',exact:true}).getAttribute('href')==='#/play/star');
  await page.getByRole('button',{name:'再玩一次 ↻',exact:true}).press('Enter');
  let selected=0;
  async function choose(cell){
    let x=selected%4,y=Math.floor(selected/4);
    for(let n=(cell%4-x+4)%4;n>0;n--)await page.locator('canvas').press('ArrowRight');
    for(let n=(Math.floor(cell/4)-y+4)%4;n>0;n--)await page.locator('canvas').press('ArrowDown');
    selected=cell;
  }
  await choose(bomb);await page.locator('canvas').press('Enter');await page.locator('canvas').press('Space');
  check('mines_keyboard_enter_flags_and_space_respects_flag',await score()===0&&!await page.locator('.result-card').isVisible()&&(await hint()).includes('小旗放好了'));
  await page.locator('canvas').press('Enter');
  for(let cell=0;cell<16;cell++){
    if(await page.locator('.result-card').isVisible())break;
    if(!minePuzzle.mines.includes(cell)){await choose(cell);await page.locator('canvas').press('Space');}
  }
  await page.locator('.result-card').waitFor();check('mines_keyboard_opens_all_safe_flowers',await score()>=400&&(await page.locator('#live-extra').textContent())==='已开 13 / 13',{score:await score()});
  check('no_runtime_errors',errors.length===0,{errors});await cdp.detach();return{origin,passed:checks.length,checks};
}
