import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildGame } from './game.mjs';
import { buildArcade } from './build-arcade.mjs';
const project = fileURLToPath(new URL('../', import.meta.url));
const games = await readdir(new URL('../games/', import.meta.url));
for (const id of games) await buildGame(`${project}/games/${id}`);
await buildArcade();
console.log(`Built ${games.length} independent game libraries and the complete offline arcade.`);
