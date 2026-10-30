async (page) => {
  const context = page.context(),
    origin = new URL(page.url()).origin,
    checks = [],
    errors = [];
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  const activate = (locator) => (touch ? locator.tap() : locator.click());
  const check = (name, passed) => {
    if (!passed) throw Error(name);
    checks.push(name);
  };
  try {
    const releases = await (await page.request.get(origin + '/__qa__/releases')).json();
    if (
      releases.kind !== 'playground-pwa-update-qa' ||
      !['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)
    )
      throw Error('需要独立更新测试服务');
    context.on('page', (target) => target.on('pageerror', (error) => errors.push(error.message)));
    page.on('pageerror', (error) => errors.push(error.message));
    page.setDefaultTimeout(15000);
    await page.evaluate(async () => {
      for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
      for (const name of await caches.keys())
        if (name.startsWith('three-minute-playground-offline:/:')) await caches.delete(name);
    });
    await page.request.post(origin + '/__qa__/release', { data: 'A' });
    await page.goto(origin + '/#/');
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.locator('[data-offline-status][data-state="ready"]').first().waitFor();
    const notice = page.locator('[data-pwa-update]');
    check('first_install_has_no_update_prompt', !(await notice.isVisible()));
    const count = await page.locator('.game-card').count();
    const manifest = await (await page.request.get(origin + '/manifest.webmanifest')).json();
    check(
      'manifest_and_status_follow_catalog_count',
      manifest.description.startsWith(`${count} 款`) &&
        (await page.locator('[data-offline-status]').first().textContent()).includes(`${count} 款`),
    );
    await page.goto(origin + '/#/play/mines');
    await activate(page.locator('[data-action="start"]'));
    await activate(page.locator('#pause:enabled'));
    await page.evaluate(() => {
      window.__updateProbe = 'old-game';
      document.querySelector('canvas').focus();
    });
    const saved = await page.evaluate(() => localStorage.getItem('tiny-break-arcade:v1'));
    const score = await page.locator('#live-score').textContent();
    await page.request.post(origin + '/__qa__/release', { data: 'B' });
    // Real network transition triggers the production online handler, with no polling.
    await context.setOffline(true);
    await context.setOffline(false);
    await notice.waitFor({ state: 'visible' });
    check(
      'prompt_keeps_focus_and_game',
      (await page.evaluate(
        () =>
          document.activeElement === document.querySelector('canvas') &&
          window.__updateProbe === 'old-game',
      )) && (await page.locator('#live-score').textContent()) === score,
    );
    check('prompt_does_not_open_a_modal', (await page.locator('dialog[open]').count()) === 0);
    await activate(page.getByRole('button', { name: '继续游戏 ▶', exact: true }));
    await activate(page.locator('#pause:enabled'));
    check(
      'game_controls_remain_usable',
      await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).isVisible(),
    );
    await page.screenshot({
      path: `output/playwright/pwa-update-${(await page.evaluate(() => navigator.maxTouchPoints > 0)) ? 'touch' : 'desktop'}.png`,
    });
    const other = await context.newPage();
    other.setDefaultTimeout(15000);
    await other.goto(origin + '/#/');
    await other.locator('[data-pwa-update]').waitFor({ state: 'visible' });
    await activate(other.locator('[data-update-later]'));
    await other.goto(origin + '/#/favorites');
    await other.reload();
    await other.locator('[data-offline-status][data-state="ready"]').first().waitFor();
    await other.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const worker = reg.waiting;
      if (worker)
        await new Promise((resolve) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = () => {
            channel.port1.close();
            resolve();
          };
          worker.postMessage({ type: 'OFFLINE_STATUS' }, [channel.port2]);
        });
    });
    check(
      'later_survives_reload_in_same_window',
      !(await other.locator('[data-pwa-update]').isVisible()),
    );
    await other.evaluate(() => {
      window.__otherProbe = 'still-A';
      window.__explicitUpdateChecks = 0;
      navigator.serviceWorker.getRegistration().then((reg) => {
        const update = reg.update.bind(reg);
        reg.update = () => {
          window.__explicitUpdateChecks++;
          return update();
        };
      });
    });
    await other.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    check(
      'visibility_does_not_check_for_updates',
      (await other.evaluate(() => window.__explicitUpdateChecks)) === 0,
    );
    await context.setOffline(true);
    await context.setOffline(false);
    await other.waitForFunction(() => window.__explicitUpdateChecks === 1);
    check(
      'later_stays_dismissed_after_navigation_and_online',
      !(await other.locator('[data-pwa-update]').isVisible()),
    );
    await page.evaluate(async (version) => {
      const cache = await caches.open('three-minute-playground-offline:/:' + version);
      window.__updateMarker = await cache.match(location.origin + '/__offline_complete__');
      await cache.delete(location.origin + '/__offline_complete__');
    }, releases.B.version);
    await activate(page.locator('[data-update-app]'));
    await page
      .locator('[data-update-description]')
      .filter({ hasText: '新版本离线资源不完整' })
      .waitFor();
    check(
      'failed_update_reports_reason_and_keeps_game',
      (await page.evaluate(() => window.__updateProbe)) === 'old-game' &&
        (await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).isVisible()),
    );
    await page.evaluate(async (version) => {
      const cache = await caches.open('three-minute-playground-offline:/:' + version);
      await cache.put(location.origin + '/__offline_complete__', window.__updateMarker);
    }, releases.B.version);
    // B has already been fully downloaded, so applying it works offline too.
    await context.setOffline(true);
    let navigations = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations++;
    });
    await activate(page.locator('[data-update-app]'));
    await page.waitForFunction(() => window.__updateProbe === undefined);
    await page.locator('[data-action="start"]').waitFor();
    check(
      'explicit_update_reloads_only_once_on_same_route',
      navigations === 1 && page.url() === origin + '/#/play/mines',
    );
    check(
      'saved_records_survive_update',
      (await page.evaluate(() => localStorage.getItem('tiny-break-arcade:v1'))) === saved,
    );
    check(
      'other_window_is_not_reloaded',
      (await other.evaluate(() => window.__otherProbe)) === 'still-A',
    );
    await other.goto(origin + '/#/play/tower');
    await activate(other.locator('[data-action="start"]'));
    await activate(other.locator('#pause:enabled'));
    check(
      'old_window_loads_unplayed_old_hashed_game_offline',
      (await other.getByRole('button', { name: '继续游戏 ▶', exact: true }).isVisible()) &&
        (await other.evaluate(() => window.__otherProbe)) === 'still-A',
    );
    check('updated_window_has_no_stale_prompt', !(await notice.isVisible()));
    check('no_runtime_errors', errors.length === 0);
    await context.setOffline(false);
    return { passed: checks.length, checks };
  } catch (error) {
    throw new Error(`已通过 ${checks.join(', ')}；失败：${error.message}`, { cause: error });
  }
};
