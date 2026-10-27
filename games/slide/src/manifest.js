/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  campaign: {version:1,total:20},
  "id": "slide",
  "title": "拼图小屋",
  "english": "COZY SLIDE",
  "category": "滑块拼图",
  "duration": "1–3 分钟",
  "tag": "动脑",
  "isNew": false,
  "undo": true,
  "extraLabel": "拼图进度",
  "targetText": "正确 0 / 8",
  "icon": "⌂",
  "description": "挪一块，再挪一块，让小屋慢慢完整。",
  "controls": "点击邻格 / 方向键 / WASD",
  "limit": 180,
  "cta": "拼回这间小屋",
  "rules": [
    "点击空白格旁边的图块，将它移进空位；方向键 / WASD 移动空位。",
    "按 1 至 8 的顺序拼成小屋，空位留在右下角，即可通关。",
    "180 秒内完成；可撤销但不退回计步，步数越少奖励越多。"
  ]
};
