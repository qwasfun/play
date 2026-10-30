/** Resolve source identities through Vite's build manifest, never through hashed filenames. */
export function modulePaths(manifest) {
  const out = {};
  for (const [key, entry] of Object.entries(manifest)) {
    if (key.endsWith('packages/game-registry/src/index.js')) out['catalog.js'] = entry.file;
    if (key.endsWith('packages/game-registry/src/core.js')) out['core.js'] = entry.file;
    const match = key.match(/(?:^|\/)games\/([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\/src\/index\.js$/);
    if (match) out[`games/${match[1]}.js`] = entry.file;
  }
  return out;
}
