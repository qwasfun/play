async (page) => {
  // Resolve QA imports through Vite's manifest; hashed output names are not API paths.
  const buildMap=await (await page.request.get(new URL('module-map.json',page.url()).href)).json();
  const qaModules={};
  for(const[key,entry]of Object.entries(buildMap)){
    if(key.endsWith('packages/game-registry/src/index.js'))qaModules['catalog.js']=entry.file;
    if(key.endsWith('packages/game-registry/src/core.js'))qaModules['core.js']=entry.file;
    const match=key.match(/(?:^|\/)games\/(\w+)\/src\/index\.js$/);if(match)qaModules['games/'+match[1]+'.js']=entry.file;
  }
  const installQaImports=map=>{
    window.__qaModules=map;
    window.__qaImport=specifier=>{
      const url=new URL(specifier,location.href),match=url.pathname.match(/games\/(\w+)\.js$/),key=match?'games/'+match[1]+'.js':url.pathname.split('/').pop();
      if(!map[key])throw Error('验收模块：未找到 '+key);
      return import(new URL(map[key],new URL('./',location.href)).href);
    };
  };
  await page.addInitScript(installQaImports,qaModules);await page.evaluate(installQaImports,qaModules);

  const origin=new URL(page.url()).origin,checks=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(8000);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=array=>{if(array instanceof Uint32Array&&array.length===1){array[0]=location.hash.includes('/pairs')?123:1;return array;}return original(array);};});
  const cdp=await page.context().newCDPSession(page);
  const catalog=await page.evaluate(async()=>{const{games}=await window.__qaImport('./catalog.js');return games;});
  const portrait={width:390,height:844},landscape={width:844,height:390};
  const check=(name,passed,detail={})=>{checks.push({name,passed:!!passed,...detail});if(!passed)throw Error(JSON.stringify(checks.at(-1)));};
  const names={catch:'果园接接乐',bounce:'弹珠打砖块',pairs:'翻翻小花园',merge:'数字合合乐'};
  const starts={catch:'带上小篮子 ↗',bounce:'发射快乐弹珠 ↗',pairs:'翻开第一朵花 ↗',merge:'合出一点小惊喜 ↗'};
  async function open(id){await page.setViewportSize(portrait);await page.goto(origin+`/#/play/${id}`);await page.reload();await page.getByRole('button',{name:starts[id],exact:true}).tap();await page.locator('canvas').scrollIntoViewIfNeeded();}
  async function point(x,y,id=11){const r=await page.locator('canvas').boundingBox();return{x:r.x+x*r.width/600,y:r.y+y*r.height/480,id};}
  const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  const score=async()=>Number(await page.locator('#live-score').textContent());
  const tap=async(x,y)=>{const p=await point(x,y);await page.touchscreen.tap(p.x,p.y);};
  async function drag(x1,y1,x2,y2){const a=await point(x1,y1),b=await point(x2,y2);await touch('touchStart',[a]);await touch('touchMove',[b]);await touch('touchEnd');}
  await page.setViewportSize(portrait);await page.goto(origin);await page.reload();
  check('catalog_cards_and_latest_badges',await page.locator('.game-card').count()===catalog.length&&await page.locator('.new-badge').count()===catalog.filter(g=>g.isNew).length);
  const ordered=await page.locator('.game-card').evaluateAll(cards=>cards.map(card=>card.dataset.game));
  check('new_games_displayed_first',ordered.slice(0,catalog.filter(g=>g.isNew).length).join(',')===catalog.filter(g=>g.isNew).map(g=>g.id).join(','));
  for(const name of catalog.map(g=>g.title)){const button=page.getByLabel('收藏'+name,{exact:true});if(await button.count())await button.tap();}
  await page.getByRole('link',{name:'我的收藏',exact:true}).tap();await page.reload();
  check('all_catalog_favorites_survive_reload',await page.locator('.game-card').count()===catalog.length);
  await page.getByRole('link',{name:'游乐场',exact:true}).tap();await page.getByRole('button',{name:'✧ 动脑',exact:true}).tap();
  check('brain_filter_matches_catalog',await page.locator('.game-card').count()===catalog.filter(g=>g.tag==='动脑').length);
  await page.getByRole('button',{name:'全部',exact:true}).tap();
  await page.setViewportSize({width:1200,height:1000});
  await page.locator('#games').scrollIntoViewIfNeeded();
  const grid=await page.locator('.game-grid').first().boundingBox(),fourth=await page.locator('.game-card').nth(3).boundingBox();
  await page.screenshot({path:'output/playwright/new-games-grid.png',clip:{x:grid.x,y:grid.y,width:grid.width,height:fourth.y+fourth.height-grid.y}});

  await open('pairs');
  await tap(150,124);await tap(250,124);await tap(150,240);
  check('pairs_mismatch_locks_extra_taps',await score()===0&&await page.locator('#game-hint').textContent()==='记住这两朵花，等它们轻轻合上');
  await page.getByRole('button',{name:'↻ 重开',exact:true}).tap();await page.getByRole('button',{name:'重新开始',exact:true}).tap();
  for(const index of [0,5,1,11,2,3,4,8,6,9,7,10])await tap(150+index%4*100,124+Math.floor(index/4)*116);
  await page.waitForTimeout(150);
  check('pairs_touch_full_completion',await page.locator('.result-card').isVisible()&&await score()===684);
  check('pairs_next_game_is_new_merge',await page.getByRole('link',{name:'下一款游戏 →',exact:true}).getAttribute('href')==='#/play/merge');
  await page.getByRole('link',{name:'下一款游戏 →',exact:true}).tap();await page.locator('[data-action="start"]').waitFor({state:'visible'});
  check('result_link_accepts_fresh_touch_once',page.url().endsWith('#/play/merge'));
  await page.goto(origin+'/#/play/pairs');
  await page.reload();check('pairs_best_record_persists',(await page.locator('#best-record').textContent()).includes('684'));

  await open('merge');
  const path='LDDDUDLLDUDLDLLLDLDLDDDLDLLLDLDRDLLDLDRLRULDLLDDDLDDDLDULULLDLLDLUU';
  const ends={L:[170,240],R:[430,240],U:[300,110],D:[300,370]};
  for(const direction of path){const [x,y]=ends[direction];await drag(300,240,x,y);}
  check('merge_swipes_reach_128_and_settle',await page.locator('.result-card').isVisible()&&await score()===760,{score:await score()});
  check('merge_next_game_matches_catalog',await page.getByRole('link',{name:'下一款游戏 →',exact:true}).getAttribute('href')==='#/play/'+catalog[(catalog.findIndex(g=>g.id==='merge')+1)%catalog.length].id);
  await page.getByRole('button',{name:'再玩一次 ↻',exact:true}).press('Enter');
  check('result_button_accepts_keyboard_activation',await score()===0&&!await page.locator('#game-overlay').isVisible());
  await page.reload();check('merge_best_record_persists',(await page.locator('#best-record').textContent()).includes('760'));
  await page.getByRole('button',{name:starts.merge,exact:true}).tap();await page.locator('canvas').scrollIntoViewIfNeeded();
  const a=await point(300,240);await touch('touchStart',[a]);await touch('touchMove',[await point(170,240)]);
  await page.setViewportSize(landscape);await page.waitForTimeout(120);await touch('touchEnd');
  check('rotation_cancels_unfinished_swipe',await score()===0&&await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();await drag(300,240,170,240);
  check('swipe_works_after_landscape_resume',!(await page.locator('#game-overlay').isVisible()));
  await page.screenshot({path:'output/playwright/new-merge-landscape.png'});

  await open('catch');
  const fruit=await page.evaluate(async()=>{const{generateHarvest}=await window.__qaImport('./games/catch.js');return generateHarvest(1)[0];});
  const p=await point(300,400),target=await point(fruit.x,400);await touch('touchStart',[p]);await touch('touchMove',[target]);await touch('touchEnd');
  await page.waitForFunction(()=>Number(document.querySelector('#live-score').textContent)>=10,{timeout:6500});
  check('orchard_drag_collects_fruit',await score()>=10);
  const before=await score();await touch('touchStart',[await point(100,400)]);await touch('touchMove',[await point(500,400)]);await page.setViewportSize(landscape);await page.waitForTimeout(120);await touch('touchEnd');
  check('orchard_drag_rotation_pauses',await score()===before&&await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();await drag(500,400,100,400);
  await page.getByRole('button',{name:'Ⅱ 暂停',exact:true}).tap();check('orchard_drag_after_rotation_has_no_error',await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  await page.screenshot({path:'output/playwright/new-orchard-landscape.png'});

  await open('bounce');await drag(300,420,430,420);
  await page.waitForFunction(()=>Number(document.querySelector('#live-score').textContent)>=10,{timeout:6500});
  check('bounce_launch_hits_brick',await score()>=10);
  await touch('touchStart',[await point(200,420)]);await touch('touchMove',[await point(420,420)]);await touch('touchCancel');
  await page.setViewportSize(landscape);await page.waitForTimeout(120);
  check('bounce_drag_cancel_and_rotation_pause',await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();await drag(400,420,200,420);
  await page.getByRole('button',{name:'Ⅱ 暂停',exact:true}).tap();await page.screenshot({path:'output/playwright/new-bounce-landscape.png'});
  check('no_runtime_errors',errors.length===0,{errors});await cdp.detach();
  return {origin,passed:checks.length,checks};
}
