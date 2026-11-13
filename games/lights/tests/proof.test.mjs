import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, generateLights } from '../src/index.js';
import { rules } from '../src/rules.js';

test('real inputs including undo produce a verifiable seed-bound proof', () => {
  for (let seed = 0; seed < 60; seed++) {
    let result;
    const game = createGame({
      seed,
      onFinish: (value) => {
        result = value;
      },
    });
    const click = (index) => {
      const point = { x: 156 + (index % 4) * 96, y: 91 + Math.floor(index / 4) * 96 };
      game.input('primary-down', point);
      game.input('primary-up', point);
      game.update(1 / 60);
    };
    click(0);
    if (!result) {
      game.input('undo');
      for (const index of generateLights(seed).solution) click(index);
    }
    assert.ok(result?.won);
    assert.deepEqual(rules.validate(result, { seed }), []);
    assert.equal(rules.clean(result).proof, result.proof);
    assert.ok(rules.stored({ score: 4, steps: 4, elapsed: 12, won: true }));
    assert.ok(rules.validate({ ...result, proof: '' }, { seed }).length);
    game.destroy();
  }
});

test('a proof from another initial board is rejected', () => {
  const proof = generateLights(42)
    .solution.map((i) => i.toString(16))
    .join('');
  const result = { proof, score: proof.length, steps: proof.length, elapsed: 10, won: true };
  assert.deepEqual(rules.validate(result, { seed: 42 }), []);
  assert.ok(rules.validate(result, { seed: 43 }).length);
});
