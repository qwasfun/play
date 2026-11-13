import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parse } from 'acorn';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { games } from '@playground/game-registry';
import { campaignGames, loadCampaignModules } from './helpers/campaign-games.mjs';

test('ordinary-only package needs no campaign module; dual-mode modules remain mandatory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'play-modes-'));
  try {
    await mkdir(join(root, 'games/plain-only/src'), { recursive: true });
    await writeFile(
      join(root, 'games/plain-only/src/index.js'),
      'export const createGame=()=>({});',
    );
    const ordinary = { id: 'plain-only' },
      dual = { id: 'dual-mode', campaign: { version: 1, total: 20 } };
    const load = (specifier) => import(pathToFileURL(join(root, specifier)));
    assert.deepEqual(await loadCampaignModules([ordinary], load), {});
    assert.deepEqual(campaignGames([ordinary, dual]), [dual]);
    await assert.rejects(loadCampaignModules([ordinary, dual], load), {
      code: 'ERR_MODULE_NOT_FOUND',
    });
    await mkdir(join(root, 'games/dual-mode/src'), { recursive: true });
    await writeFile(
      join(root, 'games/dual-mode/src/index.js'),
      'export const createGame=()=>({});',
    );
    await writeFile(
      join(root, 'games/dual-mode/src/campaign.js'),
      'export const campaign={version:1,levels:[{number:1}]};',
    );
    const modules = await loadCampaignModules([ordinary, dual], load);
    assert.deepEqual(Object.keys(modules), ['dual-mode']);
    assert.equal(typeof modules['dual-mode'].createGame, 'function');
    assert.equal(modules['dual-mode'].campaign.levels[0].number, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ordinary-only and dual-mode home links and routes preserve their capabilities', async () => {
  // This test file runs in its own Node test process. Register before core captures IDs.
  const ordinary = { id: 'plain-only' };
  games.push(ordinary);
  try {
    const { parseRoute, playLink, campaignLink } = await import('@playground/game-registry/core');
    const ui = await readFile(
      new URL('../apps/arcade/src/campaign-ui.js', import.meta.url),
      'utf8',
    );
    const entry = parse(ui, { ecmaVersion: 'latest', sourceType: 'module' }).body.find(
      (node) =>
        node.type === 'ExportNamedDeclaration' &&
        node.declaration?.id?.name === 'campaignEntryLink',
    )?.declaration;
    assert.ok(entry);
    const campaignEntryLink = vm.runInNewContext(
      ui.slice(entry.start, entry.end) + ';campaignEntryLink',
      { campaignLink, playLink },
    );
    assert.equal(campaignEntryLink(ordinary), playLink(ordinary.id));
    assert.deepEqual(parseRoute(playLink(ordinary.id)), {
      type: 'play',
      id: ordinary.id,
      date: '',
    });
    assert.equal(parseRoute(campaignLink(ordinary.id)).type, 'error');
    assert.equal(parseRoute(campaignLink(ordinary.id, 1)).type, 'error');
    for (const dual of campaignGames(games)) {
      assert.equal(campaignEntryLink(dual), campaignLink(dual.id));
      assert.equal(parseRoute(playLink(dual.id)).type, 'play');
      assert.equal(parseRoute(campaignLink(dual.id)).type, 'levels');
      assert.equal(parseRoute(campaignLink(dual.id, dual.campaign.total)).type, 'campaign');
      assert.equal(parseRoute(campaignLink(dual.id, dual.campaign.total + 1)).type, 'error');
    }
  } finally {
    games.splice(games.indexOf(ordinary), 1);
  }
});
