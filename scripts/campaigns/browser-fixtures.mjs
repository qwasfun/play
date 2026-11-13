import fs from 'node:fs';
import { games } from '@playground/game-registry';
import { playLevel } from './replay.mjs';
const solutions = JSON.parse(fs.readFileSync('tests/fixtures/new-campaign-solutions.json')),
  fixtures = {};
for (const game of games.filter((game) => game.campaign)) {
  if (['boxes', 'pipes', 'mines', 'lights', 'slide'].includes(game.id)) continue;
  const { createGame } = await import(`../../games/${game.id}/src/index.js`),
    { campaign } = await import(`../../games/${game.id}/src/campaign.js`);
  fixtures[game.id] = { policy: game.campaign.recordPolicy, levels: [] };
  for (const number of [1, 5, 10, 15, 20]) {
    const level = campaign.levels[number - 1];
    let result;
    const playbackLevel = ['star', 'catch', 'rain', 'jump', 'rhythm', 'lantern', 'sail'].includes(
      game.id,
    )
      ? { ...level, target: level.target + 2 }
      : level;
    const engine = createGame({ level: playbackLevel, onFinish: (r) => (result = r) }),
      run = playLevel(game.id, playbackLevel, engine, solutions[game.id]?.[number - 1]);
    if (!result?.won) throw Error(`${game.id} ${number}`);
    fixtures[game.id].levels.push({
      id: game.id,
      number,
      events: run.events,
      frames: run.frames,
      result,
    });
  }
}
fs.mkdirSync('output/playwright', { recursive: true });
fs.writeFileSync('output/playwright/new-campaign-browser-fixtures.json', JSON.stringify(fixtures));
console.log('Prepared 115 complete browser input replays.');

fs.writeFileSync(
  'output/playwright/new-campaign-browser-run.js',
  fs
    .readFileSync('scripts/all-campaign-qa.js', 'utf8')
    .replace(/\/\* INPUT_REPLAYS \*\/\s*null/, () => JSON.stringify(fixtures)),
);
fs.writeFileSync(
  'output/playwright/new-campaign-compat-run.js',
  fs
    .readFileSync('scripts/all-campaign-compat-qa.js', 'utf8')
    .replace(/\/\* INPUT_REPLAYS \*\/\s*null/, () => JSON.stringify(fixtures)),
);
