/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  "id": "pairs",
  "campaign": {"version":1,"total":20,"recordPolicy":"elapsed","presentation":{"canvas":{"width":600,"height":600}}},
  "title": "翻翻小花园",
  "english": "BLOOM PAIRS",
  "category": "记忆配对",
  "duration": "1–2 分钟",
  "tag": "动脑",
  "isNew": false,
  "extraLabel": "已配对",
  "targetText": "0 / 6",
  "icon": "❀",
  "description": "翻开花朵，把相同的小美好放在一起。",
  "controls": "点击 / 方向键 + 空格",
  "limit": 120,
  "cta": "翻开第一朵花",
  "rules": [
    "每次翻开两张卡片，寻找相同的花朵。",
    "配对成功获得 100 分；不相同会稍后盖回。",
    "120 秒内找齐六对，翻牌次数越少，通关奖励越多。"
  ]
};
