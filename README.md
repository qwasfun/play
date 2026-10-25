# 三分钟游乐场

中文、免登录、手机和电脑均可游玩的四款小游戏网站。使用原生 ES Modules、Canvas 2D 和原创 SVG，无第三方运行依赖。

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

游戏页首次点击开始后才计时。切换标签页或窗口失焦时暂停，返回后手动继续。长按被系统取消或游戏暂停时不会误落桥。

旋转屏幕或画布尺寸改变时也会自动暂停，清除当前长按，进度和已得分保留。短横屏采用左侧画布、右侧成绩与操作栏，暂停、重开和返回游乐场始终可见。多指操作只响应最初的主指，副指抬起不会打断长按；画布内禁止长按菜单，页面其他区域仍可正常滚动和选择文字。

## 手机触控检查

2026-10-26 在独立的 Chromium 手机触屏模拟环境完成：34 项规则与输入测试、23 个触控场景、32 个横竖屏布局场景。覆盖真实浏览器触屏事件、多指、长按后拖出、系统取消、2 秒长按、旋转时取消输入及恢复、四款游戏旋转后的触控坐标。尺寸包含 375×812、812×375、390×844、844×390、320×568、568×320、768×1024、1024×768。实体 iOS/Android 尚未实测。

启动本地服务后，可使用 Playwright CLI 重跑手机检查（需已安装 Chrome）：

```powershell
npx --yes --package @playwright/cli playwright-cli -s=mobileqa open http://127.0.0.1:4175 --mobile --browser chrome
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/mobile-qa.js
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/mobile-layout.js
npx --yes --package @playwright/cli playwright-cli -s=mobileqa close
```

浏览器截图保存于已忽略的 `output/playwright/`，不会随网站发布。

## 每日挑战与存储

每日按 Asia/Shanghai（UTC+8）零点轮换一款。种子由日期、游戏 ID 和规则版本共同生成，所有玩家同日同题。分享链接保留日期和版本，历史挑战不计入今天。普通模式每次进入生成新种子，重开保留当前关卡。

收藏、最近玩过、音效开关和最佳成绩存储在当前浏览器的 `tiny-break-arcade:v1`，没有服务端账户或跨设备同步。存储不可用时使用内存继续游玩并显示提示。分享成绩优先复制文字和链接，复制受限时提供可选中的文本框。

## 结构与扩展

`dist/catalog.js` 定义游戏目录；游戏模块按需加载，接口是 `createGame({seed,onFinish,sound})`，返回 `update(dt)`、`draw(ctx)`、`input(type,payload)`、`getState()` 和 `destroy()`。画布采用 600×480 逻辑坐标，统一运行器以 1/60 秒步长更新，页面负责生命周期与成绩存储。

部署入口为 `dist/index.html`；`.openai/hosting.json` 保存本项目 Sites 标识。仅此目录为发布范围，截图和临时诊断保存在已忽略的 `artifacts/`。
