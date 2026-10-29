# 萤火回声

独立游戏包：`@playground/game-echo`。

在仓库根目录执行 `npm ci` 后：

- 开发：`npm run dev -w @playground/game-echo`
- 测试：`npm test -w @playground/game-echo`
- 构建 ESM 库：`npm run build -w @playground/game-echo`

主入口提供 createGame；manifest、art、rules 子入口分别维护说明、插画和成绩规则。仅依赖 game-sdk，禁止引用其他游戏或游乐场。调试页复用 game-runtime，使用独立存储，不连接排行榜、统计或离线缓存。

## 递进关卡（版本 1）

人工确定的设计：每关回应一段固定微光序列，长度 3–12 个。共 20 关，每 5 关为入门、熟练、进阶、挑战一个阶段。

通过包的公开 `/campaign` 入口读取固定定义，向 `createGame` 传入可选 `level`；未传时继续使用原普通模式及随机序列。关卡不使用全局倒计时，完成本关目标即可通关。暂停和切到后台时停止计时。

进度按游戏保存在本机，通关解锁下一关。个人最佳优先比较用时。普通模式、每日挑战和排行榜继续沿用原规则。固定数据在 `src/campaign-data.js`，生成及真实输入验证工具位于仓库 `scripts/campaigns/`，不把求解器放入浏览器包。
