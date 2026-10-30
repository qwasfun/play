/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  id: 'star',
  campaign: {
    version: 1,
    total: 20,
    recordPolicy: 'action',
    presentation: { canvas: { width: 600, height: 480 }, lives: 3, extraLabel: '剩余机会' },
  },
  title: '星轨邮差',
  english: 'ORBIT POST',
  category: '反应挑战',
  duration: '1 分钟',
  tag: '动手',
  description: '在星星之间，送一封小小的信。',
  controls: '点击 / 触屏 / 空格',
  limit: 60,
  lives: true,
  extraLabel: '剩余机会',
  icon: '✉',
  cta: '出发送信',
  rules: [
    '点击或按空格，切换内外两条轨道。',
    '收集黄色信件，每封 10 分；避开红色碎石。',
    '坚持 60 秒完成投递，撞击三次则提前结束。',
  ],
};
