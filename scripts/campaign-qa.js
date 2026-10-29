async (page) => {
  const origin = new URL(page.url()).origin,
    ids = ['boxes', 'pipes', 'mines', 'lights', 'slide'],
    checks = [],
    errors = [],
    api = [];
  const check = (name, passed, detail = {}) => {
    checks.push({ name, passed: !!passed, ...detail });
    if (!passed) throw Error(JSON.stringify(checks.at(-1)));
  };
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/\/v1\//.test(request.url())) api.push(request.url());
  });
  page.setDefaultTimeout(15000);
  const map = await (await page.request.get(origin + '/module-map.json')).json(),
    definitions = {};
  for (const id of ids) {
    const entry = Object.entries(map).find(([key]) =>
      key.endsWith(`games/${id}/src/campaign.js`),
    )[1];
    definitions[id] = await page.evaluate(
      async (file) => (await import(new URL(file, location.href))).campaign,
      entry.file,
    );
  }
  const campaignKey = 'tiny-break-arcade:campaign:v1',
    legacyKey = 'tiny-break-arcade:v1';
  await page.evaluate(
    ({ campaignKey, legacyKey }) => {
      localStorage.removeItem(campaignKey);
      localStorage.setItem(
        legacyKey,
        JSON.stringify({
          version: 1,
          favorites: ['lights'],
          recent: [],
          sound: false,
          best: { lights: { score: 5, steps: 5, elapsed: 12, won: true } },
          daily: {},
        }),
      );
    },
    { campaignKey, legacyKey },
  );
  await page.reload();
  const open = async (id, number) => {
    await page.goto(origin + `/#/levels/${id}${number ? `/${number}?cv=1` : ''}`);
    await page
      .locator(number ? '[data-action="start"]' : '.level-grid')
      .first()
      .waitFor();
  };
  async function start() {
    await page.locator('[data-action="start"]').click();
    await page.locator('#game-overlay').waitFor({ state: 'hidden' });
  }
  async function tap(cell, size, hold = false, target = page) {
    const box = await target.locator('canvas').boundingBox(),
      x = box.x + ((20 + (((cell % size) + 0.5) * 560) / size) * box.width) / 600,
      y = box.y + ((20 + ((Math.floor(cell / size) + 0.5) * 560) / size) * box.height) / 600;
    await target.mouse.move(x, y);
    await target.mouse.down();
    if (hold) await target.waitForTimeout(520);
    await target.mouse.up();
  }
  async function solve(id, level) {
    if (id === 'boxes')
      for (const letter of level.solution)
        await page
          .locator('canvas')
          .press({ U: 'ArrowUp', R: 'ArrowRight', D: 'ArrowDown', L: 'ArrowLeft' }[letter]);
    if (id === 'slide' || id === 'lights')
      for (const cell of level.solution) await tap(cell, level.size);
    if (id === 'pipes')
      for (let cell = 0; cell < level.solution.length; cell++)
        for (let n = 0; n < level.solution[cell]; n++) {
          if (await page.locator('.result-card').count()) break;
          await tap(cell, level.size);
        }
    if (id === 'mines')
      for (const action of level.solution) {
        if (await page.locator('.result-card').count()) break;
        await tap(action.cell, level.size, action.kind === 'flag');
      }
    await page.locator('.result-card').waitFor();
  }
  for (const id of ids) {
    await open(id);
    check(id + '_initial_lock', (await page.locator('.level-tile.locked').count()) === 19);
    await page.locator('.level-grid a').first().click();
    await start();
    await solve(id, definitions[id].levels[0]);
    check(
      id + '_actual_win_unlocks_next',
      (await page.getByRole('link', { name: '下一关 →', exact: true }).count()) === 1,
    );
    await page.getByRole('link', { name: '下一关 →', exact: true }).click();
    await page.locator('[data-action="start"]').waitFor();
    check(id + '_next_level_route', new URL(page.url()).hash.includes('/2?cv=1'));
    await page.reload();
    await page.locator('[data-action="start"]').waitFor();
    check(
      id + '_refresh_retains_unlock',
      await page
        .locator('h1')
        .textContent()
        .then((text) => text.includes('第 2 关')),
    );
    await page.goto(origin + `/#/levels/${id}/20?cv=1`);
    await page.locator('[role="alert"]').waitFor();
    check(
      id + '_shared_link_does_not_unlock',
      await page
        .locator('[role="alert"]')
        .textContent()
        .then((text) => text.includes('尚未解锁')),
    );
  }
  // Fixtures unlock advanced content; first-level progression above uses real wins.
  await page.evaluate(
    ({ campaignKey, ids }) => {
      const data = JSON.parse(localStorage.getItem(campaignKey));
      for (const id of ids) {
        data.games[id] ||= { version: 1, best: {} };
        for (let n = 1; n < 20; n++)
          data.games[id].best[n] ||= { won: true, steps: 100, elapsed: 300 };
      }
      localStorage.setItem(campaignKey, JSON.stringify(data));
    },
    { campaignKey, ids },
  );
  await page.reload();
  for (const id of ids) {
    await open(id, 20);
    await start();
    await solve(id, definitions[id].levels[19]);
    check(
      id + '_last_level_complete',
      await page
        .locator('.result-card h2')
        .textContent()
        .then((text) => text.includes('20 关全部完成')),
    );
    check(
      id + '_last_level_no_next',
      (await page.getByRole('link', { name: '下一关 →', exact: true }).count()) === 0,
    );
    await page.getByRole('button', { name: '重试本关 ↻', exact: true }).click();
    await page.locator('#game-overlay').waitFor({ state: 'hidden' });
    check(
      id + '_retry_restarts_steps',
      Number((await page.locator('#live-score').textContent()).trim()) === 0,
    );
  }
  await open('slide', 2);
  await start();
  await page.waitForTimeout(1100);
  await page.locator('#pause').click();
  const paused = await page.locator('#live-time').textContent();
  await page.waitForTimeout(1300);
  check('pause_freezes_timer', (await page.locator('#live-time').textContent()) === paused);
  await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).click();
  await page.waitForTimeout(1200);
  check('resume_advances_timer', (await page.locator('#live-time').textContent()) !== paused);
  await page.goto(origin + '/#/');
  await page.locator('.game-card[data-game="lights"] .play-link').waitFor();
  check(
    'home_defaults_to_campaign',
    (await page.locator('.game-card[data-game="lights"] .play-link').getAttribute('href')) ===
      '#/levels/lights',
  );
  await page.goto(origin + '/#/favorites');
  await page.locator('.game-card').waitFor();
  check(
    'favorites_default_to_campaign',
    (await page.locator('.game-card[data-game="lights"] .play-link').getAttribute('href')) ===
      '#/levels/lights',
  );
  await open('lights');
  check(
    'ordinary_mode_remains_available',
    (await page.getByRole('link', { name: '随心一局', exact: true }).getAttribute('href')) ===
      '#/play/lights',
  );
  const legacy = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), legacyKey);
  check(
    'legacy_best_and_favorites_preserved',
    legacy.best.lights.steps === 5 && legacy.favorites.includes('lights'),
  );
  check('campaigns_never_request_leaderboards', api.length === 0, { requests: api });
  const mobileContext = await page
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(origin);
  const saved = await page.evaluate((key) => localStorage.getItem(key), campaignKey);
  await mobile.evaluate(({ campaignKey, saved }) => localStorage.setItem(campaignKey, saved), {
    campaignKey,
    saved,
  });
  const sizes = [
    [320, 568],
    [568, 320],
    [375, 812],
    [812, 375],
    [390, 844],
    [844, 390],
    [768, 1024],
    [1024, 768],
  ];
  for (const [width, height] of sizes) {
    await mobile.setViewportSize({ width, height });
    for (const id of ids) {
      await mobile.goto(origin + `/#/levels/${id}/20?cv=1`);
      await mobile.reload();
      await mobile.locator('[data-action="start"]').waitFor();
      const metrics = await mobile.evaluate((size) => {
        const canvas = document.querySelector('canvas').getBoundingClientRect(),
          controls = [...document.querySelectorAll('.game-controls .button')]
            .map((el) => el.getBoundingClientRect())
            .filter((rect) => rect.width && rect.height);
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          hit: (canvas.width * 560) / 600 / size,
          canvas: { x: canvas.x, y: canvas.y, right: canvas.right, bottom: canvas.bottom },
          minButton: Math.min(...controls.map((r) => r.height)),
        };
      }, definitions[id].levels[19].size);
      check(
        `${id}_layout_${width}x${height}`,
        !metrics.overflow &&
          metrics.minButton >= 44 &&
          (id === 'boxes' || metrics.hit >= 44) &&
          (width < height ||
            height > 500 ||
            (metrics.canvas.y >= 0 && metrics.canvas.bottom <= height + 1)),
        metrics,
      );
    }
  }
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(origin + '/#/levels/mines/20?cv=1');
  await mobile.locator('[data-action="start"]').tap();
  await mobile.locator('#game-overlay').waitFor({ state: 'hidden' });
  const rect = await mobile.locator('canvas').boundingBox(),
    cell = definitions.mines.levels[19].mines[0],
    x = rect.x + ((20 + (((cell % 6) + 0.5) * 560) / 6) * rect.width) / 600,
    y = rect.y + ((20 + ((Math.floor(cell / 6) + 0.5) * 560) / 6) * rect.height) / 600;
  await mobile.dispatchEvent('canvas', 'pointerdown', {
    pointerId: 99,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
  await mobile.waitForTimeout(600);
  await mobile.dispatchEvent('canvas', 'pointerup', {
    pointerId: 99,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
  check(
    'mobile_long_hold_flags_without_failure',
    (await mobile.locator('.result-card').count()) === 0,
  );
  await mobile.touchscreen.tap(x, y);
  check('flagged_cell_is_not_revealed', (await mobile.locator('.result-card').count()) === 0);
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.getByRole('button', { name: '继续游戏 ▶', exact: true }).waitFor();
  check('rotation_pauses', true);
  await mobile.getByRole('button', { name: '继续游戏 ▶', exact: true }).tap();
  await mobile.locator('#fullscreen-toggle').tap();
  await mobile.getByRole('button', { name: '继续游戏 ▶', exact: true }).waitFor();
  check('fullscreen_is_active', (await mobile.locator('.play-main.is-fullscreen').count()) === 1);
  await mobile.locator('#fullscreen-toggle').tap();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(origin + '/#/levels/lights');
  await mobile.locator('.level-grid').first().waitFor();
  await mobile.screenshot({ path: 'output/playwright/campaign-levels-mobile.png', fullPage: true });
  await mobile.goto(origin + '/#/levels/mines/20?cv=1');
  await mobile.locator('[data-action="start"]').waitFor();
  await mobile.locator('[data-action="start"]').tap();
  await mobile.locator('#game-overlay').waitFor({ state: 'hidden' });
  await mobile.screenshot({ path: 'output/playwright/campaign-mines-mobile.png', fullPage: true });
  await mobileContext.close();
  await page.goto(origin + '/#/');
  await page.locator('[data-offline-status][data-state="ready"]').first().waitFor();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.context().setOffline(true);
  for (const id of ids) {
    await open(id);
    await page.reload();
    await page.locator('.level-grid').first().waitFor();
    await open(id, 20);
    await start();
    check(
      id + '_offline_campaign_ready',
      (await page.locator('canvas').getAttribute('height')) === '600',
    );
  }
  await page.context().setOffline(false);
  check('no_runtime_errors', errors.length === 0, { errors });
  await page.goto(origin + '/#/levels/lights');
  return { passed: checks.length, checks };
};
