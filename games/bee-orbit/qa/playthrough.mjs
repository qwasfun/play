import { BEE_ORBIT, gateWindow, generateGates } from '../src/course.js';

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
  await page.clock.runFor(1200);
  ensure((await page.locator('#live-score').innerText()) === score, '暂停时蜜蜂不应经过花桥');
  await page.locator('[data-action="resume"]').click();
  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();
  await resumeIfNeeded(page);

  if (!mobile) {
    await canvas.focus();
    await page.keyboard.press('Space');
    ensure((await page.locator('#game-hint').innerText()).includes('环'), '空格未切换花环');
    await page.locator('#restart').click();
    await page.locator('[data-action="again"]').click();
    await page.locator('#pause:enabled').waitFor();
    await resumeIfNeeded(page);
  }

  const gates = generateGates(seed);
  let lane = 0;
  for (let progress = 0; progress < BEE_ORBIT.total; progress++) {
    if (lane !== gates[progress].lane) {
      if (mobile) await point(300, 450);
      else await page.keyboard.press('Space');
      lane = 1 - lane;
    }
    await page.clock.runFor(gateWindow(progress) * 1000);
    const expectedScore = (progress + 1) * BEE_ORBIT.score;
    for (let frame = 0; frame < 6; frame++) {
      if (Number(await page.locator('#live-score').innerText()) === expectedScore) break;
      await page.clock.runFor(25);
    }
    ensure(
      Number(await page.locator('#live-score').innerText()) === expectedScore,
      `第 ${progress + 1} 座花桥未由真实输入采到花粉`,
    );
    if (progress < BEE_ORBIT.total - 1)
      await page.clock.runFor((BEE_ORBIT.bloomTime + 0.02) * 1000);
  }
  await page.locator('.result-card').waitFor();
  ensure((await page.locator('.result-card h2').innerText()).includes('完成'), '未完成十二簇采蜜');
  ensure((await page.locator('.result-score').innerText()).includes('1200'), '结算分数不是 1200');
  console.log(
    'bee-orbit: twelve dual-ring pollen gates, keyboard and pointer, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
