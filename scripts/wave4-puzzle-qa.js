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
  async function point(x,y){const r=await page.locator('canvas').boundingBox();return{x:r.x+x*r.width/600,y:r.y+y*r.height/480};}
  async function tapAt(x,y){const p=await point(x,y);await page.touchscreen.tap(p.x,p.y);}
  async function cancelAt(x,y){const p=await point(x,y);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:17}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});}
  async function open(id){
    await page.setViewportSize(portrait);await page.goto(origin+`/#/play/${id}`);await page.reload();
    await page.locator('[data-action="start"]').tap();await page.locator('canvas').scrollIntoViewIfNeeded();
  }
  await page.setViewportSize(portrait);await page.goto(origin+'/#/');await page.reload();
  check('sixteen_cards_and_four_badges',await page.locator('.game-card').count()===16&&await page.locator('.new-badge').count()===4);
  check('latest_four_games_sort_first',(await page.locator('.game-card').evaluateAll(cards=>cards.slice(0,4).map(card=>card.dataset.game))).join(',')==='jump,bubbles,slide,rhythm');
  const catalog=await page.evaluate(async()=>{const{games}=await import('./catalog.js');return games;});
  for(const game of catalog){const favorite=page.getByLabel('收藏'+game.title,{exact:true});if(await favorite.count())await favorite.tap();}
  await page.getByRole('link',{name:'我的收藏',exact:true}).tap();await page.reload();
  check('all_sixteen_favorites_survive_reload',await page.locator('.game-card').count()===16);

  const bubblePlan=await page.evaluate(async()=>{
    const{generateBubbles,findGroup,collapseBubbles}=await import('./games/bubbles.js');
    return generateBubbles(123).map(source=>{
      let board=[...source];const moves=[];
      while(board.some(value=>value!==null)){
        const cell=board.findIndex(value=>value!==null),group=findGroup(board,cell);
        if(group.length<2)throw Error('Seeded bubble board has an isolated bubble');
        moves.push({cell,points:group.length*group.length*10});
        for(const index of group)board[index]=null;
        board=collapseBubbles(board);
      }
      return moves;
    });
  });
  await open('bubbles');await cancelAt(108,96);
  check('bubbles_cancel_never_pops',await score()===0&&(await page.locator('#live-extra').textContent())==='0 / 60');
  await tapAt(108,96);
  check('bubbles_first_touch_group_scores_forty',await score()===40&&(await page.locator('#live-extra').textContent())==='2 / 60');
  let bubbleExpected=40;
  for(let round=0;round<3;round++){
    for(const move of bubblePlan[round].slice(round===0?1:0)){
      await tapAt(108+move.cell%5*96,96+Math.floor(move.cell/5)*96);bubbleExpected+=move.points;
    }
    if(round<2)await page.waitForTimeout(650);
  }
  await page.locator('.result-card').waitFor();
  check('bubbles_touch_clears_three_seeded_boards',await score()===bubbleExpected&&(await page.locator('#live-extra').textContent())==='60 / 60',{score:await score(),expected:bubbleExpected});
  await page.reload();check('bubbles_best_survives_reload',(await page.locator('#best-record').textContent()).includes(String(bubbleExpected)));

  const slidePuzzle=await page.evaluate(async()=>{const{generateSlide}=await import('./games/slide.js');return generateSlide(123);});
  const slideTap=cell=>tapAt(180+cell%3*120,118+Math.floor(cell/3)*120);
  await open('slide');const slideInitial=await score();
  await cancelAt(180+slidePuzzle.solution[0]%3*120,118+Math.floor(slidePuzzle.solution[0]/3)*120);
  check('slide_cancel_keeps_initial_board',await score()===slideInitial);
  await slideTap(slidePuzzle.solution[0]);await page.getByRole('button',{name:'↶ 撤销',exact:true}).tap();
  check('slide_undo_restores_initial_progress',await score()===slideInitial);
  for(const cell of slidePuzzle.solution)await slideTap(cell);
  await page.locator('.result-card').waitFor();
  check('slide_touch_solution_counts_the_undone_move',await score()===395,{score:await score()});
  await page.getByRole('button',{name:'再玩一次 ↻',exact:true}).press('Enter');
  let blank=slidePuzzle.blank;
  for(const cell of slidePuzzle.solution){
    const delta=cell-blank,key=delta===1?'ArrowRight':delta===-1?'ArrowLeft':delta===3?'ArrowDown':'ArrowUp';
    await page.locator('canvas').press(key);blank=cell;
  }
  await page.locator('.result-card').waitFor();
  check('slide_keyboard_solution_scores_four_hundred',await score()===400,{score:await score()});
  await page.reload();check('slide_best_survives_reload',(await page.locator('#best-record').textContent()).includes('400'));
  await page.locator('[data-action="start"]').tap();
  for(const cell of slidePuzzle.solution)await slideTap(cell);
  await page.locator('.result-card').waitFor();
  check('slide_result_links_to_rhythm',await page.getByRole('link',{name:'下一款游戏 →',exact:true}).getAttribute('href')==='#/play/rhythm');
  await page.getByRole('link',{name:'下一款游戏 →',exact:true}).tap();await page.locator('[data-action="start"]').waitFor();
  check('result_next_touch_navigates_to_rhythm',page.url().endsWith('#/play/rhythm'));

  await open('slide');await slideTap(slidePuzzle.solution[0]);const progress=await score(),extra=await page.locator('#live-extra').textContent();
  await page.getByRole('button',{name:'全屏游戏',exact:true}).tap();await page.locator('.play-main.is-fullscreen').waitFor();
  const native=await page.evaluate(()=>({enabled:document.fullscreenEnabled,native:document.fullscreenElement===document.querySelector('.play-main')}));
  check('new_puzzle_enters_native_fullscreen',!native.enabled||native.native,native);
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();
  await page.setViewportSize(landscape);await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).waitFor();
  check('fullscreen_rotation_pauses_and_keeps_progress',await score()===progress&&await page.locator('#live-extra').textContent()===extra);
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();
  await page.getByRole('button',{name:'退出全屏',exact:true}).tap();await page.locator('.play-main.is-fullscreen').waitFor({state:'detached'});
  check('fullscreen_exit_preserves_progress_and_pause',await score()===progress&&await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  check('no_runtime_errors',errors.length===0,{errors});await cdp.detach();
  return{origin,passed:checks.length,checks};
}
