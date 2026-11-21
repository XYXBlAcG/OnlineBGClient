# 黄金矿脉

2–4 人共享矿图的**实时黄金矿工**。每名玩家有独立摆动的钩子，随时可以下钩；钩子沿路径抓到金块、石头、钻石、袋子、骷髅或 TNT，按重量回收。路线图直接复用秘塔远征的地图拓扑、路线布局和地图视口。

## 当前实现

- 游戏 kind：`miner`
- 人数：2–4 人，支持真人、AI 补位和单人 + AI
- 路线：直接使用秘塔远征 `generateMap` 的地图拓扑（12 层、分叉、捷径、回溯）
- 矿点：每名玩家独立钩子，钩子自动左右摆动，随时可下钩
- 限时：普通矿洞 60 秒，精英/首领 50 秒
- 目标：团队累计金额达到团队目标；个人金额独立排名
- 移动端：`mobile: true`，牌桌为同一套实时规则

## 路线地图

- 领域生成：[map.ts](../src/domain/miner/map.ts) → [generateMap](../src/domain/expedition/map.ts)
- 路线布局：[map-layout.ts](../src/client/expedition/map-layout.ts)
- 地图视口：[MapViewport.tsx](../src/client/MapViewport.tsx)
- 节点图标：[NodeSymbol.tsx](../src/client/expedition/NodeSymbol.tsx)

矿工不另画一套路线图；地图节点按秘塔远征的 `NodeKind` 映射为矿洞、商店、营地、事件和首领矿洞。

## 钩子

- 每名玩家一条独立钩子
- 钩子以头顶枢轴左右摆动
- 下钩时按当前角度直线伸出
- 路径上第一个可抓取物体被抓住
- 钩子拖着物体回收；物体越重回收越慢
- 收回到顶后计入个人金额/金币
- 多人可同时下钩，先抓住物体的人获得
- TNT 会炸掉周围物体
- 石头可通过「岩石收藏书」翻倍价值

核心规则：[rules.ts](../src/domain/miner/rules.ts)

## 物体

9 种：[content.ts](../src/domain/miner/content.ts)

小金块、金块、大金块、小石头、大石头、钻石、神秘袋、骷髅、TNT。

## 商店与道具

6 种道具：

- 炸药：炸掉当前钩住的物体并快速收钩
- 力量药水：20 秒内回收速度提升
- 幸运草：下一次抓取价值 ×1.5
- 岩石收藏书：本局石头价值 ×2
- 时间沙漏：当前矿洞 +10 秒
- 加固绳索：下一次回收不受重量减速

商店节点用金币购买；金币来自本局抓取金额，团队目标只统计抓取金额，不因消费减少。

## AI 与实时循环

- AI 策略：[strategy.ts](../src/domain/miner/strategy.ts)
- AI 在实时矿洞中选择角度下钩、使用道具、路线投票和商店购买
- 服务端权威 tick：`MinerRules.needsResolution` 在实时矿洞持续为真，`resolve` 每 120ms 推进钩子、物体和倒计时
- 人类随时下钩；房间通过行动窗口接受实时输入
- 动作类型：[miner/types.ts](../src/domain/miner/types.ts)

## 验证

- [规则测试](../tests/miner.test.ts)：复用路线拓扑、实时下钩/抓取/计分、房间 tick、AI
- [UI 测试](../tests/miner-ui.test.tsx)：共享路线图、HUD
- [双人烟测](../scripts/verify-miner.mjs)：两台 WebSocket 客户端进入实时矿洞并下钩得分
- [AI 烟测](../scripts/verify-miner.mjs)：`MINER_AI=1 npm run verify:miner`，真人 + AI 完成实时下钩
- 两个烟测都需先 `npm run server:build`
