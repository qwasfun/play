/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  "id": "merge",
  "campaign": {"version":1,"total":20,"recordPolicy":"steps","presentation":{"canvas":{"width":600,"height":600}}},
  "title": "数字合合乐",
  "english": "COZY NUMBERS",
  "category": "滑动合成",
  "duration": "1–3 分钟",
  "tag": "动脑",
  "isNew": false,
  "extraLabel": "目标 128",
  "targetText": "最大 2",
  "icon": "▦",
  "description": "让相同的数字相遇，慢慢拼出一个 128。",
  "controls": "滑动 / 方向键 / WASD",
  "limit": 180,
  "cta": "合出一点小惊喜",
  "rules": [
    "上下左右滑动画布，或使用方向键 / WASD 移动数字。",
    "相同数字相遇会合并，每格每步只合并一次，合并数值计入得分。",
    "180 秒内合出 128 即通关；棋盘满且无法合并时结束。"
  ]
};
