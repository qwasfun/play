import { CELL, GARDEN_PLOTS, BOARD_X, BOARD_Y, generateBoards } from '../src/index.js';

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
      '横竖屏花圃画布越界',
    );
  }
  await page.setViewportSize({ width: mobile ? 390 : 1280, height: mobile ? 844 : 900 });
  await page.clock.runFor(80);
  await resumeIfNeeded(page);

  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  ensure(await page.locator('[data-action="resume"]').isVisible(), '进入全屏应暂停花圃分畦');
  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  await page.locator('[data-action="resume"]').click();

  await page.locator('#pause').click();
  const time = await page.locator('#live-time').innerText();
  await page.clock.runFor(1400);
  ensure((await page.locator('#live-time').innerText()) === time, '暂停时不应推进花圃计时');
  await page.locator('[data-action="resume"]').click();

  const cdp = await page.context().newCDPSession(page);
  async function dragRect(rect) {
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    ensure(box, '无法定位花圃画布');
    const physical = (cell) => ({
      x: box.x + ((BOARD_X + (cell.c + 0.5) * CELL) * box.width) / 600,
      y: box.y + ((BOARD_Y + (cell.r + 0.5) * CELL) * box.height) / 480,
    });
    const start = physical({ r: rect.r, c: rect.c });
    const end = physical({ r: rect.r + rect.h - 1, c: rect.c + rect.w - 1 });
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

  await dragRect(generateBoards(seed)[0].solution[0]);
  ensure((await page.locator('#live-extra').innerText()).includes('已分 1 块'), '拖动未能落下花畦');
  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();
  await resumeIfNeeded(page);

  for (const [boardIndex, board] of generateBoards(seed).entries()) {
    if (mobile) {
      for (const rect of board.solution) await dragRect(rect);
    } else {
      let cursor = { r: 0, c: 0 };
      await canvas.focus();
      for (const rect of board.solution) {
        const start = { r: rect.r, c: rect.c };
        const end = { r: rect.r + rect.h - 1, c: rect.c + rect.w - 1 };
        while (cursor.r < start.r) (await page.keyboard.press('ArrowDown'), cursor.r++);
        while (cursor.r > start.r) (await page.keyboard.press('ArrowUp'), cursor.r--);
        while (cursor.c < start.c) (await page.keyboard.press('ArrowRight'), cursor.c++);
        while (cursor.c > start.c) (await page.keyboard.press('ArrowLeft'), cursor.c--);
        await page.keyboard.press('Space');
        while (cursor.r < end.r) (await page.keyboard.press('s'), cursor.r++);
        while (cursor.c < end.c) (await page.keyboard.press('d'), cursor.c++);
        await page.keyboard.press('Enter');
      }
    }
    if (boardIndex < GARDEN_PLOTS.boards - 1) await page.clock.runFor(900);
  }
  await cdp.detach();
  await page.locator('.result-card').waitFor();
  ensure((await page.locator('.result-card h2').innerText()).includes('完成'), '未完成三座花圃');
  ensure(
    (await page.locator('.result-score').innerText()).includes('1200'),
    '花圃结算分数不是 1200',
  );
  console.log(
    'garden-plots: three rectangle partition puzzles, keyboard, mouse, touch drag, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
