# 玩呀

中文、免登录、手机和电脑均可游玩的二十八款小游戏网站。采用 npm Workspaces 管理独立游戏包，使用 JavaScript、Canvas 2D 和原创 SVG；Vite 仅用于开发和构建。

每日新增一款游戏、人工设计协作、分支与自动验收发布规则见 [开发与交付指南](docs/DEVELOPMENT.md)。定时生成任务尚未创建；游戏改动通过 PR 检查后可自动 rebase 合并，平台变更由人工确认。

## 本地运行

需要 Node.js 24.9 或更新版本（接口测试使用内置 SQLite）。在本目录执行：

```powershell
npm ci
npm run dev
```

源码开发打开 http://127.0.0.1:4174 。服务绑定本机所有网络接口；手机与电脑连接同一局域网时，可使用电脑的局域网 IP 和对应端口访问（受本机防火墙设置影响）。

```powershell
npm run prepare:pwa
npm test
npm run check
```

`npm run dev` 在 4174 端口提供源码热更新预览，不注册离线缓存。验收离线功能时先执行 `npm run build`，再执行 `npm run preview`，访问 4175 端口。两种服务使用不同来源，避免旧 Service Worker 覆盖开发页面。`npm test` 会先构建全部游戏库和网站，再运行游戏、公共能力和集成测试。构建自动生成完整离线清单，`npm run check` 会拒绝陈旧清单；文本哈希统一换行格式以兼容 Windows 与 Linux。

## 安装与离线游玩

首次联网打开首页，等待“20 款游戏 · 离线已就绪”。此时全部游戏模块、首页、样式及安装图标都已保存，不必先逐个玩过。断网后可以直接打开游戏链接、刷新、开始/暂停/重开、使用全屏和每日挑战；收藏与最佳成绩仍存于本机。

点击首页“安装玩呀”或“添加到桌面”。支持原生安装提示的浏览器会显示系统提示，否则显示操作指南；iPhone/iPad 使用 Safari 分享菜单中的“添加到主屏幕”。手机体验安装与离线时请使用正式 HTTPS 网址，局域网 HTTP 预览仅供在线调试。

新版本完整下载后会等待全部旧游乐场窗口关闭，再自然生效；不会强制刷新正在玩的游戏。离线资源缺失时首页会显示“重新准备”，联网点击可补齐；若服务器已升级则提示关闭所有窗口后重开，避免混用不同版本。清除浏览器数据会移除离线资源与本机记录；不同域名分别保存记录。

本轮通过 190 项自动测试（含 17 项离线缓存规则）、59 项浏览器安装/断网检查及 14 项 A/B 更新检查。首次仅打开首页后清除 HTTP 缓存并断网，二十款逐项直达刷新、开始/暂停/重开均可用；验证离线通关、存档、历史挑战、原生全屏和缓存损坏修复。安装提示分支与 iOS 指南使用模拟事件/设备信息验收，未真正向系统安装应用，未做手机真机安装测试；Chromium 自动化隐私会话的安装诊断仅报告 `in-incognito`，Manifest 无错误。

离线验收使用独立 Playwright CLI 会话运行 `scripts/pwa-qa.js`，该脚本会清除本应用离线缓存后重测，保留本机成绩。更新专项先运行 `node scripts/pwa-update-server.mjs`，再在独立会话打开打印的本机网址、运行 `scripts/pwa-update-qa.js`；版本快照仅位于已忽略的 `output/playwright/`，不修改生产目录。

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

执行 `npm run build` 和 `npm run preview` 后，可使用 Playwright CLI 重跑手机检查（需已安装 Chrome）：

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

## 递进关卡

推箱子、水管、扫雷、灯塔方阵、拼图小屋各有 20 个固定关卡，共 100 关。首页、收藏与最近游玩默认进入选关页；“随心一局”继续进入原有普通模式。第 1 关初始开放，通关解锁下一关，已通关关卡可重玩。闯关不限时，只记录实际游玩时间，暂停或切到后台时不计时。

每 5 关一个阶段：推箱子从单箱到四箱，按最少推动次数分组排序；水管逐步扩大到 6×6，加入绕行和必须浇到的花圃；扫雷从 4×4 / 3 雷递进到 6×6 / 8 雷，全部通过安全起点的数字推理校验，最后一章需要集合包含关系推理；灯塔从 3×3 到 5×5，最少解递进到 9–12 步；3×3 拼图按真实最短解从 4 步递进到 26 步。推箱子、灯塔与拼图可撤销，但累计步数不退回。

路由 `#/levels/<游戏>` 为选关页，`#/levels/<游戏>/<关卡>?cv=1` 为固定关卡。分享链接保留内容版本，不替接收者解锁。闯关只在 `tiny-break-arcade:campaign:v1` 保存已完成关卡及个人最佳，未完成的棋盘不保存，也不参加在线休闲榜。扫雷先比用时，其余四款先比步数再比用时。旧本机成绩、收藏、每日挑战和榜单规则继续独立工作。存储不可用时以本次页面的内存继续，显示保存提示。

五款游戏各自公开 `/campaign` 入口，提供 `{version, levels}`；`createGame` 的可选 `level` 参数启用关卡规则，没有该参数时原规则不变。关卡使用 600×600 画布，输入按实际画布尺寸映射；题目随 PWA 完整缓存。独立预览页可直接选择全部 20 关，调试成绩使用 `tiny-break-arcade:dev:<游戏>:campaign:v1:<关卡>`，不读取正式闯关进度。

`npm run campaign:generate` 使用固定随机源与明确的花园布局重建关卡数据，复核最短解、推箱次数及扫雷推理过程。已发布的 v1 关卡编号和题目不得重排或替换；内容调整应另起版本。完整检查为 `npm test`、`npm run check`、`npm run api:build`；在独立测试浏览器执行 `scripts/campaign-qa.js` 检查真实首关 / 末关通关、存档、手机布局、长按标旗和离线关卡。测试脚本会写入专用浏览器的本机测试进度，不应在个人日常浏览器会话运行。

2026-10-27 关卡验收：306 项自动测试通过，全部 100 关通过真实引擎输入通关及可解性检查；浏览器通过 97 项关卡流程检查、40 项全屏布局检查、11 项关卡版本更新检查、9 项独立预览检查、67 项原游戏离线回归和 14 项历史版本（`24ce5a2`）升级检查，共 238 项。普通及全屏分别覆盖五款游戏的八组尺寸；可点击棋格与可见操作按钮至少 44px，推箱子通过整块画布滑动操作。后端打包检查通过，未修改或部署后端。手机为 Chromium 触屏模拟，尚未实测实体 iOS / Android。

## 结构与扩展

| 工作区 | 职责 |
| --- | --- |
| `apps/arcade` | 首页、路由、收藏、历史记录、每日挑战、排行榜界面、统计和 PWA |
| `games/<id>` | 每款游戏自己的引擎、元信息、原创插画、成绩规则、测试与说明 |
| `packages/game-sdk` | JSDoc 接口、随机数、绘图、SVG 和通用成绩校验机制，不读取游戏目录 |
| `packages/game-runtime` | 固定步长、输入、开始/暂停/重开/撤销、全屏和销毁；通过宿主回调接入存储与网络 |
| `packages/game-registry` | 明确的游戏顺序、纯逻辑规则集、历史挑战日历，以及浏览器插画与动态加载入口 |

每款游戏名为 `@playground/game-<id>`，只依赖 SDK，不得引用其他游戏、注册表或游乐场。主入口提供 `createGame({seed,onFinish,sound})`，返回 `update(dt)`、`draw(ctx)`、`input(type,payload)`、`getState()`、`destroy()`；`/manifest`、`/art`、`/rules` 分别导出 `manifest`、`art()`、`rules`。`rules` 提供 validate、stored、compare、format、clean、ranking，以及可选 seedCap；服务端使用不含 DOM/CSS 的纯逻辑入口。新增计数字段及中文标签由游戏自己的规则配置声明。

普通模式画布为 600×480，闯关为 600×600，运行器按 1/60 秒更新。单游戏开发、测试和构建示例：

```powershell
npm run dev -w @playground/game-star
npm test -w @playground/game-star
npm run build -w @playground/game-star
```

单游戏预览默认在 5173 端口，复用正式运行器，只加载目标游戏；调试成绩使用 `tiny-break-arcade:dev:<id>`，不连接排行榜、统计或 Service Worker。包构建生成自身 `dist/` 中的 ESM 库及样式，包含 SDK 所需代码，不构建其他游戏。所有包和库均保持 private，不发布到 npm。

注册新游戏时添加游戏包、将其依赖与入口加入注册表，并保持游戏顺序明确；每日挑战扩容另增日期分界，不改写历史映射。执行 `npm run check:boundaries` 检查跨游戏引用、越过公开入口、循环依赖和源码引用构建产物。

根目录 `dist/` 仅为自动生成、不提交的网页产物，禁止手工修改。构建清单 `module-map.json` 记录源入口到哈希文件的映射，浏览器验收脚本据此定位模块。游戏引擎按需执行，离线安装仍会完整缓存全部二十款游戏。发布范围仅为根目录 `dist/`；本项目通过 GitHub Pages 发布，不使用 ChatGPT Sites 发布。

2026-10-27 架构重构验收：261 项自动测试通过，原有 237 项场景全部保留，新增规则扩展与二十款 ESM 产物契约检查。各游戏工作区独立测试和构建通过；浏览器通过 59 项离线检查、80 项本地排行榜检查、11 项全屏检查（含 160 个布局/旋转组合）及 8 项单游戏预览检查。A/B 更新检查通过 14 项，并使用重构前提交 `24ce5a2` 再次通过 14 项旧版本到新架构的升级检查。手机为 Chromium 触屏模拟，未做实体 iOS/Android 验收。

如需重测这次真实版本迁移，构建当前网站后运行 `node scripts/pwa-update-server.mjs --from-ref 24ce5a2`，在独立浏览器会话打开其打印地址，再执行 `scripts/pwa-update-qa.js`。不带参数时，两份测试版本均来自当前构建。单游戏预览可使用独立手机模拟会话执行 `scripts/single-game-qa.js`；脚本使用浏览器时钟加速完成整局，并检查只加载星轨邮差、存储隔离和无外部服务请求。

## GitHub Pages 部署

GitHub 仓库为 https://github.com/qwasfun/play ，网站域名为 https://play.185036.xyz/ 。

`.github/workflows/pages.yml` 在推送 `main` 或手动运行时，使用 Node.js 24 和 `npm ci` 安装工作区依赖，通过 `npm test` 构建并测试，执行 `npm run check` 和 `npm run api:build` 后将根目录 `dist/` 发布到 GitHub Pages。Worker 仅打包验证，不随 Pages 部署。首页、模块和游戏采用相对路径及 hash 路由，兼容仓库子路径和独立域名。

首次部署需在仓库 **Settings → Pages** 中将 Source 设为 **GitHub Actions**，将 Custom domain 保存为 `play.185036.xyz`。DNS 应设置 `CNAME` 记录 `play` 指向 `qwasfun.github.io`，目标不带 `/play`。等待 GitHub 域名检查通过并签发证书后，启用 **Enforce HTTPS**。

`dist/CNAME` 记录预期域名；使用 GitHub Actions 发布时，仍须在仓库 Pages 设置中绑定域名，单独提交该文件不会完成绑定。截图、测试脚本及本地配置不会作为网页发布。

## 匿名休闲榜与 Umami

现有本机成绩与离线游戏继续独立运行。联网开局时，网页自动建立匿名身份、领取绑定游戏和规则版本的对局凭证；结算后向独立的 Cloudflare Worker 提交成绩，D1 保存每位玩家的最佳纪录。普通模式与每日挑战分榜，每榜展示前 100 名及当前玩家名次。二十款游戏共用规则校验，灯塔方阵只接收通关纪录；其他游戏先比得分，再比用时，完全相同采用并列名次（例如 1、1、3）。榜单用时精确到毫秒，展示到小数点后两位。

匿名身份通过服务端签发的 HttpOnly Cookie 保存，数据库只保存会话令牌的 SHA-256 摘要。生产使用 `__Host-` 前缀、Secure 和 SameSite=Strict；仅显式 local 环境且 API 地址为本机回环地址时，允许本地 HTTP 调试 Cookie。同一浏览器刷新可恢复身份，清除 Cookie、换设备或会话过期后将成为新玩家，旧榜单纪录仍保留。会话有效期一年，不提供账号、邮箱登录或跨设备合并。

昵称为 2–12 个 Unicode 字符，去除首尾空白，禁止控制和不可见字符，允许重名；榜单通过纯文本呈现昵称。字段校验失败返回 `errors: [{field, code, message}]`，页面展示具体字段和修正要求，不回显提交的敏感值。

### 本地运行与验证

```powershell
npm ci
npm run api:setup
npm run api:dev
```

另开终端执行 `npm run dev`，在 http://127.0.0.1:4174 打开任意游戏，再点击“查看排行榜”。本机网页自动连接 http://127.0.0.1:8787；两个地址需使用同一种主机名（都用 127.0.0.1 或都用 localhost）。本地数据库在 `worker/.wrangler/`，日志与打包产物在 `output/worker/`，均不提交或发布。`api:setup` 只迁移本地库，`api:build` 只打包检查，两者不会部署生产。

```powershell
npm test
npm run prepare:pwa
npm run check
npm run api:build
npm run build
npm run preview
npx --yes --package @playwright/cli playwright-cli -s=rankqa open http://127.0.0.1:4175/#/play/mines --browser chrome
npx --yes --package @playwright/cli playwright-cli --raw -s=rankqa run-code --filename scripts/leaderboard-qa.js
```

浏览器脚本在独立会话内检查真实扫雷通关上榜、身份刷新保留、昵称校验与安全展示、重开保持种子、失败重试、历史日榜、断网、清除身份后旧纪录保留，以及二十款游戏在三个手机尺寸下的布局。它会清除该独立会话的 Cookie 并向本地测试库写入纪录，勿对生产运行。截图位于 `output/playwright/`。原 `scripts/pwa-qa.js` 继续验收二十款离线游戏。

上线前本地验收通过 234 项自动测试、80 项排行榜浏览器检查和 59 项离线浏览器检查，Worker 打包检查通过。生产部署另补充 3 项后台清理测试。浏览器验证连接真实的本地 Worker 与 D1；Umami 使用模拟采集端验证字段和失败处理，尚未接入真实统计网站。手机尺寸在 Chromium 中模拟，未做实体 iOS/Android 验收。

### 接口与基础防刷

| 接口 | 行为 |
| --- | --- |
| `POST /v1/guests` | 建立或恢复匿名会话，返回公开玩家资料 |
| `GET/PATCH /v1/me` | 读取身份、修改昵称 |
| `POST /v1/runs` | 提交 `gameId, mode, date, ruleVersion`，领取 `id, seed, expiresAt`；普通模式可附 `restartOf` 复用自己的原关卡 |
| `POST /v1/runs/:id/result` | 提交游戏结算字段，返回 `accepted, eligible, improved, rank` |
| `GET /v1/leaderboards` | 按 `gameId, mode, date, ruleVersion` 查询，返回 `entries, me, total` |
| `GET /healthz` | 存活检查 |

接口只允许配置的网站来源；写操作必须带合法 Origin，读写不缓存。身份凭证仅通过 Cookie 发送，玩家公开 ID 不是身份凭据。每个 IP 每分钟最多 120 次写入；每位玩家每分钟最多 10 次开局、20 次成绩提交、10 次昵称修改，超限返回 429 和 Retry-After。IP 通过独立服务端密钥加盐散列后用于限流，不保存原始 IP。

对局有效期 30 分钟，每日对局最迟在次日北京时间 00:10 结束接收。日期和种子由服务端确定；历史日榜可查看，历史挑战新开局仅保存在本机。服务端验证分数、进度和时长范围，接收成绩、更新最佳纪录和保存回执在同一 D1 事务内完成。相同对局的重试返回首次回执，不重复计分或重复发送统计；回执中的名次表示首次提交时的最佳名次，打开榜单可获得最新排名。

离线开局、接口不可用、过期对局及已有本机历史纪录都不会直接导入公共榜。联网对局提交失败时可在有效期内点击“重试提交”，关闭或离开游戏页面后仍保留本机成绩。成功访问后，在后台按需清理到期会话、限流记录和到期超过 30 天的对局回执；通过 D1 租约保证跨运行实例每小时最多执行一次，空闲期等待下次访问，最佳纪录单独保留。每个实例最多每五分钟检查一次租约，清理失败释放租约供后续重试，不影响当前请求。此方式不占用 Cloudflare Cron 名额；需要定时执行时仍可调用导出的 scheduled 处理器。第一版面向无奖品的休闲比较，基础校验不等于操作回放验分，仍可受到改分、匿名多开和脚本影响。

### Umami 与生产接入

`apps/arcade/src/site-config.js` 保存公开配置，生产 `leaderboardApi` 为 `https://play-api.185036.xyz`。Umami `websiteId` 保持为空，因此当前不会连接真实统计网站。默认追踪脚本为 Umami Cloud，也可配置自建脚本地址。前端仅发送 `game_start`、`game_finish`、`leaderboard_view`，属性限制为游戏、模式、规则版本、得分、用时和通关状态，不发送昵称、匿名身份或会话凭证。脚本尚未加载时暂存少量事件，加载失败不影响游玩。

Worker 在成功入库后异步发送 `score_accepted`；配置 `UMAMI_WEBSITE_ID` 和 `UMAMI_SEND_URL`，默认采集端点为 `https://gateway.umami.is/api/send`。统计按尽力发送处理，失败记录通用日志，不回滚成绩、不阻塞提交；以 D1 榜单作为成绩依据，不使用 Umami 的事件数作为正式纪录。统计管理凭证无需提供给网页。

生产上线需先确认 Cloudflare 账号、D1 数据库、API 域名、Umami 网站 ID 及发布范围，再执行：

1. `worker/wrangler.jsonc` 顶层已配置生产账号、实际 D1 ID 和 Custom Domain。保留 `ENVIRONMENT=production`、`REQUEST_CLEANUP=true` 和精确的 `ALLOWED_ORIGINS`，通过 Worker secret 配置随机 `IP_HASH_SECRET`（不写进源码）。只有 local 环境使用占位数据库 ID。
2. 配置同站 HTTPS API 子域 `play-api.185036.xyz`。静态网页仍由 GitHub Pages 提供；SameSite=Strict Cookie 要求网页和 API 同站，不能直接以跨站 workers.dev 地址替代。
3. 对实际 D1 执行远程迁移，再部署 Worker、绑定 API 域名；确认 Cookie、来源限制及健康检查后，填写网页的 API 和 Umami 配置。
4. 重新生成离线清单并完成检查，审核 `dist/` 网页和 `worker/` 后端两部分的生产变更后发布。可将网页 API 配置清空以关闭上榜入口，游戏和本机纪录继续可用。

生产网页由 GitHub 仓库 `qwasfun/play` 的 `main` 分支自动发布 `dist/`；Worker 独立发布，源文件及数据库迁移均在 `worker/`。后续更新应先完成本地检查，再部署后端、发布网页；生产 API、密钥及数据库已配置时无需重新创建资源或轮换密钥。

API 域名使用 Workers Custom Domain 自动签发的证书，不单独申请或购买证书。按当前部署要求，不为 API 子域额外配置 CAA 记录；保持网页的 GitHub Pages CNAME。

## 2026-10-27 游戏扩充批次

本批次恰好新增四款（规则版本 1）：

- 萤灯巡夜：辨认九格中亮起的金色萤灯，24 轮，三次失误结束。
- 风帆过峡：提前选择石门的安全航道，18 道门，三次碰撞结束。
- 果篮天平：六选多的重量组合题，五题，180 秒。
- 茶点跳跳棋：直线跳过茶点并收起，三盘各留一颗，180 秒，支持撤销。

全部复用统一运行器，支持触屏/鼠标与键盘、暂停/继续/重开、横竖屏和全屏；注册后接入收藏、最近游玩、本机成绩与离线构建。每日挑战在 2027-01-11 新增二十四款日期边界，既有边界、旧日期和规则版本不变。新增游戏的公共榜需要独立 Worker 更新规则集后才支持；本次只发布 Pages，不擅自部署后端。

## 2026-10-28 游戏扩充批次

恰好新增四款（规则版本 1）：

- 风车采蜜：指针旋转到金色花瓣区域时采蜜，每次成功得 50 分。
- 花径送信：沿花径走到信封格收信，共五封，每封 100 分。
- 花窗数织：按行列数字填出 5×5 花窗；数字表示连续色块的长度，多段之间至少空一格。
- 量水茶坊：两只茶壶容量分别为 3 杯和 5 杯；可以装满、倒空，或相互倾倒至一壶满或另一壶空。

统一运行器提供开始、暂停、继续、重开、全屏和旋转保护；支持触屏、鼠标和键盘，注册到首页、分类、收藏、最近玩过、本机成绩和离线包。每日挑战仅追加 2027-02-08 的二十八款边界，旧日期与版本保持不变。新增游戏的公共榜需独立更新 Worker 后开放，本批仅发布 Pages。
