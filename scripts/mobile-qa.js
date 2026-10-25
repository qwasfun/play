async (page) => {
  const origin = new URL(page.url()).origin;
  const cdp = await page.context().newCDPSession(page);
  const errors=[],checks=[];
  page.on('pageerror', error=>errors.push(error.message));
  page.setDefaultTimeout(7000);
  const check=(name,condition,detail={})=>{checks.push({name,passed:!!condition,...detail});if(!condition)throw new Error(JSON.stringify(checks.at(-1)));};
  const portrait={width:375,height:812},landscape={width:812,height:375};
  const starts={bridge:'搭起第一座桥 ↗',lights:'寻找熄灯的顺序 ↗',echo:'听一听森林 ↗',star:'出发送信 ↗'};
  async function open(id,date=''){
    await page.setViewportSize(portrait);
    await page.goto(origin+`/#/play/${id}${date?`?date=${date}&v=1`:''}`);
    await page.reload();
    await page.getByRole('button',{name:starts[id],exact:true}).tap();
    await page.locator('canvas').scrollIntoViewIfNeeded();
  }
  async function point(x=300,y=240,id=11){const r=await page.locator('canvas').boundingBox();return{x:r.x+x*r.width/600,y:r.y+y*r.height/480,id};}
  const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  const score=async()=>Number(await page.locator('#live-score').textContent());
  const lives=()=>page.locator('#live-extra').textContent();
  const time=()=>page.locator('#live-time').textContent();
  async function hold(milliseconds=1040){const p=await point();await touch('touchStart',[p]);await page.waitForTimeout(milliseconds);await touch('touchEnd');await page.waitForTimeout(500);}
  const env=await page.evaluate(()=>({touch:navigator.maxTouchPoints,coarse:matchMedia('(pointer:coarse)').matches}));
  check('mobile_touch_environment',env.touch>0&&env.coarse,env);
  await open('bridge','2026-10-23');await hold();
  check('long_press_release_scores',await score()===150,{score:await score()});

  await open('bridge','2026-10-23');
  const p1=await point(240,192,11),p2=await point(420,192,22);
  await touch('touchStart',[p1]);await page.waitForTimeout(300);
  await touch('touchStart',[p1,p2]);await page.waitForTimeout(100);
  await touch('touchEnd',[p2]);await page.waitForTimeout(640);
  await touch('touchEnd');await page.waitForTimeout(500);
  check('secondary_finger_release_keeps_primary_hold',await score()===150&&await lives()==='♥ ♥ ♥',{score:await score(),lives:await lives()});

  await open('bridge','2026-10-23');
  await touch('touchStart',[await point()]);await page.waitForTimeout(700);await touch('touchCancel');await page.waitForTimeout(500);
  check('system_cancel_does_not_drop_or_lose_life',await score()===0&&await lives()==='♥ ♥ ♥');
  await hold();check('new_touch_after_cancel_works',await score()===150);

  await open('bridge','2026-10-23');
  const start=await point(),scroll=await page.evaluate(()=>scrollY),r=await page.locator('canvas').boundingBox();
  await touch('touchStart',[start]);await page.waitForTimeout(600);
  await touch('touchMove',[{...start,x:Math.min(373,r.x+r.width+10)}]);await page.waitForTimeout(440);
  await touch('touchEnd');await page.waitForTimeout(500);
  check('drag_outside_then_release_uses_capture',await score()===150);
  check('game_gesture_does_not_scroll_page',await page.evaluate(()=>scrollY)===scroll);

  await open('bridge','2026-10-23');
  await touch('touchStart',[await point()]);await page.waitForTimeout(600);
  await page.setViewportSize(landscape);await page.waitForTimeout(150);
  check('rotation_while_holding_pauses',await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  await touch('touchEnd');const frozen=await time();await page.waitForTimeout(600);
  check('rotation_freezes_time_and_cancels_drop',await time()===frozen&&await score()===0&&await lives()==='♥ ♥ ♥');
  await page.screenshot({path:'output/playwright/mobile-landscape-paused.png'});
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();await hold();
  check('landscape_new_hold_uses_updated_coordinates',await score()===150);
  await page.setViewportSize(portrait);await page.waitForTimeout(150);
  check('portrait_return_keeps_score_and_pauses',await score()===150&&await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());

  await open('bridge','2026-10-23');
  await hold(2200);
  check('two_second_hold_has_controlled_result',await score()===0&&await lives()==='♥ ♥');
  const prevented=await page.locator('canvas').evaluate(canvas=>!canvas.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})));
  check('canvas_context_menu_blocked',prevented);

  await open('lights','2026-10-24');
  const a=await point(156,91,11),b=await point(252,91,22);
  await touch('touchStart',[a]);await touch('touchStart',[a,b]);await touch('touchEnd',[b]);await touch('touchEnd');
  check('lights_primary_tap_survives_second_finger',await score()===1);
  await page.setViewportSize(landscape);await page.waitForTimeout(150);
  check('lights_rotation_pauses_without_reset',await score()===1&&await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();
  const cell=await point(252,91);await page.touchscreen.tap(cell.x,cell.y);
  check('lights_tap_after_rotation_hits_one_tile',await score()===2);
  await page.getByRole('button',{name:'↶ 撤销',exact:true}).tap();
  check('touch_undo_keeps_count',await score()===2);
  await page.screenshot({path:'output/playwright/mobile-lights-landscape.png'});

  await open('echo','2026-10-25');
  const wrongDuringPlayback=await point(400,142);await page.touchscreen.tap(wrongDuringPlayback.x,wrongDuringPlayback.y);
  check('echo_playback_ignores_touch',await score()===0&&!await page.locator('.result-card').isVisible());
  await page.getByText('轮到你啦 · 0 / 1',{exact:true}).waitFor({state:'visible'});
  const first=await point(200,142);await page.touchscreen.tap(first.x,first.y);
  check('echo_touch_correct_answer_advances',await score()===1);
  await page.setViewportSize(landscape);await page.waitForTimeout(150);
  check('echo_rotation_preserves_round',await score()===1&&await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).tap();
  await page.getByText('轮到你啦 · 0 / 2',{exact:true}).waitFor({state:'visible'});
  for(const [x,y] of [[200,142],[400,320]]){const p=await point(x,y);await page.touchscreen.tap(p.x,p.y);}
  check('echo_landscape_touch_sequence_works',await score()===2);

  await open('star','2026-10-26');
  const s=await point();await page.touchscreen.tap(s.x,s.y);await page.waitForTimeout(300);
  await page.setViewportSize(landscape);await page.waitForTimeout(150);
  check('star_touch_and_rotation_keep_game_paused',await page.getByRole('button',{name:'继续游戏 ▶',exact:true}).isVisible());
  check('no_browser_runtime_errors',errors.length===0,{errors});
  await cdp.detach();
  return {origin,checks,passed:checks.length};
}
