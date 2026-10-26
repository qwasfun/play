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

  const origin=new URL(page.url()).origin,checks=[];
  const ids=await page.evaluate(async()=>{const{games}=await window.__qaImport('./catalog.js');return games.map(g=>g.id);});
  const sizes=[[375,812],[812,375],[390,844],[844,390],[320,568],[568,320],[768,1024],[1024,768]];
  for(const [width,height] of sizes){
    await page.setViewportSize({width,height});
    for(const id of ids){
      await page.goto(origin+`/#/play/${id}`);await page.reload();
      await page.locator('[data-action="start"]').waitFor({state:'visible'});
      const metrics=await page.evaluate(()=>{
        const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
        return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,canvas:rect('canvas'),pause:rect('#pause'),exit:rect('.landscape-exit'),start:rect('[data-action="start"]'),touch:matchMedia('(pointer:coarse)').matches};
      });
      const shortLandscape=width>height&&height<=500;
      const within=r=>r.y>=-1&&r.x>=-1&&r.bottom<=height+1&&r.right<=width+1;
      const target=id==='pairs'?100:id==='slide'?120:96;
      const passed=metrics.scrollWidth<=width+1&&metrics.pause.height>=44&&(!['lights','pairs','pipes','bubbles','slide','mines','constellation'].includes(id)||metrics.canvas.width*target/600>=44)&&(shortLandscape?within(metrics.canvas)&&within(metrics.pause)&&within(metrics.exit)&&within(metrics.start):true);
      checks.push({id,width,height,passed,canvasWidth:Math.round(metrics.canvas.width),canvasHeight:Math.round(metrics.canvas.height)});
      if(!passed)throw new Error(JSON.stringify({id,metrics,shortLandscape}));
      if(id==='lights'&&width===320)await page.screenshot({path:'output/playwright/mobile-small-portrait.png',fullPage:true});
    }
  }
  await page.setViewportSize({width:844,height:390});await page.goto(origin+'/#/play/bridge');await page.reload();
  await page.getByRole('button',{name:'搭起第一座桥 ↗'}).tap();
  await page.screenshot({path:'output/playwright/mobile-landscape.png'});
  return {origin,passed:checks.length,checks};
}
