# 领土 · Dominion

## 实现入口

- [第二版官方规则](https://www.riograndegames.com/wp-content/uploads/2016/09/Dominion2E.pdf)
- [游戏注册与人数](../src/domain/catalogue.ts)、[配置和动作类型](../src/domain/dominion/types.ts)
- [基础卡池与中文效果](../src/domain/dominion/cards.ts)、[权威规则与私牌投影](../src/domain/dominion/rules.ts)
- [三档 AI、抽样预算与审核依据](../src/domain/dominion/strategy.ts)
- [王国配置](../src/client/dominion/DominionOptionsControl.tsx)、[牌桌](../src/client/dominion/DominionTable.tsx)、[卡牌详情](../src/client/dominion/DominionCard.tsx)、[牌库与记录](../src/client/dominion/DominionLedger.tsx)
- [新手引导](../src/client/dominion/guide.ts)、[共享快捷键](../src/client/game-quick-actions.ts)、[牌桌样式](../src/client/dominion/dominion.css)

AI 使用本人可见牌组成与公共信息。普通、困难对部分构筑选择进行抽样，估计五张手牌的购买力；这不是完整对局搜索，也不是胜率预测。解释输出受现有策略审核开关控制。

## 非界面验证

- [规则、基础行动卡、攻击响应、嵌套王座厅与牌张守恒](../tests/dominion.test.ts)
- [三档完整自对局、随机王国、真实 CPU Worker 与一致性](../tests/dominion-ai.test.ts)
- [房间配置、存档恢复与回放](../tests/dominion-room.test.ts)
- [静态组件、卡牌交互范围与回放只读](../tests/dominion-renderer.test.tsx)
- [语义快捷键](../tests/game-quick-actions.test.ts)
- [HTTP/WebSocket 检查](../scripts/smoke-network.mjs)：`TEST_GAME=dominion`，配合已启动服务的 `TEST_SERVICE`。

界面截图入口：[隔离浏览器检查](../scripts/verify-dominion-ui.mjs)。先执行 `npm run server:build` 和 `npm run build`，再执行 `node scripts/verify-dominion-ui.mjs`；可用 `CHROME_PATH` 指定独立浏览器程序，`SCREENSHOT_DIR` 指定输出目录。该检查使用临时数据与无头浏览器，覆盖桌面、低高度、聊天并排、深浅主题、手机横竖屏、卡牌说明与头像菜单，同时补查 Graphwar、四川麻将的共享控件。

仅在获得界面自动化授权后运行截图入口。macOS 原生 WebView、Windows 和真实手机的显示仍由用户审核。

## 手动审核

1. 大厅选择「领土 · Dominion」，一名真人加 AI，分别试用简单、普通、困难。选择首局推荐、随机、自选十种卡，确认开局后的供应与配置相符。
2. 开启引导，依次定位手牌、阶段信息和供应。悬停或点卡牌信息按钮，查看完整作用；手牌与供应的选择应各自对应当前效果。
3. 行动后打出财宝，切换「财宝与胜利卡」并购买；键盘 T、B、E 分别打出财宝、进入购买、结束回合。输入聊天时这些快捷键不应触发。
4. 自选带民兵、护城河、王座厅、哨兵的王国，检查被攻击时的选择、可选反应、连续结算与牌序操作。
5. 手机横竖屏均可切换供应分类、操作手牌、打开「牌库与记录」、点击头像互动；深浅模式下文字和牌面均应清楚。游戏动画开关影响牌张动效。
6. 多人链接加入后正常对局、断线重连；回放可播放、暂停与变速，卡牌详情可查看，不能操作牌局。最后一堆行省或第三堆供应耗尽后，在本回合结束结算分数。

审核应用：[OnlineBGClient.app](../artifacts/review/dominion-ui/OnlineBGClient.app)。
