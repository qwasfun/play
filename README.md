# 玩呀

中文、免登录、手机和电脑均可游玩的小游戏网站。使用 JavaScript、Canvas 2D、原创 SVG 和 npm Workspaces，Vite 用于开发与构建。

挑战每天做一款新游戏。

[在线游玩](https://play.185036.xyz/) · [GitHub 仓库](https://github.com/qwasfun/play) · [开发与交付指南](docs/DEVELOPMENT.md) · [关卡开发说明](docs/CAMPAIGNS.md)

## 功能与游玩

- 支持触屏、鼠标和键盘，提供开始、暂停、继续、重开及全屏；切换到后台、失焦或调整画布尺寸时自动暂停，返回后手动继续。
- 收藏、最近游玩、最佳成绩和闯关进度保存在本机；清除浏览器数据会移除记录，不同域名与设备的记录独立。
- 每日挑战按北京时间零点轮换，历史分享链接保留原游戏与规则；新游戏不会自动加入挑战池。
- 游戏支持匿名普通排行榜，每日榜是否开放以游戏配置为准。闯关只保存本机进度。匿名身份由浏览器 Cookie 保存，不提供账号登录或跨设备合并。
- 在线对局的成绩提交遇到临时错误时，会在有效期内自动重试；本机存储可用时，恢复联网或刷新页面后仍可继续提交。永久错误或对局到期会停止重试并展示原因，离线开局只记录本机成绩。

### 安装、离线与更新

首次联网打开首页，等待“离线已就绪”，即可在断网后打开游戏、刷新页面及游玩。点击“添加到桌面”安装；iPhone/iPad 使用 Safari 分享菜单中的“添加到主屏幕”。安装与离线体验请使用正式 HTTPS 网站。

应用在启动和恢复联网时检查更新。新版本准备完成后，提供“更新应用”和“稍后”；点击更新才刷新当前窗口，当前对局会重置，已保存的记录保留。全屏游戏期间暂不展示更新提示。离线资源缺失时，可联网点击“重新准备”。

### 游戏与操作说明

各游戏 README 包含玩法、输入方式、计分与设计说明。果园分篮、纸鸢乘风和茶席四方目前仅提供普通模式，其余游戏还提供递进关卡。

| 游戏                                 | 游戏                                      | 游戏                                 |
| ------------------------------------ | ----------------------------------------- | ------------------------------------ |
| [星轨邮差](games/star/README.md)     | [云岛搭桥](games/bridge/README.md)        | [灯塔方阵](games/lights/README.md)   |
| [萤火回声](games/echo/README.md)     | [果园接接乐](games/catch/README.md)       | [弹珠打砖块](games/bounce/README.md) |
| [翻翻小花园](games/pairs/README.md)  | [数字合合乐](games/merge/README.md)       | [星环投投乐](games/rings/README.md)  |
| [小蛇吃星星](games/snake/README.md)  | [花园推箱子](games/boxes/README.md)       | [水管小花园](games/pipes/README.md)  |
| [接力跳跳](games/jump/README.md)     | [泡泡消消](games/bubbles/README.md)       | [拼图小屋](games/slide/README.md)    |
| [节奏点点](games/rhythm/README.md)   | [一笔星图](games/constellation/README.md) | [叠叠高塔](games/tower/README.md)    |
| [躲雨小伞](games/rain/README.md)     | [花田扫雷](games/mines/README.md)         | [萤灯巡夜](games/lantern/README.md)  |
| [风帆过峡](games/sail/README.md)     | [果篮天平](games/balance/README.md)       | [茶点跳跳棋](games/pebble/README.md) |
| [风车采蜜](games/windmill/README.md) | [花径送信](games/courier/README.md)       | [花窗数织](games/weave/README.md)    |
| [量水茶坊](games/jugs/README.md)     | [果园分篮](games/orchard-sort/README.md)  | [纸鸢乘风](games/kite/README.md)     |
| [茶席四方](games/tea-grid/README.md) |                                           |                                      |

## 本地运行

需要 **Node.js 24.9 或更新版本**。在仓库根目录执行：

```powershell
npm ci
npm run dev
```

打开 <http://127.0.0.1:4174>。开发服务支持热更新，不注册离线缓存；同一局域网的手机可通过电脑 IP 和对应端口访问，需允许本机防火墙放行。

验证安装、离线或更新行为时，使用构建预览：

```powershell
npm run build
npm run preview
```

预览地址为 <http://127.0.0.1:4175>，与开发服务使用不同来源，避免旧 Service Worker 干扰。构建会生成完整离线清单；`dist/` 为生成产物，不手工编辑或提交。

### 本地排行榜

另开终端启动隔离的本地 Worker 与数据库：

```powershell
npm run api:setup
npm run api:dev
```

本机网页自动连接 `http://127.0.0.1:8787`；网页与 API 应使用同一种主机名。`api:setup` 只迁移本地数据库，`api:build` 只做打包检查。数据库、日志和验收产物位于已忽略的 `worker/.wrangler/` 与 `output/`。

### 验证命令

```powershell
npm test
npm run check
npm run api:build
npm run verify:games
```

`npm test` 会先构建全部游戏与网站；`npm run check` 检查代码、格式、包边界和离线清单。`verify:games` 需要独立浏览器运行器，其安装方式、桌面与触屏验收流程见[开发与交付指南](docs/DEVELOPMENT.md#游戏包和验收接口)。浏览器验收使用隔离数据库，勿向生产排行榜写入测试成绩；触屏模拟不等于实体手机验收。纯文档改动只检查格式、链接和内容一致性。

## 项目结构与开发

| 目录                     | 职责                                         |
| ------------------------ | -------------------------------------------- |
| `apps/arcade`            | 首页、路由、收藏、每日挑战、排行榜界面与 PWA |
| `games/<id>`             | 每款游戏的引擎、资源、规则、测试与说明       |
| `packages/game-sdk`      | 游戏接口、随机数、绘图与通用成绩校验         |
| `packages/game-runtime`  | 统一输入、计时、暂停、全屏与生命周期         |
| `packages/game-registry` | 游戏注册、规则集、历史挑战日历与动态加载     |
| `worker`                 | Cloudflare Worker 排行榜接口与 D1 数据库迁移 |

单独开发游戏时，可运行 `npm run dev -w @playground/game-star`；单游戏预览使用独立本机记录，不连接排行榜或 Service Worker。新增游戏、分支协作、人工接手和 PR 检查遵循 [AGENTS.md](AGENTS.md) 与[开发与交付指南](docs/DEVELOPMENT.md)，关卡接口及固定内容生成方式见[关卡开发说明](docs/CAMPAIGNS.md)。

每次新增游戏时，在本 README 的游戏列表补充对应 README 链接，并同步核对功能与模式说明。

## 发布与配置

生产网页由 GitHub Pages 托管，排行榜 API 为 `https://play-api.185036.xyz`。公开配置位于 `apps/arcade/src/site-config.js`；Umami 的 `websiteId` 当前为空，未启用统计采集。

[发布工作流](.github/workflows/pages.yml) 在推送 `main` 或手动触发时，依次执行构建、测试、静态检查和 Worker 打包检查，保存网页产物与回滚副本，再部署向后兼容的 Worker、验证各游戏榜单接口，最后发布同一提交的网页并核对线上版本和资源。流程使用仓库 Secret `CLOUDFLARE_API_TOKEN`，**不会自动执行生产数据库迁移**。

发布失败会暂停后续自动集成与发布，必要时恢复上一版网页。查明并修复原因后，按[发布、回滚与恢复流程](docs/DEVELOPMENT.md#发布回滚与恢复)处理。密钥、本机配置、截图与测试产物不得提交或发布。
