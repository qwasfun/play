/** @type {import('@playground/game-sdk').GameManifest} */
export const manifest = {
  "id": "bridge",
  "title": "云岛搭桥",
  "english": "CLOUD HOP",
  "category": "时机挑战",
  "duration": "1–2 分钟",
  "tag": "动手",
  "description": "桥长一点点，离下一朵云近一点。",
  "controls": "长按松开 / 按住空格",
  "limit": 120,
  "lives": true,
  "extraLabel": "剩余机会",
  "icon": "⌁",
  "cta": "搭起第一座桥",
  "rules": [
    "按住屏幕、鼠标或空格，让桥梁慢慢增长。",
    "松开落桥，桥端落在下一座岛上即成功。",
    "每次成功 100 分，命中中心额外 50 分；共 12 段桥、三次失误机会。"
  ]
};
