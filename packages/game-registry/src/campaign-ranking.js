import { byId } from './index.js';
import { cleanLevelResult, recordPolicy } from '@playground/game-sdk/level';
import { replayLevel } from '@playground/game-sdk/level-proof';
import { campaignLoaders as campaigns, loaders as engines } from './loaders.js';
export function levelScope(version, level) {
  return 'level:' + version + ':' + level;
}
export function parseLevelScope(value) {
  const m = /^level:(\d+):(\d+)$/.exec(value);
  return m ? { campaignVersion: Number(m[1]), level: Number(m[2]) } : null;
}
export function levelPolicy(id) {
  return recordPolicy(id, byId[id]?.campaign);
}
export async function verifiedLevelResult(id, scope, value) {
  const [{ campaign }, { createGame }] = await Promise.all([campaigns[id](), engines[id]()]);
  if (campaign.version !== scope.campaignVersion || !campaign.levels[scope.level - 1])
    throw Error('关卡版本：请刷新网站并从选关页重新进入');
  const result = cleanLevelResult(
    replayLevel(createGame, campaign.levels[scope.level - 1], value.levelProof),
    levelPolicy(id),
  );
  if (!result)
    throw Object.assign(Error('通关状态：请成功完成本关后再提交排行榜'), { field: 'won' });
  const labels = {
    won: '通关状态',
    elapsed: '用时',
    steps: '步数',
    score: '得分',
    mistakes: '失误次数',
  };
  for (const key of Object.keys(result)) {
    if (
      typeof result[key] === 'number'
        ? Math.abs(result[key] - value[key]) > 1e-6 || !Number.isFinite(value[key])
        : result[key] !== value[key]
    )
      throw Object.assign(Error(`${labels[key]}与关卡操作记录：结果不一致，请重新完成本关后提交`), {
        field: key,
      });
  }
  return { ...result, score: result.score ?? result.steps ?? 0 };
}
export function levelSort(id, result) {
  const policy = levelPolicy(id);
  if (policy === 'action') return result.mistakes * 1000000000 - result.score;
  return policy === 'steps' ? result.steps : 0;
}
