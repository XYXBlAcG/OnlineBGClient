# 黄金矿脉

2–6 人共享矿图的**实时黄金矿工**。每名玩家有独立摆动的钩子，随时可以下钩；钩子沿路径抓到金块、石头、钻石、袋子、骷髅或 TNT，按重量回收。路线图直接复用秘塔远征的地图拓扑、路线布局和地图视口。

玩法参照公开的《Gold Miner: Party Rush》与经典 Gold Miner 资料细化：四角色 Special、金块充能、重物节拍环、关卡机制、商店老虎机和 Team Gamble。支持 2–6 人；六关 Quick Match 结束后按团队目标和个人金额结算。

## 当前实现

- 游戏 kind：`miner`
- 人数：2–6 人，支持真人、AI 补位和单人 + AI
- 路线：直接使用秘塔远征 `generateMap` 的地图拓扑（12 层、分叉、捷径、回溯）
- 矿点：每名玩家独立钩子，钩子自动左右摆动，随时可下钩
- 限时：普通矿洞 60 秒，精英/首领 50 秒
- 目标：团队累计金额达到团队目标；个人金额独立排名
- 移动端：`mobile: true`，牌桌为同一套实时规则

## 模式

| 模式 | 规则 |
| --- | --- |
| 好友局 | 六关，团队目标 + 个人排名，熟人房直接开局 |
| 无尽模式 | 团队三条命，关卡目标递增，地图耗尽后进入更深矿层 |
| 混乱派对 | 六关，每个矿洞额外机制，节奏更快 |
| 每日挑战 | 固定日期种子的一局挑战 |
| Boss Rush | 六关全首领矿洞，钻石与 TNT 更多 |
| 极速模式 | 三关，每关 25 秒 |

组队模式支持 4 人 2v2 / 6 人 3v3；队伍交替分配，结算按队伍总分。

## 美术素材

矿洞物体与角色使用 CC0 免费素材，来源、授权和文件索引见 [`src/assets/miner/LICENSE.md`](../src/assets/miner/LICENSE.md)。不再使用程序绘制的矿石矢量图。

## 角色与 Special

| 角色 | Special | 充能 | 效果 |
| --- | --- | --- | --- |
| 矿工 | 疾速下钩 | 6 块金 | 8 秒内摆钩/回收加速 |
| 商人 | 即时到账 | 4 块金 | 立即收回钩上的物体 |
| 大力士 | 力拔千斤 | 4 块金 | 10 秒内重物不减速 |
| 驯兽师 | 口哨 | 6 块金 | 矿洞动物停止 6 秒 |

开局先选角色；抓取金块为 Special 充能；按 Special 按钮释放。

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

## 物体与关卡机制

10 种物体：[content.ts](../src/domain/miner/content.ts)

小金块、金块、大金块、小石头、大石头、钻石、神秘袋、骷髅、TNT、矿洞动物。

20 种关卡机制：

- 视野：黑屏、迷雾、声呐、迷雾涌入、升雾、中央矿柱
- 水位：洪水、潮汐
- 移动：传送带、矿车、零重力、磁场、间歇泉、落石
- 物体：冰冻解冻、幻影、热点、黄金热
- 生物：矿洞动物、蝙蝠群

每个矿洞随机 1–2 个机制。

## 重物节拍

重量 ≥ 4 的重物（大金块、大石头）被钩住后出现节拍环：

- 在节拍窗口按下「节拍拉钩」会额外加速回收
- 踩空只算失误，不会丢失物体
- AI 也会在节拍窗口尝试拉钩

## 档案与称号

本地档案保存在 `onlinebg.miner-profile-v2`：

- 总局数/胜场
- 无尽最高深度与最高分
- 解锁称号，可在「档案」面板装备
- 档案面板从牌桌右上角 🏅 按钮打开
- 只保留熟人房，不做排位/快速匹配/服务器排行榜

## 商店与道具

7 种道具：

- 炸药：炸掉当前钩住的物体并快速收钩
- 力量药水：20 秒内回收速度提升
- 幸运草：下一次抓取价值 ×1.5
- 岩石收藏书：本局石头价值 ×2
- 时间沙漏：当前矿洞 +10 秒
- 加固绳索：下一次回收不受重量减速
- 冰冻箱：6 秒内冻结所有移动物体和动物

商店节点用金币购买；金币来自本局抓取金额，团队目标只统计抓取金额，不因消费减少。

商店内还有：

- 关间天赋：每店随机 3 张，团队可购买 1 张
- 老虎机：每人一次，50 金币，随机返还金币或道具
- Team Gamble：每店一次，用团队分数的 15% 赌 50/50 翻倍或扣除

天赋共 10 张：疾速钩、强韧绳索、点金手、深口袋、时间沙漏、爆破开局、开局好运、岩石之歌、专精、粗绳。天赋全局生效，可叠加。

## AI 与实时循环

- AI 策略：[strategy.ts](../src/domain/miner/strategy.ts)
- AI 在实时矿洞中选择角度下钩、使用道具、路线投票和商店购买
- 服务端权威 tick：`MinerRules.needsResolution` 在实时矿洞持续为真，`resolve` 每 120ms 推进钩子、物体、机制和倒计时
- 人类随时下钩；房间通过行动窗口接受实时输入
- 动作类型：[miner/types.ts](../src/domain/miner/types.ts)

## 参考

- [Gold Miner: Party Rush Steam](https://store.steampowered.com/app/4815320/Gold_Miner_Party_Rush/)
- [Gold Miner: Party Rush 公布稿](https://www.gamespress.com/Margarite-Entertainment-Announces-Gold-Miner-Party-Rush)
- [Gold Miner: Party Rush 更新日志（Special、机制、节拍环）](https://store.steampowered.com/news/app/4815320)
- [Gold Miner: Classic Edition Steam](https://store.steampowered.com/app/3777060/Gold_MinerClassic_Edition/)

## 验证

- [规则测试](../tests/miner.test.ts)：模式/队伍/无尽、复用路线拓扑、角色选择、Special、20 机制、六关/关间商店、天赋、实时下钩/抓取/计分、房间 tick、AI
- 本地档案/称号/外观：`src/client/miner/profile.ts`、`MinerProfilePanel.tsx`
- [UI 测试](../tests/miner-ui.test.tsx)：角色选择、共享路线图、HUD
- [双人烟测](../scripts/verify-miner.mjs)：两台 WebSocket 客户端进入实时矿洞并下钩得分
- [AI 烟测](../scripts/verify-miner.mjs)：`MINER_AI=1 npm run verify:miner`，真人 + AI 完成实时下钩
- 两个烟测都需先 `npm run server:build`
