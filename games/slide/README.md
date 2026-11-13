# 拼图小屋

独立游戏包：`@playground/game-slide`。

在仓库根目录执行 `npm ci` 后：

- 开发：`npm run dev -w @playground/game-slide`
- 测试：`npm test -w @playground/game-slide`
- 构建 ESM 库：`npm run build -w @playground/game-slide`

主入口提供 createGame；manifest、art、rules 子入口分别维护说明、插画和成绩规则。仅依赖 game-sdk，禁止引用其他游戏或游乐场。调试页复用 game-runtime，使用独立存储，不连接排行榜、统计或离线缓存。
