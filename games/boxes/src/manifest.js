/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  campaign: { version: 1, total: 20 },
  id: 'boxes',
  title: '花园推箱子',
  english: 'GARDEN BOXES',
  category: '空间解谜',
  duration: '1–3 分钟',
  tag: '动脑',
  isNew: false,
  undo: true,
  extraLabel: '花圃归位',
  targetText: '0 / 3',
  icon: '▧',
  description: '把小木箱推到花圃，让花园整整齐齐。',
  controls: '滑动 / 方向键 / WASD',
  limit: 180,
  cta: '整理这座小花园',
  rules: [
    '滑动或按方向键 / WASD，移动园丁并推动木箱。',
    '把三个木箱全部推到花圃上即可通关；木箱可以推，不能拉。',
    '可以撤销，但已计步数不退回；180 秒内完成，步数越少奖励越多。',
  ],
};
