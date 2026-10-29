export const manifest = {
  "id": "courier",
  "campaign": {"version":1,"total":20,"recordPolicy":"action","presentation":{"canvas":{"width":600,"height":600},"lives":3,"extraLabel":"剩余机会"}},
  "title": "花径送信",
  "english": "GARDEN COURIER",
  "category": "敏捷动作",
  "tag": "动手",
  "duration": "约 1–3 分钟",
  "isNew": true,
  "extraLabel": "旅途进度",
  "targetText": "准备出发",
  "icon": "✉",
  "description": "沿花径走到信封格收信，共五封，每封 100 分。",
  "controls": "方向键 / WASD / 点击相邻格",
  "limit": 90,
  "cta": "开始这段小旅行",
  "rules": [
    "沿花径走到信封格收信，共五封，每封 100 分。",
    "蜜蜂每 0.65 秒移动一格，下一站用小圆点预告；碰到蜜蜂扣一次机会并回起点。",
    "不能穿过灌木；三次碰撞或 90 秒结束。"
  ],
  "lives": 3
};
