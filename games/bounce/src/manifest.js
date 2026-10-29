/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  "id": "bounce",
  "campaign": {"version":1,"total":20,"recordPolicy":"action","presentation":{"canvas":{"width":600,"height":480},"lives":3,"extraLabel":"剩余机会"}},
  "title": "弹珠打砖块",
  "english": "CANDY BOUNCE",
  "category": "物理反弹",
  "duration": "1–2 分钟",
  "tag": "动手",
  "isNew": false,
  "lives": true,
  "extraLabel": "剩余机会",
  "icon": "◒",
  "description": "轻轻一接，让小弹珠撞出满屏快乐。",
  "controls": "左右拖动 / 左右方向键",
  "limit": 120,
  "cta": "发射快乐弹珠",
  "rules": [
    "左右拖动球拍，或按住左右方向键，接住落下的弹珠。",
    "每打掉一块砖获得 10 分，清空 24 块砖即可通关。",
    "弹珠掉落扣除一次机会，三次失误或 120 秒后结束。"
  ]
};
