/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  leaderboard: { normal: true, daily: true },
  id: 'rhythm',
  campaign: {
    version: 1,
    total: 20,
    recordPolicy: 'action',
    presentation: { canvas: { width: 600, height: 480 }, lives: 5, extraLabel: '剩余机会' },
  },
  title: '节奏点点',
  english: 'POCKET RHYTHM',
  category: '节拍反应',
  duration: '1 分钟',
  tag: '动手',
  isNew: false,
  lives: 5,
  extraLabel: '剩余机会',
  icon: '♫',
  description: '跟着下落的音符，把节奏轻轻点亮。',
  controls: '点击轨道 / A W S D / ← ↑ ↓ →',
  limit: 50,
  cta: '接住第一颗音符',
  rules: [
    '音符落到判定线附近时，点击它所在轨道；从左到右对应 A/W/S/D 或 ←/↑/↓/→。',
    '命中获得 50 分，更准的完美命中获得 100 分；无需开启音效也能玩。',
    '完成三十二颗音符即可通关；漏接或点错扣一次机会，五次失误或 50 秒后结束。',
  ],
};
