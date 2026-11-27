import { ACORN_GLIDE, generateCourse, pullPoint, START } from '../src/index.js';

const ensure = (condition, message) => {
  if (!condition) throw Error(message);
};

async function resumeIfNeeded(page) {
  const resume = page.locator('[data-action="resume"]');
  if (await resume.isVisible()) await resume.click();
}

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
    await resumeIfNeeded(page);
    ensure(
      await canvas.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 100 && rect.left >= 0 && rect.right <= innerWidth + 1;
      }),
      '横竖屏松果滑道越界',
    );
  }
  await page.setViewportSize({ width: mobile ? 390 : 1280, height: mobile ? 844 : 900 });
  await page.clock.runFor(80);
  await resumeIfNeeded(page);

  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  ensure(await page.locator('[data-action="resume"]').isVisible(), '进入全屏应暂停松果滑盘');
  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  await page.locator('[data-action="resume"]').click();

  await page.locator('#pause').click();
  const time = await page.locator('#live-time').innerText();
  await page.clock.runFor(1400);
  ensure((await page.locator('#live-time').innerText()) === time, '暂停时不应推进松果计时');
  await page.locator('[data-action="resume"]').click();

  const cdp = mobile ? await page.context().newCDPSession(page) : null;
  async function dragShot(item) {
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    ensure(box, '无法定位松果画布');
    const physical = (point) => ({
      x: box.x + (point.x * box.width) / 600,
      y: box.y + (point.y * box.height) / 480,
    });
    const start = physical(START);
    const end = physical(pullPoint(item));
    if (mobile) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 5 });
      await page.mouse.up();
    }
  }

  await dragShot(generateCourse(seed)[0]);
  await page.clock.runFor(4200);
  ensure((await page.locator('#live-score').innerText()) === '200', '鼠标或触屏滑击未命中花心');

  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();
  await resumeIfNeeded(page);

  for (const item of generateCourse(seed)) {
    if (mobile) await dragShot(item);
    else {
      await canvas.focus();
      const horizontal = item.angle / ACORN_GLIDE.angleStep;
      for (let step = 0; step < Math.abs(horizontal); step++)
        await page.keyboard.press(horizontal < 0 ? 'ArrowLeft' : 'ArrowRight');
      const strength = Math.round((item.power - 0.75) / ACORN_GLIDE.powerStep);
      for (let step = 0; step < Math.abs(strength); step++)
        await page.keyboard.press(strength < 0 ? 'ArrowDown' : 'ArrowUp');
      await page.keyboard.press('Space');
    }
    await page.clock.runFor(4200);
  }
  await cdp?.detach();
  await page.locator('.result-card').waitFor();
  ensure(
    (await page.locator('.result-card h2').innerText()).includes('完成'),
    '未完成六枚松果滑盘',
  );
  ensure(
    (await page.locator('.result-score').innerText()).includes('1200'),
    '松果结算分数不是 1200',
  );
  console.log(
    'acorn-glide: six deterministic friction shots, keyboard, mouse, touch drag, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
