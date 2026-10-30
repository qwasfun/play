import {generateCourse,passTime,ringCenter} from '../src/course.js';
const ensure=(ok,message)=>{if(!ok)throw Error(message);};
export async function play({page,mobile,point,seed}) {
  const canvas=page.locator('#game-canvas');
  const height=()=>canvas.evaluate(el=>{
    const ctx=el.getContext('2d'),data=ctx.getImageData(133,70,1,340).data,ys=[];
    for(let i=0;i<340;i++)if(data[i*4]===215&&data[i*4+1]===126&&data[i*4+2]===105)ys.push(i+70);
    if(!ys.length)throw Error('未找到纸鸢');return ys.reduce((a,b)=>a+b)/ys.length;
  });
  // Check layout and pause semantics before restarting the same seeded flight.
  for(const [width,height] of [[375,812],[812,375],[390,844],[844,390],[320,568],[568,320],[768,1024],[1024,768]]) {
    await page.setViewportSize({width,height});await page.clock.runFor(100);
    if(await page.locator('[data-action="resume"]').isVisible())await page.locator('[data-action="resume"]').click();
    ensure(await canvas.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>100&&r.left>=0&&r.right<=innerWidth+1;}),'横竖屏画布越界');
  }
  await page.setViewportSize({width:mobile?390:1280,height:mobile?844:900});await page.clock.runFor(100);
  if(await page.locator('[data-action="resume"]').isVisible())await page.locator('[data-action="resume"]').click();
  await page.locator('#fullscreen-toggle').click();await page.clock.runFor(100);
  ensure(await page.locator('[data-action="resume"]').isVisible(),'进入全屏应暂停');
  await page.locator('#fullscreen-toggle').click();await page.clock.runFor(100);
  await page.locator('[data-action="resume"]').click();
  await page.locator('#pause').click();const score=await page.locator('#live-score').innerText();
  await page.clock.runFor(2000);ensure(await page.locator('#live-score').innerText()===score,'暂停不应得分');
  await page.locator('[data-action="resume"]').click();
  await page.locator('#restart').click();await page.locator('[data-action="again"]').click();await page.locator('#pause:enabled').waitFor();
  await page.clock.runFor(50);

  const cdp=mobile?await page.context().newCDPSession(page):null;
  let held=0,mouseMode=true;
  async function move(dir) {
    if(dir===held)return;
    if(mobile){
      if(!dir){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
      else{
        await canvas.scrollIntoViewIfNeeded();const b=await canvas.boundingBox();
        await cdp.send('Input.dispatchTouchEvent',{type:held?'touchMove':'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height*(dir<0?.25:.75),id:1}]});
      }
    }else if(mouseMode){
      if(held)await page.mouse.up();
      if(dir){await canvas.scrollIntoViewIfNeeded();const b=await canvas.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height*(dir<0?.25:.75));await page.mouse.down();}
    }else{
      if(held)await page.keyboard.up(held<0?'ArrowUp':'ArrowDown');
      if(dir)await page.keyboard.down(dir<0?'ArrowUp':'ArrowDown');
    }
    held=dir;
  }
  // Real held inputs must stop through pause, and remain stopped after resume.
  const before=await height();await move(-1);await page.clock.runFor(250);
  ensure(await height()<before-20,'持续升高输入没有生效');
  await page.keyboard.press('Escape');await move(0);
  ensure(await page.locator('[data-action="resume"]').isVisible(),'Escape 应暂停');
  await page.locator('[data-action="resume"]').click();const pausedY=await height();
  await page.clock.runFor(250);ensure(Math.abs(await height()-pausedY)<3,'恢复时牵线仍被卡住');
  await page.locator('#restart').click();await page.locator('[data-action="again"]').click();await page.locator('#pause:enabled').waitFor();
  await page.clock.runFor(50);

  const course=generateCourse(seed);
  for(let ms=0;ms<36000;ms+=100){
    if(await page.locator('.result-card').isVisible())break;
    const time=ms/1000,index=course.findIndex(ring=>passTime(ring)>time+.02);
    const target=ringCenter(course[index<0?11:index],passTime(course[index<0?11:index]));
    const y=await height(),dir=Math.abs(y-target)<12?0:y>target?-1:1;
    if(!mobile&&ms===4000){await move(0);mouseMode=false;await canvas.focus();}
    await move(dir);await page.clock.runFor(100);
  }
  await move(0);await cdp?.detach();
  await page.locator('.result-card').waitFor();
  ensure((await page.locator('.result-card h2').innerText()).includes('完成'),'未真实完成旅途');
  ensure((await page.locator('.result-score').innerText()).includes('1200'),'未穿过全部十二道花环');
  // The shared verifier checks actual isolated rank receipt and best score after reload.
  console.log('kite: complete flight, held input cancellation, restart, full screen and eight layouts',mobile?'touch':'desktop');
}
