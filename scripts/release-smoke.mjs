import { games } from '@playground/game-registry';
import { RULE_VERSION, beijingDate, dailyGame } from '@playground/game-registry/core';
const phase = process.argv[2] || 'frontend',
  api = process.env.RELEASE_API_URL || 'https://play-api.185036.xyz',
  site = process.env.RELEASE_SITE_URL || 'https://play.185036.xyz/';
const pause = (ms) => new Promise((accept) => setTimeout(accept, ms));
async function get(url) {
  let last;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      last = error;
      if (attempt < 9) await pause(3000);
    }
  }
  throw Error(`发布验收：${new URL(url).pathname} 不可用，${last.message}`);
}
let boards = 0;
const queries = games.flatMap((game) => [
  { game, mode: 'normal' },
  { game, mode: 'total' },
  ...(game.campaign
    ? [1, game.campaign.total].map((level) => ({
        game,
        mode: 'campaign',
        level,
        campaignVersion: game.campaign.version,
      }))
    : []),
]);
queries.push({
  game: games.find((game) => game.id === dailyGame(beijingDate())),
  mode: 'daily',
  date: beijingDate(),
});
for (const { game, mode, ...scope } of queries) {
  const url = new URL('/v1/leaderboards', api);
  url.search = new URLSearchParams({
    gameId: game.id,
    mode,
    ...scope,
    ruleVersion: String(RULE_VERSION),
  });
  const board = await (await get(url)).json();
  if (
    board.gameId !== game.id ||
    board.mode !== mode ||
    !Array.isArray(board.entries) ||
    (mode === 'campaign' &&
      (board.level !== scope.level || board.campaignVersion !== scope.campaignVersion))
  )
    throw Error(`排行榜 ${game.title}：后端尚未支持此游戏，请先更新后端`);
  boards++;
}
if (phase === 'frontend') {
  await get(site);
  const map = await (await get(new URL('module-map.json', site))).json();
  for (const game of games)
    if (!Object.keys(map).some((path) => path.endsWith(`games/${game.id}/src/index.js`)))
      throw Error(`游戏 ${game.title}：网页产物缺少游戏模块`);
  const release = await (
    await get(new URL(`release.json?sha=${process.env.RELEASE_SHA}`, site))
  ).json();
  if (release.sha !== process.env.RELEASE_SHA) throw Error('网页版本：线上尚未更新到本次发布提交');
}
console.log(
  `发布验收通过：${phase}，${games.length} 款游戏、${boards} 个普通/总榜/每日/逐关查询均可读取；没有写入生产测试成绩`,
);
