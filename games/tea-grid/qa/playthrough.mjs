import { generatePuzzle } from '../src/puzzle.js';

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
  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();

  let cursor = generatePuzzle(seed, 0).fixed.findIndex((value) => !value);
  for (let round = 0; round < 3; round++) {
    const puzzle = generatePuzzle(seed, round);
    for (let index = 0; index < 16; index++) {
      if (puzzle.fixed[index]) continue;
      if (!mobile && round === 0) {
        const rowSteps = (Math.floor(index / 4) - Math.floor(cursor / 4) + 4) % 4,
          columnSteps = ((index % 4) - (cursor % 4) + 4) % 4;
        for (let n = 0; n < rowSteps; n++) await page.keyboard.press('ArrowDown');
        for (let n = 0; n < columnSteps; n++) await page.keyboard.press('ArrowRight');
        for (let n = 0; n < puzzle.solution[index]; n++) {
          await page.keyboard.press('Enter');
          await page.clock.runFor(20);
        }
        cursor = index;
      } else
        for (let n = 0; n < puzzle.solution[index]; n++) {
          await point(148 + (index % 4) * 76 + 38, 94 + Math.floor(index / 4) * 76 + 38);
          await page.clock.runFor(20);
        }
    }
    await page.clock.runFor(80);
    if (round < 2) cursor = generatePuzzle(seed, round + 1).fixed.findIndex((value) => !value);
  }
  await page.locator('.result-card').waitFor();
  ensure(
    (await page.locator('.result-card h2').innerText()).includes('完成'),
    '未真实完成三张茶席',
  );
  ensure((await page.locator('.result-score').innerText()).includes('300'), '结算分数不是 300');
  console.log(
    'tea-grid: three unique tables, keyboard and pointer, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
