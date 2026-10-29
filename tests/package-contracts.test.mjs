import test from 'node:test';
import assert from 'node:assert/strict';
import { games } from '@playground/game-registry';
for (const game of games)
  test(`${game.id}: independent ESM output preserves engine and rule contracts`, async () => {
    const base = new URL(`../games/${game.id}/dist/`, import.meta.url);
    const [{ createGame }, { manifest }, { rules }, { art }] = await Promise.all(
      ['index', 'manifest', 'rules', 'art'].map((name) => import(new URL(name + '.js', base))),
    );
    assert.equal(manifest.id, game.id);
    assert.equal(manifest.title, game.title);
    assert.match(art(), /^<svg/);
    let finishes = 0;
    const engine = createGame({ seed: 123, onFinish: () => finishes++ });
    for (const method of ['update', 'draw', 'input', 'getState', 'destroy'])
      assert.equal(typeof engine[method], 'function');
    assert.equal(typeof rules.validate, 'function');
    assert.equal(typeof rules.stored, 'function');
    assert.equal(typeof rules.clean, 'function');
    engine.destroy();
    engine.update(1);
    assert.equal(finishes, 0);
  });
