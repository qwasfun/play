/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  id: 'constellation',
  campaign: {
    version: 1,
    total: 20,
    recordPolicy: 'steps',
    presentation: { canvas: { width: 600, height: 600 } },
  },
  title: '一笔星图',
  english: 'ONE LINE SKY',
  category: '一笔连线',
  duration: '1–3 分钟',
  tag: '动脑',
  isNew: true,
  undo: true,
  extraLabel: '已完成星图',
  targetText: '0 / 3',
  icon: '☆',
  description: '沿着星光走一遍，画出夜空里的小秘密。',
  controls: '点击 / 拖动连线 / 方向键 + 空格',
  limit: 180,
  cta: '连起第一颗星',
  rules: [
    '从星点出发，沿已有细线连接相邻星点；可以拖动，也可逐点点击。',
    '每条线只能走一次，走完全部线完成星图；松手后可从当前端点继续。',
    '共三张星图，180 秒内完成；支持撤销，已计步数保留。',
  ],
};
