import { DEW_HOP, DIRECTIONS, generateTargets } from '../src/index.js';

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
  ensure((await page.locator('#live-score').innerText()) === score, '暂停时不应收拢涟漪');
  await page.locator('[data-action="resume"]').click();
  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();
  await resumeIfNeeded(page);

  const targets = generateTargets(seed);
  if (!mobile) {
    await page.clock.runFor(DEW_HOP.revealTime * 1000 + 10);
    await canvas.focus();
    await page.keyboard.press(DIRECTIONS[targets[0].direction].key);
    ensure(Number(await page.locator('#live-score').innerText()) === 100, '方向键未能完成跳跃');
    await page.locator('#restart').click();
    await page.locator('[data-action="again"]').click();
    await page.locator('#pause:enabled').waitFor();
    await resumeIfNeeded(page);
  }

  for (let progress = 0; progress < DEW_HOP.total; progress++) {
    await page.clock.runFor(DEW_HOP.revealTime * 1000 + 10);
    const direction = DIRECTIONS[targets[progress].direction];
    if (mobile) await point(direction.x, direction.y);
    else await page.keyboard.press(direction.key);
    ensure(
      Number(await page.locator('#live-score').innerText()) === (progress + 1) * DEW_HOP.score,
      `第 ${progress + 1} 片荷叶未由真实输入跳中`,
    );
    if (progress < DEW_HOP.total - 1) await page.clock.runFor(DEW_HOP.hopTime * 1000 + 10);
  }
  await page.locator('.result-card').waitFor();
  ensure((await page.locator('.result-card h2').innerText()).includes('完成'), '未完成十二次跳荷');
  ensure((await page.locator('.result-score').innerText()).includes('1200'), '结算分数不是 1200');
  console.log(
    'dew-hop: twelve four-way lily targets, keyboard and pointer, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
