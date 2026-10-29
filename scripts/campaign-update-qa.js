async (page) => {
  const origin = new URL(page.url()).origin,
    context = page.context(),
    checks = [],
    errors = [],
    key = 'tiny-break-arcade:campaign:v1',
    legacyKey = 'tiny-break-arcade:v1';
  const releases = await (await page.request.get(origin + '/__qa__/releases')).json();
  if (releases.kind !== 'playground-pwa-update-qa') throw Error('更新验收：需要独立更新测试服务');
  const check = (name, passed) => {
    checks.push({ name, passed: !!passed });
    if (!passed) throw Error(name);
  };
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  await page.evaluate(async () => {
    for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
    for (const name of await caches.keys())
      if (name.startsWith('three-minute-playground-offline:')) await caches.delete(name);
  });
  await page.request.post(origin + '/__qa__/release', { data: 'A' });
  await page.goto(origin + '/#/');
  await page.reload();
  await page.locator('[data-offline-status][data-state="ready"]').first().waitFor();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.evaluate(
    ({ key, legacyKey }) => {
      localStorage.removeItem(key);
      localStorage.setItem(
        legacyKey,
        JSON.stringify({
          version: 1,
          favorites: ['lights'],
          recent: [],
          sound: false,
          best: { lights: { score: 4, steps: 4, elapsed: 10, won: true } },
          daily: {},
        }),
      );
    },
    { key, legacyKey },
  );
  await page.reload();
  const map = await (await page.request.get(origin + '/module-map.json')).json(),
    file = Object.entries(map).find(([path]) => path.endsWith('games/lights/src/campaign.js'))[1]
      .file;
  const level = await page.evaluate(
    async (file) => (await import(new URL(file, location.href))).campaign.levels[0],
    file,
  );
  await page.goto(origin + '/#/levels/lights/1?cv=1');
  await page.locator('[data-action="start"]').click();
  await page.locator('#game-overlay').waitFor({ state: 'hidden' });
  for (const cell of level.solution) {
    const box = await page.locator('canvas').boundingBox();
    await page.mouse.click(
      box.x + ((20 + (((cell % level.size) + 0.5) * 560) / level.size) * box.width) / 600,
      box.y +
        ((20 + ((Math.floor(cell / level.size) + 0.5) * 560) / level.size) * box.height) / 600,
    );
  }
  await page.locator('.result-card').waitFor();
  const saved = await page.evaluate((key) => localStorage.getItem(key), key);
  check('release_A_real_campaign_win_saved', JSON.parse(saved).games.lights.best[1].won);
  await page.getByRole('link', { name: '下一关 →', exact: true }).click();
  await page.locator('[data-action="start"]').click();
  await page.locator('#pause').click();
  await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).waitFor();
  await page.evaluate(() => {
    window.__campaignUpdateProbe = 'paused-A';
  });
  const legacy = await page.evaluate((key) => localStorage.getItem(key), legacyKey);
  await page.request.post(origin + '/__qa__/release', { data: 'B' });
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg.update();
  });
  await page.waitForFunction(
    async () => !!(await navigator.serviceWorker.getRegistration())?.waiting,
  );
  check(
    'new_release_waits_without_resetting_active_game',
    (await page.evaluate(() => window.__campaignUpdateProbe)) === 'paused-A' &&
      (await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).isVisible()),
  );
  check(
    'waiting_update_preserves_campaign_storage',
    (await page.evaluate((key) => localStorage.getItem(key), key)) === saved,
  );
  await context.setOffline(true);
  await page.reload();
  await page.locator('[data-action="start"]').waitFor();
  check(
    'old_release_reopens_unlocked_campaign_offline',
    await page
      .locator('h1')
      .textContent()
      .then((text) => text.includes('第 2 关')),
  );
  await page.goto(origin + '/#/levels/mines/1?cv=1');
  await page.locator('[data-action="start"]').waitFor();
  check(
    'old_release_opens_an_unplayed_campaign_offline',
    (await page.locator('canvas').getAttribute('height')) === '600',
  );
  await Promise.all(context.pages().map((target) => target.close()));
  await new Promise((resolve) => setTimeout(resolve, 400));
  const reopened = await context.newPage();
  reopened.on('pageerror', (error) => errors.push(error.message));
  await reopened.goto(origin + '/#/levels/lights');
  await reopened.locator('.level-grid').first().waitFor();
  const state = await reopened.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        channel.port1.close();
        resolve(event.data);
      };
      reg.active.postMessage({ type: 'OFFLINE_STATUS' }, [channel.port2]);
    });
  });
  check(
    'new_release_activates_after_old_windows_close',
    state.ready && state.version === releases.B.version,
  );
  check(
    'campaign_record_survives_release_upgrade',
    (await reopened.evaluate((key) => localStorage.getItem(key), key)) === saved,
  );
  check(
    'legacy_records_survive_release_upgrade',
    (await reopened.evaluate((key) => localStorage.getItem(key), legacyKey)) === legacy,
  );
  check(
    'new_release_shows_continue_on_level_two',
    (await reopened.getByRole('link', { name: '继续闯关 · 第 2 关 ↗', exact: true }).count()) === 1,
  );
  await reopened.getByRole('link', { name: '继续闯关 · 第 2 关 ↗', exact: true }).click();
  await reopened.locator('[data-action="start"]').click();
  await reopened.locator('#game-overlay').waitFor({ state: 'hidden' });
  check(
    'new_release_plays_saved_campaign_offline',
    (await reopened.locator('canvas').getAttribute('height')) === '600',
  );
  check('no_runtime_errors', errors.length === 0);
  await context.setOffline(false);
  return {
    passed: checks.length,
    releaseA: releases.A.version,
    releaseB: releases.B.version,
    checks,
  };
};
