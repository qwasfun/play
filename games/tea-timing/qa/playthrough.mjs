import { generateCourse, kettlePoint } from '../src/index.js';

const ensure = (condition, message) => {
  if (!condition) throw Error(message);
};

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
  await page.clock.runFor(1500);
  ensure((await page.locator('#live-score').innerText()) === score, '暂停时不应推进游戏');
  await page.locator('[data-action="resume"]').click();

  const course = generateCourse(seed);
  await page.clock.runFor(course[0].duration * 720);
  if (mobile) {
    const target = kettlePoint(course[0].station);
    await point(target.x, target.y);
  } else {
    await canvas.focus();
    await page.keyboard.press(['a', 's', 'd'][course[0].station]);
  }
  ensure((await page.locator('#live-score').innerText()) === '100', '实际输入未候好第一壶茶');

  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();

  for (const [index, entry] of course.entries()) {
    await page.clock.runFor(entry.duration * 720);
    const target = kettlePoint(entry.station);
    await point(target.x, target.y);
    if (index < course.length - 1) await page.clock.runFor(450);
  }
  await page.locator('.result-card').waitFor();
  ensure((await page.locator('.result-card h2').innerText()).includes('完成'), '未候好十二壶茶');
  ensure((await page.locator('.result-score').innerText()).includes('1200'), '结算分数不是 1200');
  console.log(
    'tea-timing: twelve timed kettles, keyboard and pointer, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
