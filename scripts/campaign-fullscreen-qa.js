async (page) => {
  const origin = new URL(page.url()).origin,
    ids = ['boxes', 'pipes', 'mines', 'lights', 'slide'],
    checks = [],
    context = await page
      .context()
      .browser()
      .newContext({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } }),
    mobile = await context.newPage();
  try {
    await mobile.goto(origin);
    await mobile.evaluate((ids) => {
      const games = {};
      for (const id of ids) {
        const best = {};
        for (let n = 1; n < 20; n++) best[n] = { won: true, steps: 100, elapsed: 100 };
        games[id] = { version: 1, best };
      }
      localStorage.setItem('tiny-break-arcade:campaign:v1', JSON.stringify({ version: 1, games }));
    }, ids);
    for (const [width, height] of [
      [320, 568],
      [568, 320],
      [375, 812],
      [812, 375],
      [390, 844],
      [844, 390],
      [768, 1024],
      [1024, 768],
    ]) {
      await mobile.setViewportSize({ width, height });
      for (const id of ids) {
        await mobile.goto(origin + `/#/levels/${id}/20?cv=1`);
        await mobile.reload();
        await mobile.locator('[data-action="start"]').waitFor();
        await mobile.locator('#fullscreen-toggle').tap();
        await mobile.locator('.play-main.is-fullscreen').waitFor();
        const dimensions = await mobile.evaluate(
          (size) => {
            const canvas = document.querySelector('canvas').getBoundingClientRect(),
              buttons = [...document.querySelectorAll('.game-controls .button')]
                .map((el) => el.getBoundingClientRect())
                .filter((r) => r.width && r.height);
            return {
              width: canvas.width,
              height: canvas.height,
              hit: (canvas.width * 560) / 600 / size,
              inside:
                canvas.x >= 0 &&
                canvas.y >= 0 &&
                canvas.right <= innerWidth + 1 &&
                canvas.bottom <= innerHeight + 1,
              minButton: Math.min(...buttons.map((r) => r.height)),
            };
          },
          id === 'boxes' ? 7 : id === 'lights' ? 5 : id === 'slide' ? 3 : 6,
        );
        const passed =
          dimensions.inside &&
          dimensions.minButton >= 44 &&
          (id === 'boxes' || dimensions.hit >= 44);
        checks.push({ id, viewport: [width, height], passed, ...dimensions });
        if (!passed) throw Error(JSON.stringify(checks.at(-1)));
        await mobile.locator('#fullscreen-toggle').tap();
        await mobile.locator('.play-main.is-fullscreen').waitFor({ state: 'detached' });
      }
    }
    return { passed: checks.length, checks };
  } finally {
    await context.close();
  }
};
