/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  campaign: { version: 1, total: 20 },
  id: 'pipes',
  title: '水管小花园',
  english: 'FLOWER FLOW',
  category: '旋转连线',
  duration: '1–3 分钟',
  tag: '动脑',
  isNew: false,
  extraLabel: '水流进度',
  targetText: '0 格连通',
  icon: '⌘',
  description: '转一转小水管，把清泉送到花朵身边。',
  controls: '点击 / 方向键 + 空格',
  limit: 180,
  cta: '让清泉流向花园',
  rules: [
    '点击一格，将水管顺时针旋转；也可用方向键选格、空格旋转。',
    '将左上角左侧入口，连接至右下角右侧的花朵出口。',
    '不必用完所有管道；180 秒内连通即可通关，旋转越少奖励越多。',
  ],
};
