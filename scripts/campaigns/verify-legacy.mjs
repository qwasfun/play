import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { games } from '@playground/game-registry';
const directory = process.argv[process.argv.indexOf('--legacy-dir') + 1];
if (!process.argv.includes('--legacy-dir') || !directory)
  throw Error('旧版目录：请提供旧版本工作区源码目录');
let compared = 0;
for (const { id } of games) {
  const { createGame: oldGame } = await import(
      pathToFileURL(resolve(directory, `games/${id}/dist/index.js`))
    ),
    { createGame: newGame } = await import(`../../games/${id}/src/index.js`);
  for (const seed of [42, 20261029, 'normal-compatibility']) {
    const oldResults = [],
      newResults = [],
      a = oldGame({ seed, onFinish: (r) => oldResults.push(r) }),
      b = newGame({ seed, onFinish: (r) => newResults.push(r) });
    for (let frame = 0; frame < 3600; frame++) {
      if (frame % 30 === 0) {
        const key = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', ' ', 'Enter'][
          Math.floor(frame / 30) % 6
        ];
        for (const e of [a, b]) {
          e.input('key-down', { key, repeat: false });
          e.input('key-up', { key });
        }
      }
      if (frame % 47 === 0) {
        const point = { x: 70 + ((frame * 17) % 470), y: 85 + ((frame * 13) % 320) };
        for (const e of [a, b]) {
          e.input('primary-down', point);
          e.input('primary-move', { ...point, x: point.x + 20 });
          e.input('primary-up', { ...point, x: point.x + 20 });
        }
      }
      a.update(1 / 60);
      b.update(1 / 60);
      if (frame % 60 === 0)
        assert.deepEqual(b.getState(), a.getState(), `${id} seed ${seed} frame ${frame}`);
    }
    assert.deepEqual(newResults, oldResults, `${id} results`);
    a.destroy();
    b.destroy();
    compared++;
  }
}
console.log(
  JSON.stringify({
    games: games.length,
    seedsPerGame: 3,
    comparisons: compared,
    framesPerRun: 3600,
    normalModesIdentical: true,
  }),
);
