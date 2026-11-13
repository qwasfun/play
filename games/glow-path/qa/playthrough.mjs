import { generateRoutes } from '../src/course.js';

const ensure = (condition, message) => {
  if (!condition) throw Error(message);
};

export async function play({ page, mobile, seed }) {
  const canvas = page.locator('#game-canvas');
  for (const [width, height] of [
    [375, 812],
    [812, 375],
    [390, 844],
    [844, 390],
    [320, 568],
    [568, 320],
    [768, 1024],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height });
    await page.clock.runFor(80);
    if (await page.locator('[data-action="resume"]').isVisible())
      await page.locator('[data-action="resume"]').click();
    ensure(
      await canvas.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 100 && rect.left >= 0 && rect.right <= innerWidth + 1;
      }),
      '横竖屏画布越界',
    );
  }
  await page.setViewportSize({ width: mobile ? 390 : 1280, height: mobile ? 844 : 900 });
  await page.clock.runFor(80);
  if (await page.locator('[data-action="resume"]').isVisible())
    await page.locator('[data-action="resume"]').click();

  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  ensure(await page.locator('[data-action="resume"]').isVisible(), '进入全屏应暂停');
  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  await page.locator('[data-action="resume"]').click();

  await page.locator('#pause').click();
  const score = await page.locator('#live-score').innerText();
  await page.clock.runFor(1700);
  ensure((await page.locator('#live-score').innerText()) === score, '暂停时不应移动或计分');
  await page.locator('[data-action="resume"]').click();
  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();

  if (!mobile) {
    await canvas.focus();
    await page.keyboard.down('ArrowRight');
    await page.clock.runFor(80);
    await page.keyboard.up('ArrowRight');
    await page.locator('#restart').click();
    await page.locator('[data-action="again"]').click();
    await page.locator('#pause:enabled').waitFor();
  }

  const cdp = mobile ? await page.context().newCDPSession(page) : null;
  const routes = generateRoutes(seed);
  for (const [routeIndex, route] of routes.entries()) {
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    ensure(box, '无法定位游戏画布');
    const physical = (point) => ({
      x: box.x + (point.x * box.width) / 600,
      y: box.y + (point.y * box.height) / 480,
    });
    const start = physical(route.points[0]);
    if (mobile)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [start],
      });
    else {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
    }
    for (const point of route.points.slice(1)) {
      const target = physical(point);
      if (mobile)
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [target],
        });
      else await page.mouse.move(target.x, target.y, { steps: 8 });
      await page.clock.runFor(55);
    }
    if (mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else await page.mouse.up();
    if (routeIndex < routes.length - 1) await page.clock.runFor(800);
  }
  await cdp?.detach();
  await page.locator('.result-card').waitFor();
  ensure(
    (await page.locator('.result-card h2').innerText()).includes('完成'),
    '未真实走完三段花径',
  );
  ensure((await page.locator('.result-score').innerText()).includes('1200'), '结算分数不是 1200');
  console.log(
    'glow-path: three seeded paths, keyboard and pointer, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
