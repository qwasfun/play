async (page) => {
  const origin=new URL(page.url()).origin,checks=[];
  const ids=await page.evaluate(async()=>{const{games}=await import('./catalog.js');return games.map(g=>g.id);});
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
      const target=id==='pairs'?100:96;
      const passed=metrics.scrollWidth<=width+1&&metrics.pause.height>=44&&(!['lights','pairs','pipes'].includes(id)||metrics.canvas.width*target/600>=44)&&(shortLandscape?within(metrics.canvas)&&within(metrics.pause)&&within(metrics.exit)&&within(metrics.start):true);
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
