/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  leaderboard: { normal: true, daily: true },
  id: 'rings',
  campaign: {
    version: 1,
    total: 20,
    recordPolicy: 'action',
    presentation: { canvas: { width: 600, height: 480 }, lives: 3, extraLabel: '剩余机会' },
  },
  title: '星环投投乐',
  english: 'LITTLE ORBIT TOSS',
  category: '瞄准投射',
  duration: '1–2 分钟',
  tag: '动手',
  isNew: false,
  lives: true,
  extraLabel: '剩余机会',
  icon: '◎',
  description: '轻轻向后一拉，让小球穿过金色星环。',
  controls: '拖拉后松手 / 方向键 + 空格',
  limit: 120,
  cta: '瞄准第一道星环',
  rules: [
    '在画布内向后、向下拖拉，松手抛出小球。',
    '观察瞄准轨迹，让小球穿过金色星环；每环 100 分，共八环。',
    '也可左右键调角度、上下键调力度、空格发射；三次落空或 120 秒结束。',
  ],
};
