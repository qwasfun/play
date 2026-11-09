import { colorAtDirection, generateDrops, PETAL_WHEEL, responseWindow } from '../src/course.js';

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
      '横竖屏画布越界',
    );
  }
  await page.setViewportSize({ width: mobile ? 390 : 1280, height: mobile ? 844 : 900 });
  await page.clock.runFor(80);
  await resumeIfNeeded(page);

  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  ensure(await page.locator('[data-action="resume"]').isVisible(), '进入全屏应暂停');
  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  await page.locator('[data-action="resume"]').click();

  await page.locator('#pause').click();
  const score = await page.locator('#live-score').innerText();
  await page.clock.runFor(1500);
  ensure((await page.locator('#live-score').innerText()) === score, '暂停时不应结算露珠');
  await page.locator('[data-action="resume"]').click();
  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();
  await resumeIfNeeded(page);

  if (!mobile) {
    await canvas.focus();
    await page.keyboard.press('ArrowRight');
    await page.clock.runFor(30);
    ensure((await page.locator('#game-hint').innerText()).includes('花瓣'), '键盘未转动花轮');
    await page.locator('#restart').click();
    await page.locator('[data-action="again"]').click();
    await page.locator('#pause:enabled').waitFor();
    await resumeIfNeeded(page);
  }

  const drops = generateDrops(seed);
  let rotation = 0;
  for (let progress = 0; progress < PETAL_WHEEL.total; progress++) {
    const drop = drops[progress];
    while (colorAtDirection(rotation, drop.direction) !== drop.color) {
      if (mobile) await point(500, 451);
      else await page.keyboard.press('ArrowRight');
      rotation = (rotation + 1) % 4;
    }
    await page.clock.runFor((responseWindow(progress) + 0.03) * 1000);
    ensure(
      Number(await page.locator('#live-score').innerText()) === (progress + 1) * PETAL_WHEEL.score,
      `第 ${progress + 1} 颗露珠未被真实输入接住`,
    );
    if (progress < PETAL_WHEEL.total - 1)
      await page.clock.runFor((PETAL_WHEEL.bloomTime + 0.04) * 1000);
  }
  await page.locator('.result-card').waitFor();
  ensure(
    (await page.locator('.result-card h2').innerText()).includes('完成'),
    '未真实接住二十颗露珠',
  );
  ensure((await page.locator('.result-score').innerText()).includes('1200'), '结算分数不是 1200');
  console.log(
    'petal-wheel: twenty directional color catches, keyboard and pointer, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
