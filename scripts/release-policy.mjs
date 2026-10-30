export async function releasePreparation(api, sha) {
  if (await api('git/ref/tags/release/hold', { missing: true }))
    throw Error('发布暂停：请先查看失败报告，修复后运行 npm run release:resume');
  const main = (await api('branches/main')).commit.sha,
    already = await api(`git/ref/tags/release/${sha}`, { missing: true });
  if (already || sha !== main)
    return { skip: true, previous_run_id: '', previous_sha: '', previous_artifact: '' };
  const previous = await api('git/ref/tags/release/last-good', { missing: true });
  let candidates;
  if (previous?.object.type === 'tag') {
    const tag = await api(`git/tags/${previous.object.sha}`),
      metadata = JSON.parse(tag.message);
    if (!/^\d+$/.test(metadata.runId || '') || !/^[a-f0-9]{40}$/.test(metadata.sha || ''))
      throw Error('回滚版本：成功记录无效，请人工核对');
    candidates = [{ id: metadata.runId, head_sha: metadata.sha }];
  } else {
    // Bootstrap from the last deployment made by the old workflow when possible.
    const runs = await api('actions/workflows/pages.yml/runs?status=success&per_page=10');
    candidates = runs.workflow_runs.filter((run) => run.head_sha !== sha);
  }
  for (const run of candidates) {
    const { artifacts } = await api(`actions/runs/${run.id}/artifacts`);
    const artifact =
      artifacts.find((item) => !item.expired && item.name === 'release-site') ||
      artifacts.find((item) => !item.expired && item.name === 'github-pages');
    if (artifact)
      return {
        skip: false,
        previous_run_id: run.id,
        previous_sha: run.head_sha,
        previous_artifact: artifact.name,
      };
  }
  throw Error('回滚副本：没有仍有效的上一版网页附件，请先建立并确认基线备份，再重新发布');
}
export async function writeReleaseRef(api, name, object) {
  const existing = await api(`git/ref/tags/${name}`, { missing: true });
  return api(existing ? `git/refs/tags/${name}` : 'git/refs', {
    method: existing ? 'PATCH' : 'POST',
    body: existing ? { sha: object, force: true } : { ref: `refs/tags/${name}`, sha: object },
  });
}
export async function recordRelease(api, sha, runId) {
  const tag = await api('git/tags', {
    method: 'POST',
    body: {
      tag: `release/${sha}`,
      message: JSON.stringify({ sha, runId, at: new Date().toISOString() }),
      object: sha,
      type: 'commit',
    },
  });
  if (!(await api(`git/ref/tags/release/${sha}`, { missing: true })))
    await api('git/refs', {
      method: 'POST',
      body: { ref: `refs/tags/release/${sha}`, sha: tag.sha },
    });
  await writeReleaseRef(api, 'release/last-good', tag.sha);
}
