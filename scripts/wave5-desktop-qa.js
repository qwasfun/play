async(page)=>{
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
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
  await page.addInitScript(()=>{
    const original=crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues=array=>{if(array instanceof Uint32Array&&array.length===1){array[0]=123;return array;}return original(array);};
    document.addEventListener('click',event=>{if(event.target.closest('[data-action]')?.dataset.action==='start')window.__gameStartedAt=performance.now();},true);
  });
  const check=(name,passed,extra={})=>{checks.push({name,passed:!!passed,...extra});if(!passed)throw Error(JSON.stringify(checks.at(-1)));};
  const score=async()=>Number(await page.locator('#live-score').textContent());
  await page.setViewportSize({width:1440,height:900});
  async function open(id){
    await page.goto(origin+`/#/play/${id}`);await page.reload();await page.locator('[data-action="start"]').waitFor();
    await page.getByRole('button',{name:'全屏游戏',exact:true}).press('Enter');await page.locator('.play-main.is-fullscreen').waitFor();
    await page.waitForTimeout(250);check(`${id}_desktop_native_fullscreen`,await page.evaluate(()=>document.fullscreenElement===document.querySelector('.play-main')));
    await page.locator('[data-action="start"]').press('Enter');
  }
  async function leave(){await page.getByRole('button',{name:'退出全屏',exact:true}).press('Enter');await page.locator('.play-main.is-fullscreen').waitFor({state:'detached'});}
  await open('constellation');
  const puzzles=await page.evaluate(async()=>{const{generateConstellations}=await window.__qaImport('./games/constellation.js');return generateConstellations(123);});
  for(let level=0;level<3;level++){
    let selected=0;
    for(const node of puzzles[level].solution){while(selected!==node){await page.locator('canvas').press('ArrowRight');selected=(selected+1)%puzzles[level].nodes.length;}await page.locator('canvas').press('Space');}
    if(level<2)await page.waitForTimeout(600);
  }
  await page.locator('.result-card').waitFor();check('constellation_desktop_keyboard_three_graphs',await score()===700);await leave();
  await open('mines');
  await page.locator('canvas').press('Enter');await page.locator('canvas').press('Space');
  check('mines_keyboard_flag_blocks_reveal',await score()===0&&(await page.locator('#game-hint').textContent()).includes('小旗放好了'));
  await page.locator('canvas').press('Enter');await page.locator('canvas').press('Space');
  const mines=await page.evaluate(async()=>{const{generateMines}=await window.__qaImport('./games/mines.js');return generateMines(123).mines;});
  let selected=0;
  for(let cell=0;cell<16;cell++)if(!mines.includes(cell)){
    while(selected%4!==cell%4){await page.locator('canvas').press('ArrowRight');selected=Math.floor(selected/4)*4+(selected%4+1)%4;}
    while(Math.floor(selected/4)!==Math.floor(cell/4)){await page.locator('canvas').press('ArrowDown');selected=(selected+4)%16;}
    await page.locator('canvas').press('Space');if(await page.locator('.result-card').isVisible())break;
  }
  await page.locator('.result-card').waitFor();check('mines_desktop_keyboard_opens_safe_cells',await score()>=400&&await page.locator('#live-extra').textContent()==='已开 13 / 13');await leave();
  await open('tower');
  const first=await page.evaluate(async()=>{const{generateTower,nextPerfectTowerTime}=await window.__qaImport('./games/tower.js');return nextPerfectTowerTime(generateTower(123)[0],300,0);});
  await page.waitForFunction(t=>performance.now()>=window.__gameStartedAt+t*1000,first+.02);
  await page.locator('canvas').press('Space');check('tower_keyboard_places_aligned_floor',await score()>=100);await leave();
  await open('rain');
  const umbrellaCenter=()=>page.evaluate(()=>{
    const pixels=document.querySelector('canvas').getContext('2d').getImageData(0,280,600,50).data;let sum=0,count=0;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i]===232&&pixels[i+1]===170&&pixels[i+2]===148){sum+=(i/4)%600;count++;}
    return count?sum/count:null;
  });
  await page.waitForTimeout(80);const before=await umbrellaCenter();
  await page.locator('canvas').press('ArrowRight',{delay:180});await page.waitForTimeout(50);const right=await umbrellaCenter();
  check('rain_arrow_right_visibly_moves_umbrella',before!==null&&right-before>50,{before,right});
  await page.locator('canvas').press('ArrowLeft',{delay:180});await page.waitForTimeout(50);const left=await umbrellaCenter();
  check('rain_arrow_left_visibly_moves_umbrella',right-left>50,{right,left});
  await page.waitForTimeout(120);const stopped=await umbrellaCenter();check('rain_keyup_stops_movement',Math.abs(stopped-left)<2);
  await leave();check('rain_exiting_fullscreen_pauses',await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  check('no_desktop_runtime_errors',errors.length===0,{errors});return{origin,passed:checks.length,checks};
}
