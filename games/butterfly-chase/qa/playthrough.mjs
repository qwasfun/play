import { BUTTERFLY_CHASE, generateGarden } from '../src/course.js';

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
  ensure((await page.locator('#live-score').innerText()) === score, '暂停时不应移动或计分');
  await page.locator('[data-action="resume"]').click();
  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();
  await resumeIfNeeded(page);

  if (!mobile) {
    await canvas.focus();
    await page.keyboard.down('ArrowRight');
    await page.clock.runFor(100);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('Space');
    await page.clock.runFor(30);
    ensure((await page.locator('#live-extra').innerText()) === '♥ 2', '空格未触发捕捉');
    await page.locator('#restart').click();
    await page.locator('[data-action="again"]').click();
    await page.locator('#pause:enabled').waitFor();
    await resumeIfNeeded(page);
  }

  for (let progress = 0; progress < BUTTERFLY_CHASE.total; progress++) {
    const garden = generateGarden(seed, progress);
    const target = garden.butterflies.find((butterfly) => butterfly.id === garden.target);
    await point(target.x, target.y);
    if (progress < BUTTERFLY_CHASE.total - 1)
      await page.clock.runFor((BUTTERFLY_CHASE.bloomTime + 0.03) * 1000);
  }
  await page.locator('.result-card').waitFor();
  ensure(
    (await page.locator('.result-card h2').innerText()).includes('完成'),
    '未真实找到十二只蝶影',
  );
  ensure((await page.locator('.result-score').innerText()).includes('1200'), '结算分数不是 1200');
  console.log(
    'butterfly-chase: twelve tracked targets, pointer, keyboard, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
