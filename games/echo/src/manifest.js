/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  "id": "echo",
  "campaign": {"version":1,"total":20,"recordPolicy":"elapsed","presentation":{"canvas":{"width":600,"height":480}}},
  "title": "萤火回声",
  "english": "FIREFLY ECHO",
  "category": "顺序记忆",
  "duration": "1–3 分钟",
  "tag": "动脑",
  "description": "跟随微光，把森林的暗号记下来。",
  "controls": "点击 / 方向键 / WASD",
  "limit": 180,
  "scoreLabel": "完成轮数",
  "scoreField": "rounds",
  "extraLabel": "目标轮数",
  "targetText": "12",
  "icon": "✳",
  "cta": "听一听森林",
  "rules": [
    "先观察萤火亮起的顺序，再依次点击相同区域。",
    "每完成一轮，序列增加一个位置，最多 12 轮。",
    "方向键或 WASD 对应上、右、下、左四个区域；播放期间请耐心观察。"
  ]
};
