import { bridgePoint, generatePuzzles } from '../src/index.js';

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
  const time = await page.locator('#live-time').innerText();
  await page.clock.runFor(1400);
  ensure((await page.locator('#live-time').innerText()) === time, '暂停时不应推进溪湾计时');
  await page.locator('[data-action="resume"]').click();

  const first = generatePuzzles(seed)[0];
  if (mobile) {
    const target = bridgePoint(first, first.edges[0]);
    await point(target.x, target.y);
    ensure((await page.locator('#game-hint').innerText()).includes('已搭'), '触屏未能搭桥');
  } else {
    await canvas.focus();
    await page.keyboard.press('Enter');
    ensure((await page.locator('#game-hint').innerText()).includes('已选中'), '键盘未能选石');
    await page.keyboard.press('z');
    ensure(
      (await page.locator('#game-hint').innerText()).includes('没有可以撤销'),
      '键盘撤销提示缺失',
    );
  }

  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();
  await resumeIfNeeded(page);

  for (const [round, puzzle] of generatePuzzles(seed).entries()) {
    for (const [index, edge] of puzzle.edges.entries()) {
      const target = bridgePoint(puzzle, edge);
      for (let count = 0; count < puzzle.solution[index]; count++) await point(target.x, target.y);
    }
    if (round < 2) await page.clock.runFor(750);
  }
  await page.locator('.result-card').waitFor();
  ensure((await page.locator('.result-card h2').innerText()).includes('完成'), '未连通三处溪湾');
  ensure((await page.locator('.result-score').innerText()).includes('1200'), '结算分数不是 1200');
  console.log(
    'brook-bridges: three unique connected bridge puzzles, keyboard and pointer, undo, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
