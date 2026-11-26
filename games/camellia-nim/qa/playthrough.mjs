import {
  bestMove,
  CAMELLIA_NIM,
  confirmPoint,
  generateGardens,
  pilePoint,
  takePoint,
} from '../src/index.js';

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
      '横竖屏茶花画布越界',
    );
  }
  await page.setViewportSize({ width: mobile ? 390 : 1280, height: mobile ? 844 : 900 });
  await page.clock.runFor(80);
  await resumeIfNeeded(page);

  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  ensure(await page.locator('[data-action="resume"]').isVisible(), '进入全屏应暂停茶花对弈');
  await page.locator('#fullscreen-toggle').click();
  await page.clock.runFor(80);
  await page.locator('[data-action="resume"]').click();

  await page.locator('#pause').click();
  const time = await page.locator('#live-time').innerText();
  await page.clock.runFor(1400);
  ensure((await page.locator('#live-time').innerText()) === time, '暂停时不应推进茶花计时');
  await page.locator('[data-action="resume"]').click();
  await page.locator('#restart').click();
  await page.locator('[data-action="again"]').click();
  await page.locator('#pause:enabled').waitFor();
  await resumeIfNeeded(page);

  for (const initial of generateGardens(seed)) {
    const piles = [...initial];
    while (piles.some(Boolean)) {
      const move = bestMove(piles);
      ensure(move, '必胜茶花局面缺少合法走法');
      if (mobile) {
        await point(pilePoint(move.pile).x, pilePoint(move.pile).y);
        await point(takePoint(move.take).x, takePoint(move.take).y);
        await point(confirmPoint().x, confirmPoint().y);
      } else {
        await page.keyboard.press(String(move.pile + 1));
        for (let count = 1; count < move.take; count++) await page.keyboard.press('ArrowUp');
        await page.keyboard.press('Space');
      }
      piles[move.pile] -= move.take;
      if (!piles.some(Boolean)) {
        await page.clock.runFor(CAMELLIA_NIM.transitionDelay * 1000 + 80);
        break;
      }
      const reply = bestMove(piles);
      ensure(reply, '刺猬回合缺少合法走法');
      await page.clock.runFor(CAMELLIA_NIM.hedgehogDelay * 1000 + 80);
      piles[reply.pile] -= reply.take;
      ensure(piles.some(Boolean), '必胜策略不应让刺猬拿到最后一片');
    }
  }

  await page.locator('.result-card').waitFor();
  ensure(
    (await page.locator('.result-card h2').innerText()).includes('完成'),
    '未赢下三座茶花花园',
  );
  ensure(
    (await page.locator('.result-score').innerText()).includes('1200'),
    '茶花结算分数不是 1200',
  );
  console.log(
    'camellia-nim: three bounded Nim gardens, optimal strategy, keyboard, pointer, pause, restart, fullscreen, eight layouts',
    mobile ? 'touch' : 'desktop',
  );
}
