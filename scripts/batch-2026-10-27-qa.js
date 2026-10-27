// Pass a Playwright Page from a cloud test browser; no runtime browser dependency.
export async function verifyBatch(page,{mobile=false,artifacts='output/playwright'}={}){
 const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 const check=(name,value)=>{checks.push(name);if(!value)throw Error(name);};
 await page.addInitScript(()=>{crypto.getRandomValues=array=>{array.fill(42);return array;};});
 await page.clock.install();await page.clock.pauseAt(new Date());
 const {makeSchedule}=await import('../games/lantern/src/index.js');const {makeGates}=await import('../games/sail/src/index.js');const {makePuzzles}=await import('../games/balance/src/index.js');const {makeBoards}=await import('../games/pebble/src/index.js');
 const click=async(x,y)=>{const c=page.locator('#game-canvas');await c.scrollIntoViewIfNeeded();const b=await c.boundingBox(),p={x:b.x+x/600*b.width,y:b.y+y/480*b.height};if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);};
 const btn=async selector=>{if(mobile)await page.locator(selector).tap();else await page.locator(selector).click();};
 const resume=async()=>{if(await page.locator('[data-action="resume"]').isVisible())await btn('[data-action="resume"]');};
 for(const id of ['lantern','sail','balance','pebble']){
  await page.goto('http://127.0.0.1:4175/#/play/'+id);await page.locator('[data-action="start"]').waitFor();await btn('[data-action="start"]');await page.locator('#game-overlay').waitFor({state:'hidden'});await page.clock.runFor(50);
  await btn('#pause');check(id+' pause',await page.locator('[data-action="resume"]').isVisible());const t=await page.locator('#live-time').innerText();await page.clock.runFor(2000);check(id+' frozen',t===await page.locator('#live-time').innerText());await resume();
  await btn('#restart');await btn('[data-action="again"]');await page.locator('#game-overlay').waitFor({state:'hidden'});await page.clock.runFor(50);check(id+' reset',await page.locator('#live-score').innerText()==='0');
  await btn('#fullscreen-toggle');check(id+' fullscreen',await page.locator('.play-main').evaluate(el=>el.classList.contains('is-fullscreen')));await btn('#fullscreen-toggle');await resume();
  await page.screenshot({path:`${artifacts}/${id}-${mobile?'mobile':'desktop'}.png`,fullPage:true});
  if(id==='lantern'){
   // Re-start at a known clock phase, then hit each complete round.
   await btn('#restart');await btn('[data-action="again"]');await page.locator('#game-overlay').waitFor({state:'hidden'});await page.clock.runFor(50);
   for(const i of makeSchedule(42)){await page.clock.runFor(650);await click(180+i%3*120,144+Math.floor(i/3)*108);await page.clock.runFor(850);}
  }else if(id==='sail'){
   let lane=1;for(const target of makeGates(42)){if(mobile)await click(140+target*160,420);else{while(lane!==target){await page.locator('#game-canvas').press(lane<target?'ArrowRight':'ArrowLeft');lane+=lane<target?1:-1;}}await page.clock.runFor(2400);}
  }else if(id==='balance'){
   for(const p of makePuzzles(42)){for(const i of p.solution)await click(160+i%3*140,205+Math.floor(i/3)*90);if(mobile)await click(300,400);else await page.locator('#game-canvas').press('Enter');}
  }else{
   for(const p of makeBoards(42))for(const [a,,c] of p.solution){await click(160+a%5*70,120+Math.floor(a/5)*70);await click(160+c%5*70,120+Math.floor(c/5)*70);}
  }
  await page.locator('.result-card').waitFor();check(id+' completed',await page.locator('.result-card').innerText().then(s=>s.includes('漂亮')));check(id+' saved',await page.evaluate(id=>!!JSON.parse(localStorage.getItem('tiny-break-arcade:v1')).best[id],id));
  await page.reload();await page.locator('[data-action="start"]').waitFor();check(id+' record reload',!(await page.locator('#best-record').innerText()).includes('等待'));
  for(const size of [{width:390,height:844},{width:844,height:390},{width:1280,height:900}]){await page.setViewportSize(size);await page.clock.runFor(100);check(id+` layout ${size.width}`,await page.locator('#game-canvas').evaluate(el=>{const r=el.getBoundingClientRect();return r.width>100&&r.right<=innerWidth+1&&r.left>=0;}));}
 }
 await page.goto('http://127.0.0.1:4175/');check('24 cards',await page.locator('[data-game]').count()===24);for(const id of ['lantern','sail','balance','pebble'])await btn(`[data-favorite="${id}"]`);await page.reload();check('favorites persisted',await page.evaluate(()=>JSON.parse(localStorage.getItem('tiny-break-arcade:v1')).favorites.length===4));check('no page errors',errors.length===0);return {checks:checks.length,errors};
}
