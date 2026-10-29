import test from 'node:test';
import assert from 'node:assert/strict';
import { modulePaths } from '../scripts/module-map.mjs';
test('module paths preserve both legacy and hyphenated stable game IDs', () => {
  const map = modulePaths({
    'games/star/src/index.js': { file: 'assets/star-a.js' },
    'games/orchard-sort/src/index.js': { file: 'assets/orchard-b.js' },
    'games/x/src/rules.js': { file: 'assets/rules-c.js' },
  });
  assert.deepEqual(map, {
    'games/star.js': 'assets/star-a.js',
    'games/orchard-sort.js': 'assets/orchard-b.js',
  });
});
