import { FLOWER_OVERLAP, generateRounds, layerPoint } from '../src/index.js';

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
      '横竖屏花窗画布越界',
    );
  }
  await page.setViewportSize({ width: mobile ? 390 : 1280, height: mobile ? 844 : 900 });
  await page.clock.runFor(80);
  await resumeIfNeeded(page);

  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  ensure(await page.locator('[data-action="resume"]').isVisible(), '进入全屏应暂停花影叠窗');
  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  await page.locator('[data-action="resume"]').click();

  await page.locator('#pause').click();
  const time = await page.locator('#live-time').innerText();
  await page.clock.runFor(1400);
  ensure((await page.locator('#live-time').innerText()) === time, '暂停时不应推进花窗计时');
  await page.locator('[data-action="resume"]').click();

  if (mobile) {
    const target = layerPoint(0);
    await point(target.x, target.y);
    ensure(
      (await page.locator('#game-hint').innerText()).includes('顺时针旋转'),
      '触屏未能旋转模板',
    );
  } else {
    await canvas.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    ensure(
      (await page.locator('#game-hint').innerText()).includes('顺时针旋转'),
      '键盘未能旋转模板',
    );
    await page.keyboard.press('z');
    ensure((await page.locator('#game-hint').innerText()).includes('撤销'), '键盘撤销提示缺失');
  }

  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();
  await resumeIfNeeded(page);

  for (const [round, puzzle] of generateRounds(seed).entries()) {
    for (let layer = 0; layer < FLOWER_OVERLAP.layers; layer++) {
      const turns = (puzzle.solution[layer] - puzzle.initial[layer] + 4) % 4;
      const target = layerPoint(layer);
      for (let turn = 0; turn < turns; turn++) await point(target.x, target.y);
    }
    if (round < FLOWER_OVERLAP.rounds - 1) await page.clock.runFor(650);
  }
  await page.locator('.result-card').waitFor();
  ensure((await page.locator('.result-card h2').innerText()).includes('完成'), '未复原四扇花窗');
  ensure((await page.locator('.result-score').innerText()).includes('1200'), '结算分数不是 1200');
  console.log(
    'flower-overlap: four unique overlay puzzles, keyboard, pointer, undo, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
