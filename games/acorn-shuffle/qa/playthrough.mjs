import { generateRounds, SLOT_X } from '../src/index.js';

const ensure = (condition, message) => {
  if (!condition) throw Error(message);
};

async function resumeIfNeeded(page) {
  const resume = page.locator('[data-action="resume"]');
  if (await resume.isVisible()) await resume.click();
}

async function advanceUntilChoice(page, budget = 5000) {
  for (let waited = 0; waited <= budget; waited += 100) {
    await resumeIfNeeded(page);
    if ((await page.locator('#game-hint').innerText()).includes('交换停下')) return;
    await page.clock.runFor(100);
  }
  throw Error('等待叶篮停止后仍未进入选择阶段');
}

async function restart(page) {
  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();
  await page.clock.runFor(100);
  await resumeIfNeeded(page);
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
  await page.clock.runFor(1200);
  ensure((await page.locator('#live-time').innerText()) === time, '暂停时寻果计时应冻结');
  await page.locator('[data-action="resume"]').click();
  await restart(page);

  const rounds = generateRounds(seed);
  if (!mobile) {
    await advanceUntilChoice(page);
    await canvas.focus();
    const answer = rounds[0].finalSlot;
    const delta = answer - 1;
    for (let step = 0; step < Math.abs(delta); step++)
      await page.keyboard.press(delta < 0 ? 'ArrowLeft' : 'ArrowRight');
    await page.keyboard.press('Enter');
    ensure(Number(await page.locator('#live-score').innerText()) === 100, '方向键与回车未找对叶篮');
    await restart(page);
  }

  for (const round of rounds) {
    await advanceUntilChoice(page);
    if (mobile || round.index % 2 === 0) {
      await point(SLOT_X[round.finalSlot], 270);
    } else {
      await page.keyboard.press(`Digit${round.finalSlot + 1}`);
    }
    const expected = (round.index + 1) * 100;
    ensure(
      Number(await page.locator('#live-score').innerText()) === expected,
      `第 ${round.index + 1} 轮未由真实输入找到橡果`,
    );
    if (round.index < rounds.length - 1) await page.clock.runFor(650);
  }
  await page.locator('.result-card').waitFor();
  ensure((await page.locator('.result-card h2').innerText()).includes('完成'), '未完成十二轮寻果');
  ensure((await page.locator('.result-score').innerText()).includes('1200'), '结算分数不是 1200');
  console.log(
    'acorn-shuffle: twelve tracked baskets, keyboard, pointer, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
