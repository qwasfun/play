/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  "id": "jump",
  "campaign": {"version":1,"total":20,"recordPolicy":"action","presentation":{"canvas":{"width":600,"height":480},"lives":3,"extraLabel":"剩余机会"}},
  "title": "接力跳跳",
  "english": "LITTLE LEAP",
  "category": "跳跃闯关",
  "duration": "1 分钟",
  "tag": "动手",
  "isNew": false,
  "lives": true,
  "extraLabel": "剩余机会",
  "icon": "↟",
  "description": "抓准小小的时机，跳过一路的小障碍。",
  "controls": "点击 / 空格 / ↑ / W",
  "limit": 60,
  "cta": "轻轻跳向前方",
  "rules": [
    "角色会自动向前，点击画布或按空格、上方向键 / W 起跳。",
    "观察前方障碍，在接近时跳过；每跨过一个获得 100 分。",
    "通过十二个障碍即可完成接力；三次碰撞或 60 秒后结束。"
  ]
};
