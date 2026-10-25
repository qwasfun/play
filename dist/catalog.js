export const games = [
  {id:'star',title:'星轨邮差',english:'ORBIT POST',category:'反应挑战',duration:'1 分钟',tag:'动手',description:'在星星之间，送一封小小的信。',controls:'点击 / 触屏 / 空格',limit:60,cta:'出发送信',rules:['点击或按空格，切换内外两条轨道。','收集黄色信件，每封 10 分；避开红色碎石。','坚持 60 秒完成投递，撞击三次则提前结束。']},
  {id:'bridge',title:'云岛搭桥',english:'CLOUD HOP',category:'时机挑战',duration:'1–2 分钟',tag:'动手',description:'桥长一点点，离下一朵云近一点。',controls:'长按松开 / 按住空格',limit:120,cta:'搭起第一座桥',rules:['按住屏幕、鼠标或空格，让桥梁慢慢增长。','松开落桥，桥端落在下一座岛上即成功。','每次成功 100 分，命中中心额外 50 分；共 12 段桥、三次失误机会。']},
  {id:'lights',title:'灯塔方阵',english:'LITTLE LIGHTS',category:'逻辑解谜',duration:'1–3 分钟',tag:'动脑',description:'轻轻一按，让所有灯都安静下来。',controls:'点击 / 方向键 + 空格',limit:180,cta:'寻找熄灯的顺序',rules:['点击一格，会翻转它自身及上下左右四格的灯。','让 4 × 4 方阵中的灯全部熄灭，即可通关。','用更少步数解开谜题；可以撤销，但已计步数不会减少。']},
  {id:'echo',title:'萤火回声',english:'FIREFLY ECHO',category:'顺序记忆',duration:'1–3 分钟',tag:'动脑',description:'跟随微光，把森林的暗号记下来。',controls:'点击 / 方向键 / WASD',limit:180,cta:'听一听森林',rules:['先观察萤火亮起的顺序，再依次点击相同区域。','每完成一轮，序列增加一个位置，最多 12 轮。','方向键或 WASD 对应上、右、下、左四个区域；播放期间请耐心观察。']}
];
export const byId = Object.fromEntries(games.map(game => [game.id,game]));
