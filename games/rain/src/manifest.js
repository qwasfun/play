/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  leaderboard: { normal: true, daily: true },
  id: 'rain',
  campaign: {
    version: 1,
    total: 20,
    recordPolicy: 'action',
    presentation: { canvas: { width: 600, height: 480 }, lives: 3, extraLabel: '剩余机会' },
  },
  title: '躲雨小伞',
  english: 'SUNSHOWER SHELTER',
  category: '移动守护',
  duration: '1 分钟',
  tag: '动手',
  isNew: true,
  lives: true,
  extraLabel: '小花活力',
  icon: '☂',
  description: '挪一挪小伞，替花朵挡雨、接住阳光。',
  controls: '左右拖动 / ← → / A D',
  limit: 60,
  cta: '撑起这把小伞',
  rules: [
    '左右拖动画布，或按住左右方向键 / A、D，移动小伞。',
    '雨滴与阳光落到伞沿时要接住：挡雨得 20 分，阳光得 40 分。',
    '共二十四个目标，全部接住即可通关；漏掉三个或 60 秒后结束。',
  ],
};
