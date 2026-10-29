/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  "id": "tower",
  "campaign": {"version":1,"total":20,"recordPolicy":"action","presentation":{"canvas":{"width":600,"height":480},"lives":3,"extraLabel":"剩余机会"}},
  "title": "叠叠高塔",
  "english": "TINY TOWER",
  "category": "对齐堆叠",
  "duration": "1–2 分钟",
  "tag": "动手",
  "isNew": true,
  "lives": true,
  "extraLabel": "剩余机会",
  "icon": "▤",
  "description": "看准时机，把一层层小房子叠向云端。",
  "controls": "点击 / 空格 / 回车",
  "limit": 90,
  "cta": "叠起第一层快乐",
  "rules": [
    "楼层会左右移动，点击画布或按空格 / 回车，让它落下。",
    "只有与顶层重叠的部分能留下；每层 100 分，中心对齐再加 50 分。",
    "叠到十二层完成高塔；三次完全落空或 90 秒后结束。"
  ]
};
