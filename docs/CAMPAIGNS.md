# 递进关卡开发说明

《玩呀》28 款游戏各提供 20 关，分四阶段，每阶段 5 关。原推箱子、水管、扫雷、灯塔和拼图的 100 关内容、编号、版本 1 与保存格式保持兼容。各游戏 README 记录已确定的关卡设计。

游戏包通过 `/campaign` 导出 `{campaign:{version,levels}}`；引擎的可选 `level` 参数选择对应题目。未传入 `level` 时，执行原普通模式。注册表按需加载关卡，构建自动生成独立包、网页和完整 PWA 缓存。

`manifest.campaign.recordPolicy` 使用 `steps`、`elapsed` 或 `action`。`presentation` 可声明关卡画布、操作说明和生命栏，运行器仍统一处理坐标换算、暂停、后台与全屏。闯关不申请或提交在线成绩。

保存键继续使用 `tiny-break-arcade:campaign:v1`。原有步数与用时记录继续读取；动作记录增加 `score`、`mistakes`，依次比较更少失误、更高得分和更短用时。扫雷、回声与配对按用时比较，其余解谜按步数再按用时比较。只保存通关记录，未完成棋盘不保存；存储不可用时保留当前页面内存中的解锁进度并提示。

新增 23 款关卡独立生成，不重写原 100 关：

```powershell
npm run campaign:generate:new
npm run campaign:generate:new -- --check
npm test
npm run check
npm run api:build
npm run verify:games
```

生成器与求解器在 `scripts/campaigns/`；谜题合法解、动作路线及真实输入回放在 `tests/fixtures/`。求解器不进入浏览器运行包。`npm run campaign:browser-fixtures` 生成首关、阶段代表关和末关的浏览器输入回放；`scripts/all-campaign-qa.js`、`all-campaign-layout-qa.js`、`all-campaign-compat-qa.js` 与 `all-campaign-preview-qa.js` 分别覆盖完整通关、手机与离线、旧记录兼容及独立预览。

验收日志、报告、截图和旧版升级夹具保存在忽略目录 `output/playwright/`。新增关卡上线须按仓库平台变更流程另行提交与发布。

跨游戏更新还会通过 `scripts/legacy-playthroughs.mjs` 提供的既有游戏兼容入口，对普通模式执行完整输入回放；既有四款专用实玩入口继续复用。浏览器与隔离后端使用相同的确定种子，本机模式也固定测试种子。回放只经前端输入操作游戏，结果仍由真实引擎结算和真实处理器校验。新增游戏仍须提供自己的 `qa/playthrough.mjs`，不会自动采用旧游戏兼容入口。
