/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  leaderboard: { normal: true, daily: true },
  campaign: { version: 1, total: 20 },
  id: 'mines',
  title: '花田扫雷',
  english: 'MEADOW MINES',
  category: '数字推理',
  duration: '1–3 分钟',
  tag: '动脑',
  isNew: true,
  extraLabel: '花田进度',
  targetText: '0 / 13',
  icon: '⚑',
  description: '读懂花田里的数字，绕开藏起来的小石头。',
  controls: '点击翻开 / 长按标旗 / 方向键',
  limit: 180,
  cta: '探访这片小花田',
  rules: [
    '从左上角的安全格开始，数字表示周围八格有几颗雷。',
    '点击翻开，长按再松开可标旗或取消；键盘用方向键选择、空格翻开、回车标旗。',
    '180 秒内翻开十三个安全格即可通关；标旗不是必需，点到雷则结束。',
  ],
};
