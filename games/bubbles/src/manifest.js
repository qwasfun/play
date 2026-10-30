/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  leaderboard: { normal: true, daily: true },
  id: 'bubbles',
  campaign: {
    version: 1,
    total: 20,
    recordPolicy: 'steps',
    presentation: { canvas: { width: 600, height: 600 } },
  },
  title: '泡泡消消',
  english: 'BUBBLE GARDEN',
  category: '连块消除',
  duration: '1–2 分钟',
  tag: '动脑',
  isNew: false,
  extraLabel: '已消除',
  targetText: '0 / 60',
  icon: '◌',
  description: '找到相邻的同色泡泡，点出一串小快乐。',
  controls: '点击 / 方向键 + 空格',
  limit: 90,
  cta: '点开第一串泡泡',
  rules: [
    '点击两个或更多相邻的同色泡泡，即可一起消除；方向键选格、空格确认。',
    '消除后泡泡会下落、空列会左移，每组得分为数量 × 数量 × 10。',
    '90 秒内清空三盘即可通关；每盘都可以全部消除。',
  ],
};
