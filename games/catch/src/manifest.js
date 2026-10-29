/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  "id": "catch",
  "campaign": {"version":1,"total":20,"recordPolicy":"action","presentation":{"canvas":{"width":600,"height":480},"lives":3,"extraLabel":"剩余机会"}},
  "title": "果园接接乐",
  "english": "ORCHARD CATCH",
  "category": "拖动接物",
  "duration": "1 分钟",
  "tag": "动手",
  "isNew": false,
  "lives": true,
  "extraLabel": "剩余机会",
  "icon": "♧",
  "description": "接住甜甜的果实，让篮子满载而归。",
  "controls": "左右拖动 / 左右方向键",
  "limit": 60,
  "cta": "带上小篮子",
  "rules": [
    "在画布内左右拖动，或按住左右方向键移动篮子。",
    "每接住一颗水果获得 10 分，漏掉水果不会扣除机会。",
    "避开灰色石头；三次碰撞或 60 秒后结束这一局。"
  ]
};
