# 三分钟游乐场

中文、免登录、手机和电脑均可游玩的二十款小游戏网站。使用原生 ES Modules、Canvas 2D 和原创 SVG，无第三方运行依赖。

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
- 接力跳跳：点击、空格或 ↑ / W 起跳，跨过十二个木桩，60 秒、3 次机会。
- 泡泡消消：点击相邻同色泡泡组，重力下落及空列左移；90 秒内清空三盘。
- 拼图小屋：3×3 滑块，点击邻格或方向键 / WASD 移动空位，180 秒，可撤销且不退计步。
- 节奏点点：四轨下落音符，触屏或 A/W/S/D、方向键接拍，32 个音符、50 秒、5 次机会。
- 一笔星图：沿星图逐边连线，三关、180 秒，支持触屏拖动、逐点点击、键盘及撤销。
- 叠叠高塔：点击或空格落块，保留重叠部分，十二层、90 秒、3 次落空机会。
- 躲雨小伞：拖动或方向键移伞，挡雨接阳光，二十四个目标、60 秒、3 次漏接机会。
- 花田扫雷：4×4、3 颗雷，左上安全起步；点击翻开、长按标旗，键盘空格翻开/回车标旗，180 秒。

游戏页首次点击开始后才计时。切换标签页或窗口失焦时暂停，返回后手动继续。长按被系统取消或游戏暂停时不会误落桥。

二十款游戏均可点击“⛶ 全屏”。优先使用浏览器原生全屏；原生 API 不支持或被嵌入页面限制时，自动使用铺满当前网页的沉浸布局。全屏包含成绩、暂停、重开和返回入口；点击“退出全屏”或按 Escape 返回。进入、退出和旋转屏幕均暂停当前游戏、取消尚未完成的长按或拖动，保留进度。返回首页或切换游戏时自动清理全屏状态。

旋转屏幕或画布尺寸改变时也会自动暂停，清除当前长按，进度和已得分保留。短横屏采用左侧画布、右侧成绩与操作栏，暂停、重开和返回游乐场始终可见。多指操作只响应最初的主指，副指抬起不会打断长按；画布内禁止长按菜单，页面其他区域仍可正常滚动和选择文字。

## 手机触控检查

第一轮针对原四款游戏，在独立的 Chromium 手机触屏模拟环境完成 34 项规则与输入测试、23 个触控场景、32 个横竖屏布局场景。当前测试已扩充至二十款游戏；覆盖真实浏览器触屏事件、多指、长按后拖出、系统取消、旋转时取消输入及恢复。尺寸包含 375×812、812×375、390×844、844×390、320×568、568×320、768×1024、1024×768。实体 iOS/Android 尚未实测。

启动本地服务后，可使用 Playwright CLI 重跑手机检查（需已安装 Chrome）：

```powershell
npx --yes --package @playwright/cli playwright-cli -s=mobileqa open http://127.0.0.1:4175 --mobile --browser chrome
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/mobile-qa.js
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/mobile-layout.js
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/expansion-qa.js
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/wave3-qa.js
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/wave4-puzzle-qa.js
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/wave4-action-qa.js
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/wave5-puzzle-qa.js
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/wave5-action-qa.js
npx --yes --package @playwright/cli playwright-cli --raw -s=mobileqa run-code --filename scripts/fullscreen-qa.js
npx --yes --package @playwright/cli playwright-cli -s=mobileqa close
```

电脑浏览器可使用不带 `--mobile` 的独立会话运行 `scripts/wave4-desktop-qa.js`，检查键盘操作及原生全屏。

新四款电脑检查使用 `scripts/wave5-desktop-qa.js`，包含完整星图/扫雷键盘通关、高塔落块，以及对伞面位置的实际画布检测，确认左右方向键移动与松键停止。

浏览器截图保存于已忽略的 `output/playwright/`，不会随网站发布。

八款扩充版通过 79 项规则、存档和输入测试，新增游戏手机验收包含完整配对通关、67 次滑动合出 128、拖篮接果、击砖、旋转后继续及八款收藏刷新保留。`mobile-layout.js` 覆盖八款游戏的 64 个尺寸组合。触屏按钮在抬手时直接激活，并屏蔽随后重复的兼容点击，避免拖动后按钮不响应和通关时点击穿透。

十二款版通过 106 项自动测试、43 个本轮浏览器场景和 96 个横竖屏布局组合。新四款验收包含触屏连续八环满血通关、推箱触屏与键盘通关及撤销计步、水管旋转通关、小蛇收星转弯与旋转后继续。三张推箱地图逐张通过 BFS 验证，300 个水管种子均初始未解且存在可用解法。

全屏版自动测试共 116 项，新增 10 项覆盖原生及 WebKit API、外部退出、拒绝/不支持时降级、Escape、销毁竞态和重复点击。`fullscreen-qa.js` 在 Chromium 触屏模拟下检查原生进入/退出、替代模式、长按取消、路由清理及十二款游戏的 96 个全屏布局与旋转组合；实体手机仍未实测。

十六款版通过 144 项自动测试，新四款共 55 项手机与电脑浏览器游玩检查，包括跳跃十二障碍满血通关、节奏三十二拍全连 3200 分、气泡三盘全清、拼图触屏与键盘通关及撤销计步。普通和全屏各检查 128 个布局组合，全屏额外验证进入/退出、受限时替代模式、旋转暂停及清理。220 个气泡种子始终可清空，300 个滑块种子均有逆解。上述手机检查为 Chromium 触屏模拟，尚未实测实体 iOS/Android。

二十款版通过 173 项自动测试及 63 项新游戏手机与电脑浏览器游玩检查：高塔十二层通关、小伞二十四个目标全接 600 分、星图三关 700 分、扫雷十三格全开与点雷失败。覆盖触屏分段连线、撤销、长按标旗、长按旋转取消、刷新后成绩保留、二十款收藏。普通和全屏各检查 160 个布局组合；全屏包含原生及受限时替代模式。220 个星图种子可通关、250 个扫雷种子有效。手机验证仍为 Chromium 触屏模拟，尚未实测实体 iOS/Android。

## 每日挑战与存储

每日按 Asia/Shanghai（UTC+8）零点轮换一款。2026-10-27 至 11-03 保留首轮八款日历，11-04 至 11-15 保留首轮十二款日历，11-16 至 12-01 保留首轮十六款日历；12-02 起以一笔星图、叠叠高塔、躲雨小伞、花田扫雷和此前十六款的顺序轮换二十款游戏。更早日期保留原四款日历，旧分享链接保持有效。后续扩充应增加新的日期分界，不修改既有日期的游戏映射。种子由日期、游戏 ID 和规则版本共同生成，所有玩家同日同题。分享链接保留日期和版本，历史挑战不计入今天。普通模式每次进入生成新种子，重开保留当前关卡。

收藏、最近玩过、音效开关和最佳成绩存储在当前浏览器的 `tiny-break-arcade:v1`，没有服务端账户或跨设备同步。存储不可用时使用内存继续游玩并显示提示。分享成绩优先复制文字和链接，复制受限时提供可选中的文本框。

## 结构与扩展

`dist/catalog.js` 定义游戏目录；游戏模块按需加载，接口是 `createGame({seed,onFinish,sound})`，返回 `update(dt)`、`draw(ctx)`、`input(type,payload)`、`getState()` 和 `destroy()`。画布采用 600×480 逻辑坐标，统一运行器以 1/60 秒步长更新，页面负责生命周期与成绩存储。

部署入口为 `dist/index.html`；`.openai/hosting.json` 保存本项目 Sites 标识。仅此目录为发布范围，截图和临时诊断保存在已忽略的 `artifacts/`。

## GitHub Pages 部署

GitHub 仓库为 https://github.com/qwasfun/play ，网站域名为 https://play.185036.xyz/ 。

`.github/workflows/pages.yml` 在推送 `main` 或手动运行时，使用 Node.js 24 执行 `npm test` 和 `npm run check`，检查通过后将 `dist/` 发布到 GitHub Pages。网站不需要额外构建或安装运行依赖；首页、模块和游戏均使用相对路径及 hash 路由，兼容仓库子路径和独立域名。

首次部署需在仓库 **Settings → Pages** 中将 Source 设为 **GitHub Actions**，将 Custom domain 保存为 `play.185036.xyz`。DNS 应设置 `CNAME` 记录 `play` 指向 `qwasfun.github.io`，目标不带 `/play`。等待 GitHub 域名检查通过并签发证书后，启用 **Enforce HTTPS**。

`dist/CNAME` 记录预期域名；使用 GitHub Actions 发布时，仍须在仓库 Pages 设置中绑定域名，单独提交该文件不会完成绑定。截图、测试脚本及本地配置不会作为网页发布。
