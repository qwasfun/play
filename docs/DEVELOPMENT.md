# 每天一款游戏的协作和交付

只有 `main` 是长期分支。每天一个新游戏、一个独立工作目录、一个 PR；人工的内容和设计调整也通过短期分支进入主分支。本次不配置定时器，未来的 GPT 定时任务调用同一流程即可。

## 开始和重试

在仓库中运行：

```powershell
npm run game:task -- start honey-trail
npm run game:task -- start honey-trail 2026-10-29 C:\Users\dong\dev\game\game05\worktrees\honey-trail
```

日期默认按 Asia/Shanghai 计算。工具读取本地分支、远端分支以及包括已关闭 PR 在内的历史记录；同一天已有任务就返回原任务，不能更换游戏 ID 再创建第二款。已关闭任务需要人工决定重新打开或继续原修复流程。未通过检查的游戏延期，次日任务独立开展。

分支格式为 `game/YYYY-MM-DD/<id>`、`design/<id>/<主题>`、`fix/<id>/<问题>` 和 `platform/<主题>`。游戏 ID 使用小写字母、数字和连接线，以字母开头。独立目录中先运行 `npm ci`，按现有游戏包公开接口开发，不复制别人的整个工作目录和未提交修改。

## 人工接手

```powershell
npm run game:task -- hold 123
# 等待原 GPT 任务停止写入，再在它的工作目录修改
npm run game:task -- ready 123
```

`automation:hold` 优先于 ready，会阻止控制器同步分支和合并。所有 GPT 写入者必须遵守 AGENTS.md，写入、推送前检查标签；该标签不能阻止已经在运行且不遵守约定的外部编辑器。一个分支同一时间只有一个写入者。尚未建立 PR 的任务先停止对应 GPT 会话再接手。

## 游戏包和验收接口

每个游戏拥有代码、资源、规则、测试和 README。README 包含玩法、桌面及触屏操作、计分方式、设计要求和人工决定，后续 GPT 调整以其为准。稳定的游戏 ID、存储标识、历史关卡和每日挑战映射不得替换。

新增游戏只依赖现有 SDK。注册表允许追加新游戏的 manifest、rules、art 和动态加载器，以及对应工作区依赖、锁文件链接；自动策略会比较语法树和锁文件，拒绝在共享文件中夹带旧逻辑调整。目录、包名、manifest.id 必须一致，已有计分规则和关卡内容的修改转人工确认兼容性。公共日历、SDK、运行器、第三方依赖和计分版本调整另开人工确认的 platform PR。新增游戏先提供普通模式，纳入每日挑战日历属于独立的平台变更。

每个新增游戏提供 `games/<id>/qa/playthrough.mjs`：

```js
export async function play({page, mobile, point, seed}) {
  // 页面已进入目标游戏、点击开始，并暂停浏览器时钟；真实后端种子为 seed。
  // point(x,y) 把逻辑画布坐标转换成当前桌面点击或触屏点击。
  // 在这里执行该玩法所需的真实输入；需要推进时钟时用 page.clock.runFor(ms)。
  // 返回前应真正完成一局并获得可参与排行榜的结果。
}
```

验收器负责检查结算、排行榜回执和刷新后存档；不得通过直接调用结算、改状态、绕过前端提交来满足检查。旧游戏首次修改时补齐场景；四款已有的 windmill/courier/weave/jugs 使用现有实玩脚本。

```powershell
npm test
npm run check
npm run api:build
# 浏览器运行器安装到已忽略目录，不修改项目依赖
npm install --prefix output/automation/browser --no-save --ignore-scripts playwright@1.62.1
$env:NODE_PATH = Join-Path (Get-Location) 'output/automation/browser/node_modules'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run verify:games
```

CI 会检查全部游戏的开始、暂停、重开和布局；对改动游戏执行桌面与触屏完整游玩，运行离线回归，并把真实前端请求送到生产处理器加内存 SQLite。测试服务器使用确定种子及加速时钟，不连接生产数据库；接口的时序、防刷、幂等、离线降级和校验错误由现有自动测试同时覆盖。首次搭建流程使用四款已有游戏进行真实结算，并通过扫雷验证真实榜单、幂等重试及刷新后的排名。现有最新八款被产品显式设为本机模式，保持这个行为；未来新增游戏须验证自己的真实上榜链路。报告和截图只保存在检查附件中。触屏模拟不等于实体手机验收。

## PR 与自动合并

推送任务分支，创建一个 PR，完成检查后标记 `automation:ready`。主分支保护要求 `game-verification` 检查通过、包含最新 main、线性历史，且管理员也不能直接推送、强推或删除主分支。个人维护的审批人数为 0。

控制器只运行 main 上的可信代码，重新判断文件范围、检查记录和当前提交；不运行 PR 的脚本。落后于 main 的游戏分支会先 rebase，并用精确的旧提交保护远端推送，再触发完整检查。冲突时添加 hold，不覆盖修改。每次只合并一个 PR，等发布完成再处理下一个。

机器人使用 GITHUB_TOKEN 时，推送和合并不会自然触发后续 push 工作流，所以控制器会显式 dispatch 新一轮验收和精确提交的发布。无需存储个人 GitHub 令牌，不使用原生无范围限制的自动合并开关。初始化配置命令默认只预览：

```powershell
npm run repo:configure
npm run repo:configure -- --apply
```

`--apply` 修改远端分支保护、合并方式和标签。应在新检查已成功运行后执行，避免锁住尚无必需检查的主分支。

## 发布、回滚与恢复

仓库 Secret `CLOUDFLARE_API_TOKEN` 需要具有当前账户 Worker 发布及现有 D1 绑定所需权限。令牌由仓库 Actions Secret 管理，不进入代码、PR 文本或日志；可在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置。本流程不自动迁移数据库。

发布先构建并测试、保存网页产物，再部署后端、读取每款游戏的实际榜单、部署网页产物，最后核对线上版本及游戏模块。线上冒烟只读，完整结算使用 CI 的隔离环境。成功后保存 `release/<提交编号>` 和 `release/last-good`。

失败时建立 `release/hold`，阻止后续自动合并和发布。若网页部署已尝试，使用上一成功版本的 `release-site` 附件恢复网页；保留向后兼容的新后端，避免已打开的新游戏页面失去规则支持。平台变更若破坏后端兼容性，必须人工确认并恢复配套后端。回滚附件保留 30 天；首个新流程发布会尝试复用旧流程仍有效的 Pages 附件，没有可用副本则在部署前停止，先建立基线备份。

修复后运行：

```powershell
npm run release:resume
```

该操作明确解除暂停，并重新发布当前 main。不能在未查明失败原因时自动恢复。代码修复或回退都通过新 PR，不改写 main 历史。

## 游戏模式契约

合法配置有两种：只有普通模式，或普通模式加闯关模式。普通模式始终提供引擎、manifest、rules 和 art；只有闯关游戏才声明 manifest.campaign、包的 ./campaign 导出和注册表的 campaignLoader，并提供真实关卡数据。普通模式游戏不需要 campaign.js，也不应添加空关卡文件来通过验收。首页自动链接普通模式；其 /levels 路由返回未开放提示。每日挑战池保持历史映射，不因新增普通游戏而自动变化。

公共关卡测试按 manifest.campaign 选择游戏，验证所有声明的关卡；原有 28 款、560 关及原始内容哈希仍受保护。tests/game-modes.test.mjs 使用隔离的普通模式样例验证缺少 campaign 文件的合法配置，并检查双模式入口和路由。
