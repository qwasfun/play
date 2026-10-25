# 三分钟游乐场

中文、免登录、手机和电脑均可游玩的十二款小游戏网站。使用原生 ES Modules、Canvas 2D 和原创 SVG，无第三方运行依赖。

## 本地运行

需要 Node.js 20 或更新版本。在本目录执行：

```powershell
npm run dev
```

打开 http://127.0.0.1:4175 。当前服务绑定本机所有网络接口；手机与电脑连接同一局域网时，可使用电脑的局域网 IP 和 4175 端口访问（受本机防火墙设置影响）。

```powershell
npm test
npm run check
```

## 游戏

- 星轨邮差：点击或空格切换轨道，60 秒收信，三次碰撞结束。
- 云岛搭桥：长按增长、松开落桥，12 段桥，三次失误或 120 秒结束。
- 灯塔方阵：点击翻转十字区域，4×4 全灭通关，180 秒；撤销不退回计步。
- 萤火回声：复现四个区域的闪光顺序，最多 12 轮，180 秒。
- 果园接接乐：左右拖动篮子接水果、避石头，60 秒、3 次机会。
- 弹珠打砖块：左右拖动球拍接球，打掉 24 块砖，120 秒、3 次机会。
- 翻翻小花园：记住并配对 12 张花牌，120 秒，翻牌次数影响通关奖励。
- 数字合合乐：四向滑动合并数字，目标 128，180 秒或棋盘无法移动结束。
- 星环投投乐：向后拖拉瞄准，松手投球，120 秒、3 次机会、8 个星环。
- 小蛇吃星星：滑动或方向键转弯，吃满 10 颗星星，90 秒，撞墙或自身结束。
- 花园推箱子：将三个木箱推到花圃，180 秒，支持撤销且不退回计步。
- 水管小花园：旋转 4×4 管道，将左上入口连接至右下花朵，180 秒。

游戏页首次点击开始后才计时。切换标签页或窗口失焦时暂停，返回后手动继续。长按被系统取消或游戏暂停时不会误落桥。

旋转屏幕或画布尺寸改变时也会自动暂停，清除当前长按，进度和已得分保留。短横屏采用左侧画布、右侧成绩与操作栏，暂停、重开和返回游乐场始终可见。多指操作只响应最初的主指，副指抬起不会打断长按；画布内禁止长按菜单，页面其他区域仍可正常滚动和选择文字。

## 手机触控检查

第一轮针对原四款游戏，在独立的 Chromium 手机触屏模拟环境完成 34 项规则与输入测试、23 个触控场景、32 个横竖屏布局场景。当前测试已扩充至十二款游戏；覆盖真实浏览器触屏事件、多指、长按后拖出、系统取消、旋转时取消输入及恢复。尺寸包含 375×812、812×375、390×844、844×390、320×568、568×320、768×1024、1024×768。实体 iOS/Android 尚未实测。

启动本地服务后，可使用 Playwright CLI 重跑手机检查（需已安装 Chrome）：

```powershell
npx --yes --package @playwright/cli playwright-cli -s=mobileqa open http://127.0.0.1:4175 --mobile --browser chrome
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/mobile-qa.js
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/mobile-layout.js
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/expansion-qa.js
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/wave3-qa.js
npx --yes --package @playwright/cli playwright-cli -s=mobileqa close
```

浏览器截图保存于已忽略的 `output/playwright/`，不会随网站发布。

八款扩充版通过 79 项规则、存档和输入测试，新增游戏手机验收包含完整配对通关、67 次滑动合出 128、拖篮接果、击砖、旋转后继续及八款收藏刷新保留。`mobile-layout.js` 覆盖八款游戏的 64 个尺寸组合。触屏按钮在抬手时直接激活，并屏蔽随后重复的兼容点击，避免拖动后按钮不响应和通关时点击穿透。

十二款版通过 106 项自动测试、43 个本轮浏览器场景和 96 个横竖屏布局组合。新四款验收包含触屏连续八环满血通关、推箱触屏与键盘通关及撤销计步、水管旋转通关、小蛇收星转弯与旋转后继续。三张推箱地图逐张通过 BFS 验证，300 个水管种子均初始未解且存在可用解法。

## 每日挑战与存储

每日按 Asia/Shanghai（UTC+8）零点轮换一款。2026-10-27 至 11-03 保留已发布的首轮八款日历；11-04 起按最新四款、此前八款的固定顺序轮换十二款游戏。更早日期保留原四款日历，旧分享链接保持有效。后续扩充应增加新的日期分界，不修改既有日期的游戏映射。种子由日期、游戏 ID 和规则版本共同生成，所有玩家同日同题。分享链接保留日期和版本，历史挑战不计入今天。普通模式每次进入生成新种子，重开保留当前关卡。

收藏、最近玩过、音效开关和最佳成绩存储在当前浏览器的 `tiny-break-arcade:v1`，没有服务端账户或跨设备同步。存储不可用时使用内存继续游玩并显示提示。分享成绩优先复制文字和链接，复制受限时提供可选中的文本框。

## 结构与扩展

`dist/catalog.js` 定义游戏目录；游戏模块按需加载，接口是 `createGame({seed,onFinish,sound})`，返回 `update(dt)`、`draw(ctx)`、`input(type,payload)`、`getState()` 和 `destroy()`。画布采用 600×480 逻辑坐标，统一运行器以 1/60 秒步长更新，页面负责生命周期与成绩存储。

部署入口为 `dist/index.html`；`.openai/hosting.json` 保存本项目 Sites 标识。仅此目录为发布范围，截图和临时诊断保存在已忽略的 `artifacts/`。
