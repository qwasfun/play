import { generatePuzzles } from '../src/puzzles.js';

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
  await page.clock.runFor(1500);
  ensure((await page.locator('#live-score').innerText()) === score, '暂停时不应推进游戏');
  await page.locator('[data-action="resume"]').click();

  if (!mobile) {
    await canvas.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
  }
  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();

  const cdp = mobile ? await page.context().newCDPSession(page) : null;
  const puzzles = generatePuzzles(seed);
  for (const [round, puzzle] of puzzles.entries()) {
    for (const route of puzzle.routes) {
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      ensure(box, '无法定位游戏画布');
      const physical = ({ row, column }) => ({
        x: box.x + ((150 + column * 60 + 30) * box.width) / 600,
        y: box.y + ((82 + row * 60 + 30) * box.height) / 480,
      });
      const start = physical(route.cells[0]);
      if (mobile)
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [start],
        });
      else {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
      }
      for (const cell of route.cells.slice(1)) {
        const target = physical(cell);
        if (mobile)
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [target],
          });
        else await page.mouse.move(target.x, target.y, { steps: 3 });
        await page.clock.runFor(35);
      }
      if (mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      else await page.mouse.up();
    }
    if (round < puzzles.length - 1) await page.clock.runFor(800);
  }
  await cdp?.detach();
  await page.locator('.result-card').waitFor();
  ensure((await page.locator('.result-card h2').innerText()).includes('完成'), '未铺满三座花圃');
  ensure((await page.locator('.result-score').innerText()).includes('1200'), '结算分数不是 1200');
  console.log(
    'dew-links: three full-grid path puzzles, keyboard and pointer, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
