import { generateCourse, LANE_Y, MOON_MOTH } from '../src/index.js';

const ensure = (condition, message) => {
  if (!condition) throw Error(message);
};

async function resumeIfNeeded(page) {
  const resume = page.locator('[data-action="resume"]');
  if (await resume.isVisible()) await resume.click();
}

async function chooseLane({ page, mobile, point, lane }) {
  if (mobile) await point(300, LANE_Y[lane]);
  else await page.keyboard.press(String(lane + 1));
}

async function advanceUntilScore(page, expected, budget) {
  for (let waited = 0; waited <= budget; waited += 100) {
    await resumeIfNeeded(page);
    if (Number(await page.locator('#live-score').innerText()) === expected) return;
    await page.clock.runFor(100);
  }
  throw Error(`等待光门抵达后分数仍不是 ${expected}`);
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
  ensure((await page.locator('#live-time').innerText()) === time, '暂停时追光计时应冻结');
  await page.locator('[data-action="resume"]').click();

  if (!mobile) {
    await canvas.focus();
    await page.keyboard.press('KeyW');
    ensure((await page.locator('#game-hint').innerText()).includes('第 1 条'), 'W 未向上换轨');
  } else {
    await point(300, LANE_Y[2]);
    ensure((await page.locator('#game-hint').innerText()).includes('第 3 条'), '触屏未直接换轨');
  }

  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();
  await page.clock.runFor(120);
  await resumeIfNeeded(page);

  const course = generateCourse(seed);
  for (const gate of course.gates) {
    await chooseLane({ page, mobile, point, lane: gate.lane });
    await advanceUntilScore(
      page,
      (gate.index + 1) * MOON_MOTH.score,
      gate.index === 0 ? 3800 : 3000,
    );
  }
  await page.locator('.result-card').waitFor();
  ensure((await page.locator('.result-card h2').innerText()).includes('完成'), '未追上十五盏暖灯');
  ensure((await page.locator('.result-score').innerText()).includes('1500'), '结算分数不是 1500');
  console.log(
    'moon-moth: fifteen three-lane light gates, keyboard and pointer, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
