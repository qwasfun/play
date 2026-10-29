/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  id: 'snake',
  campaign: {
    version: 1,
    total: 20,
    recordPolicy: 'action',
    presentation: { canvas: { width: 600, height: 480 } },
  },
  title: '小蛇吃星星',
  english: 'STAR SNAKE',
  category: '路线反应',
  duration: '1–2 分钟',
  tag: '动手',
  isNew: false,
  extraLabel: '收集星星',
  targetText: '0 / 10',
  icon: '✶',
  description: '拐个弯，再拐个弯，把星光装进口袋。',
  controls: '滑动 / 方向键 / WASD',
  limit: 90,
  cta: '跟着星光出发',
  rules: [
    '上下左右滑动，或用方向键 / WASD 引导小蛇转弯。',
    '每颗星星 10 分，吃到后身体会变长；收齐十颗即通关。',
    '不能直接掉头；撞到墙壁或自己的身体会结束，单局最长 90 秒。',
  ],
};
