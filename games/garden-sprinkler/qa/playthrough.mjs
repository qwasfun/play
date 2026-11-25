import { GARDEN_SPRINKLER, generateCourse, potPoint } from '../src/index.js';

const ensure = (condition, message) => {
  if (!condition) throw Error(message);
};

async function resumeIfNeeded(page) {
  const resume = page.locator('[data-action="resume"]');
  if (await resume.isVisible()) await resume.click();
}

export async function play({ page, mobile, point, seed }) {
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
      '横竖屏浇园画布越界',
    );
  }
  await page.setViewportSize({ width: mobile ? 390 : 1280, height: mobile ? 844 : 900 });
  await page.clock.runFor(80);
  await resumeIfNeeded(page);

  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  ensure(await page.locator('[data-action="resume"]').isVisible(), '进入全屏应暂停浇园');
  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  await page.locator('[data-action="resume"]').click();

  await page.locator('#pause').click();
  const time = await page.locator('#live-time').innerText();
  await page.clock.runFor(1400);
  ensure((await page.locator('#live-time').innerText()) === time, '暂停时不应推进浇园计时');
  await page.locator('[data-action="resume"]').click();
  await page.clock.runFor(520);

  const first = generateCourse(seed)[0];
  if (mobile) {
    const target = potPoint(first.pot);
    await point(target.x, target.y);
    ensure((await page.locator('#game-hint').innerText()).includes('舒展开'), '触屏未能浇开花盆');
  } else {
    await canvas.focus();
    const wrong = (first.pot + 1) % GARDEN_SPRINKLER.pots;
    for (let step = 0; step < wrong; step++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    ensure((await page.locator('#game-hint').innerText()).includes('空花盆'), '键盘喷水反馈缺失');
  }

  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();
  await resumeIfNeeded(page);

  for (const item of generateCourse(seed)) {
    await page.clock.runFor(520);
    const target = potPoint(item.pot);
    await point(target.x, target.y);
  }
  await page.locator('.result-card').waitFor();
  ensure((await page.locator('.result-card h2').innerText()).includes('完成'), '未浇开十二盆小花');
  ensure((await page.locator('.result-score').innerText()).includes('1200'), '结算分数不是 1200');
  console.log(
    'garden-sprinkler: twelve radial reaction targets, keyboard, pointer, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
