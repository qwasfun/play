async (page) => {
  // Resolve QA imports through Vite's manifest; hashed output names are not API paths.
  const buildMap = await (
    await page.request.get(new URL('module-map.json', page.url()).href)
  ).json();
  const qaModules = {};
  for (const [key, entry] of Object.entries(buildMap)) {
    if (key.endsWith('packages/game-registry/src/index.js')) qaModules['catalog.js'] = entry.file;
    if (key.endsWith('packages/game-registry/src/core.js')) qaModules['core.js'] = entry.file;
    const match = key.match(/(?:^|\/)games\/(\w+)\/src\/index\.js$/);
    if (match) qaModules['games/' + match[1] + '.js'] = entry.file;
  }
  const installQaImports = (map) => {
    window.__qaModules = map;
    window.__qaImport = (specifier) => {
      const url = new URL(specifier, location.href),
        match = url.pathname.match(/games\/(\w+)\.js$/),
        key = match ? 'games/' + match[1] + '.js' : url.pathname.split('/').pop();
      if (!map[key]) throw Error('验收模块：未找到 ' + key);
      return import(new URL(map[key], new URL('./', location.href)).href);
    };
  };
  await page.addInitScript(installQaImports, qaModules);
  await page.evaluate(installQaImports, qaModules);

  const origin = new URL(page.url()).origin,
    checks = [],
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(8000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (array) => {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = /\/(boxes|pipes)/.test(location.hash) ? 123 : 1;
        return array;
      }
      return original(array);
    };
  });
  const cdp = await page.context().newCDPSession(page),
    portrait = { width: 390, height: 844 },
    landscape = { width: 844, height: 390 };
  const check = (name, passed, detail = {}) => {
    checks.push({ name, passed: !!passed, ...detail });
    if (!passed) throw Error(JSON.stringify(checks.at(-1)));
  };
  const starts = {
    rings: '瞄准第一道星环 ↗',
    snake: '跟着星光出发 ↗',
    boxes: '整理这座小花园 ↗',
    pipes: '让清泉流向花园 ↗',
  };
  async function open(id) {
    await page.setViewportSize(portrait);
    await page.goto(origin + `/#/play/${id}`);
    await page.reload();
    await page.getByRole('button', { name: starts[id], exact: true }).tap();
    await page.locator('canvas').scrollIntoViewIfNeeded();
  }
  async function point(x, y, id = 11) {
    const r = await page.locator('canvas').boundingBox();
    return { x: r.x + (x * r.width) / 600, y: r.y + (y * r.height) / 480, id };
  }
  const touch = (type, points = []) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const score = async () => Number(await page.locator('#live-score').textContent());
  const ends = { U: [300, 110], D: [300, 370], L: [170, 240], R: [430, 240] };
  async function swipe(direction) {
    const end = ends[direction];
    await touch('touchStart', [await point(300, 240)]);
    await touch('touchMove', [await point(...end)]);
    await touch('touchEnd');
  }
  async function rotate() {
    await page.setViewportSize(landscape);
    await page.waitForTimeout(120);
  }
  await page.setViewportSize(portrait);
  await page.goto(origin);
  await page.reload();
  const catalog = await page.evaluate(async () => {
    const { games } = await window.__qaImport('./catalog.js');
    return games;
  });
  const latest = catalog.filter((g) => g.isNew).map((g) => g.id);
  check(
    'catalog_cards_and_latest_badges',
    (await page.locator('.game-card').count()) === catalog.length &&
      (await page.locator('.new-badge').count()) === latest.length,
  );
  check(
    'latest_games_sort_first',
    (
      await page
        .locator('.game-card')
        .evaluateAll(
          (cards, n) => cards.slice(0, n).map((card) => card.dataset.game),
          latest.length,
        )
    ).join(',') === latest.join(','),
  );
  for (const game of catalog) {
    const button = page.getByLabel('收藏' + game.title, { exact: true });
    if (await button.count()) await button.tap();
  }
  await page.getByRole('link', { name: '我的收藏', exact: true }).tap();
  await page.reload();
  check(
    'all_catalog_favorites_survive_reload',
    (await page.locator('.game-card').count()) === catalog.length,
  );

  await open('boxes');
  await touch('touchStart', [await point(300, 240)]);
  await touch('touchMove', [await point(...ends.U)]);
  await rotate();
  await touch('touchEnd');
  check(
    'boxes_rotation_cancels_pending_push',
    (await score()) === 0 &&
      (await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).isVisible()),
  );
  await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).tap();
  await swipe('U');
  check('boxes_swipe_pushes_one_crate_to_goal', (await score()) === 100);
  await page.getByRole('button', { name: '↶ 撤销', exact: true }).tap();
  check('boxes_undo_restores_board', (await score()) === 0);
  for (const direction of 'UDLRR') await swipe(direction);
  await page.waitForTimeout(120);
  check(
    'boxes_touch_solution_keeps_undo_cost',
    (await page.locator('.result-card').isVisible()) && (await score()) === 432,
    { score: await score() },
  );
  await page.getByRole('button', { name: '再玩一次 ↻', exact: true }).press('Enter');
  const keys = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' };
  for (const direction of 'UDLRR') await page.locator('canvas').press(keys[direction]);
  check(
    'boxes_keyboard_solution_completes',
    (await page.locator('.result-card').isVisible()) && (await score()) === 435,
  );
  await page.reload();
  check('boxes_best_persists', (await page.locator('#best-record').textContent()).includes('435'));

  await open('pipes');
  const before = await score();
  await touch('touchStart', [await point(156, 91)]);
  await rotate();
  await touch('touchEnd');
  check(
    'pipes_rotation_cancels_pending_tap',
    (await score()) === before &&
      (await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).isVisible()),
  );
  await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).tap();
  const solution = await page.evaluate(async () => {
    const { generatePipes } = await window.__qaImport('./games/pipes.js');
    return generatePipes(123).solution;
  });
  let turns = 0;
  outer: for (let index = 0; index < 16; index++)
    for (let count = 0; count < solution[index]; count++) {
      const p = await point(156 + (index % 4) * 96, 91 + Math.floor(index / 4) * 96);
      await page.touchscreen.tap(p.x, p.y);
      turns++;
      if (await page.locator('.result-card').isVisible()) break outer;
      if (index >= 10) await page.screenshot({ path: 'output/playwright/wave3-pipes.png' });
    }
  await page.waitForTimeout(120);
  check(
    'pipes_touch_rotations_connect_outlet',
    (await page.locator('.result-card').isVisible()) &&
      (await score()) === 300 + Math.max(0, 120 - turns * 2),
    { turns, score: await score() },
  );
  const next = catalog[(catalog.findIndex((g) => g.id === 'pipes') + 1) % catalog.length].id;
  check(
    'pipes_next_game_follows_catalog',
    (await page.getByRole('link', { name: '下一款游戏 →', exact: true }).getAttribute('href')) ===
      `#/play/${next}`,
  );
  await page.getByRole('link', { name: '下一款游戏 →', exact: true }).tap();
  await page.locator('[data-action="start"]').waitFor({ state: 'visible' });
  check('fresh_result_link_touch_navigates_once', page.url().endsWith(`#/play/${next}`));

  await open('rings');
  const rings = await page.evaluate(async () => {
    const { generateRings } = await window.__qaImport('./games/rings.js');
    return generateRings(1);
  });
  await touch('touchStart', [await point(400, 200)]);
  await touch('touchMove', [await point(330, 290)]);
  await touch('touchCancel');
  await page.waitForTimeout(180);
  check(
    'rings_cancel_does_not_launch',
    (await score()) === 0 && (await page.locator('#live-extra').textContent()) === '♥ ♥ ♥',
  );
  for (let index = 0; index < rings.length; index++) {
    const { vx, vy } = rings[index].solution;
    await touch('touchStart', [await point(400, 200)]);
    await touch('touchMove', [await point(400 - vx / 3.7, 200 - vy / 3.7)]);
    await touch('touchEnd');
    await page.waitForFunction(
      (value) => Number(document.querySelector('#live-score').textContent) >= value,
      (index + 1) * 100,
      { timeout: 6000 },
    );
    await page.waitForTimeout(720);
    if (index === 0) {
      check('rings_drag_hits_first_ring', (await score()) === 100);
      await rotate();
      check(
        'rings_rotation_preserves_score',
        (await score()) === 100 &&
          (await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).isVisible()),
      );
      await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).tap();
      await page.screenshot({ path: 'output/playwright/wave3-rings.png' });
    }
  }
  check(
    'rings_eight_touch_shots_complete',
    (await page.locator('.result-card').isVisible()) && (await score()) === 800,
    { score: await score() },
  );
  await page.reload();
  check('rings_best_persists', (await page.locator('#best-record').textContent()).includes('800'));

  await open('snake');
  await page.waitForFunction(
    () => Number(document.querySelector('#live-score').textContent) >= 10,
    {},
    { timeout: 1800 },
  );
  check('snake_can_collect_first_star', (await score()) >= 10);
  await rotate();
  check(
    'snake_rotation_pauses_without_reset',
    (await score()) >= 10 &&
      (await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).isVisible()),
  );
  await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).tap();
  await swipe('U');
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'output/playwright/wave3-snake.png' });
  await page.getByRole('button', { name: 'Ⅱ 暂停', exact: true }).tap();
  check(
    'snake_swipe_and_pause_work_in_landscape',
    await page.getByRole('button', { name: '继续游戏 ▶', exact: true }).isVisible(),
  );
  check('no_runtime_errors', errors.length === 0, { errors });
  await cdp.detach();
  return { origin, passed: checks.length, checks };
};
