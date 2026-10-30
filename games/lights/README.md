# 灯塔方阵

独立游戏包：`@playground/game-lights`。

在仓库根目录执行 `npm ci` 后：

- 开发：`npm run dev -w @playground/game-lights`
- 测试：`npm test -w @playground/game-lights`
- 构建 ESM 库：`npm run build -w @playground/game-lights`

主入口提供 createGame；manifest、art、rules 子入口分别维护说明、插画和成绩规则。仅依赖 game-sdk，禁止引用其他游戏或游乐场。调试页复用 game-runtime，使用独立存储，不连接排行榜、统计或离线缓存。

普通模式与每日挑战上榜会提交翻灯/撤销操作记录，服务端按本局种子重放并核对步数与通关状态。旧版页面需刷新后重新开局；历史本机成绩和固定关卡不受影响。操作记录最多 100000 个字符，超过上限仍可本机游玩，无法上榜。
