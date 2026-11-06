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

  const physical = async ({ x, y }) => {
    const box = await canvas.boundingBox();
    ensure(box, '无法定位游戏画布');
    return { x: box.x + (x * box.width) / 600, y: box.y + (y * box.height) / 480 };
  };
  const cdp = mobile ? await page.context().newCDPSession(page) : null;
  const tap = async (logical) => {
    const target = await physical(logical);
    if (mobile) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [target] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else await page.mouse.click(target.x, target.y);
    await page.clock.runFor(30);
  };

  if (mobile) {
    await tap({ x: 430, y: 109 });
    await tap({ x: 458, y: 392 });
  } else {
    await canvas.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    ensure((await page.locator('#live-extra').innerText()).includes('1 步'), '回车未旋转花钿');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
  }
  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();

  const puzzles = generatePuzzles(seed);
  for (const [round, puzzle] of puzzles.entries()) {
    for (const [index, piece] of puzzle.pieces.entries()) {
      await tap({ x: 430, y: 82 + index * 54 + 27 });
      for (let turn = piece.initialRotation; turn % 4 !== 0; turn++) await tap({ x: 458, y: 392 });
      await tap({
        x: 54 + piece.solution.column * 56 + 28,
        y: 96 + piece.solution.row * 56 + 28,
      });
    }
    if (round < puzzles.length - 1) await page.clock.runFor(800);
  }
  await cdp?.detach();
  await page.locator('.result-card').waitFor();
  ensure((await page.locator('.result-card h2').innerText()).includes('完成'), '未装满三只花匣');
  ensure((await page.locator('.result-score').innerText()).includes('1200'), '结算分数不是 1200');
  console.log(
    'petal-packing: three pentomino boxes, rotation, keyboard and pointer, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
