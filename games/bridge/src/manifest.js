/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  leaderboard: { normal: true, daily: true },
  id: 'bridge',
  campaign: {
    version: 1,
    total: 20,
    recordPolicy: 'action',
    presentation: { canvas: { width: 600, height: 480 }, lives: 3, extraLabel: '剩余机会' },
  },
  title: '云岛搭桥',
  english: 'CLOUD HOP',
  category: '时机挑战',
  duration: '1–2 分钟',
  tag: '动手',
  description: '桥长一点点，离下一朵云近一点。',
  controls: '长按松开 / 按住空格',
  limit: 120,
  lives: true,
  extraLabel: '剩余机会',
  icon: '⌁',
  cta: '搭起第一座桥',
  rules: [
    '按住屏幕、鼠标或空格，让桥梁慢慢增长。',
    '松开落桥，桥端落在下一座岛上即成功。',
    '每次成功 100 分，命中中心额外 50 分；共 12 段桥、三次失误机会。',
  ],
};
