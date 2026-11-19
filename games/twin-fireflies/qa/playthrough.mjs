import { generateCourse, TWIN_FIREFLIES } from '../src/index.js';

const ensure = (condition, message) => {
  if (!condition) throw Error(message);
};

async function resumeIfNeeded(page) {
  const resume = page.locator('[data-action="resume"]');
  if (await resume.isVisible()) await resume.click();
}

async function setGap({ page, mobile, point, current, target }) {
  let gap = current;
  while (gap !== target) {
    const direction = target < gap ? -1 : 1;
    if (mobile) await point(direction < 0 ? 120 : 480, 250);
    else await page.keyboard.press(direction < 0 ? 'ArrowLeft' : 'ArrowRight');
    gap += direction * TWIN_FIREFLIES.step;
  }
  return gap;
}

async function advanceUntilScore(page, expected, budget) {
  for (let waited = 0; waited <= budget; waited += 100) {
    await resumeIfNeeded(page);
    if (Number(await page.locator('#live-score').innerText()) === expected) return;
    await page.clock.runFor(100);
  }
  throw Error(`等待花门抵达后分数仍不是 ${expected}`);
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
  ensure((await page.locator('#live-time').innerText()) === time, '暂停时双萤计时应冻结');
  await page.locator('[data-action="resume"]').click();
  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();
  await page.clock.runFor(120);
  await resumeIfNeeded(page);

  const course = generateCourse(seed);
  if (!mobile) {
    await canvas.focus();
    const direction = course.gates[0].gap < TWIN_FIREFLIES.startGap ? 'KeyA' : 'KeyD';
    await page.keyboard.press(direction);
    ensure(
      (await page.locator('#game-hint').innerText()).includes(
        direction === 'KeyA' ? '收拢' : '展开',
      ),
      'A/D 未调整双萤间距',
    );
    await page.locator('#restart').click();
    await page.locator('[data-action="again"]').click();
    await page.locator('#pause:enabled').waitFor();
    await page.clock.runFor(120);
    await resumeIfNeeded(page);
  }

  let gap = TWIN_FIREFLIES.startGap;
  for (const gate of course.gates) {
    gap = await setGap({ page, mobile, point, current: gap, target: gate.gap });
    await advanceUntilScore(
      page,
      (gate.index + 1) * TWIN_FIREFLIES.score,
      gate.index === 0 ? 4500 : 4200,
    );
    ensure(
      Number(await page.locator('#live-score').innerText()) ===
        (gate.index + 1) * TWIN_FIREFLIES.score,
      `第 ${gate.index + 1} 道双花门未由真实输入穿过`,
    );
  }
  await page.locator('.result-card').waitFor();
  ensure(
    (await page.locator('.result-card h2').innerText()).includes('完成'),
    '未完成十二道双花门',
  );
  ensure((await page.locator('.result-score').innerText()).includes('1200'), '结算分数不是 1200');
  console.log(
    'twin-fireflies: twelve dual gates, keyboard and pointer, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
