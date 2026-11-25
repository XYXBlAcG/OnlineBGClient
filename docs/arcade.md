# 多游戏远征

桌面大厅选择「多游戏远征」。真人通过原来的邀请链接加入，单人可用 AI 补位。该卡片和其他游戏共享搜索、分类与收藏。

| 职责                           | 实现入口                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| 路线、团队生命、遗物和关卡结算 | [远征规则](../src/domain/arcade/campaign.ts)                                             |
| 短局创建、目标判定、回放预设   | [短局预设](../src/domain/arcade/scenario.ts)、[回放](../src/domain/replay.ts)            |
| 房间换场、席位与恢复           | [房间](../src/domain/room.ts)、[远征计时与投影](../src/domain/arcade/session.ts)         |
| 选路、结算、战报               | [远征牌桌](../src/client/arcade/ArcadeTable.tsx)                                         |
| 定向回归                       | [房间和回放](../tests/arcade-room.test.ts)、[远征规则](../tests/arcade-campaign.test.ts)、[合作分队与观战奖励](../tests/arcade-cooperation.test.ts) |

手动验收时，两人进同一房间并分别投票。确认切换矿洞、UNO、飞行棋、斗地主、三国杀和毒药时使用同一个房间、聊天栏和邀请链接。一人断开再重连，检查队友看到暂停、重连后继续。完成两场后，从战报打开指定回放并切换到本章下一场。浏览器可通过新版房间链接加入，原生 iOS 大厅入口由其独立项目管理。

关卡数、生命、目标、时限与护符显示入口见 [共享 HUD](../src/client/ui/RoguelikeHud.tsx)。2 席进入斗地主时临时补一名守关 AI，四席路线不发斗地主。三国杀会按需要临时补一名守关 AI，结算后恢复报名席位。

创建房间时可分别设定倒计时、行动上限和优先游戏，入口为 [大厅玩法选项](../src/client/Lobby.tsx)。验收时关闭两项限制，检查选路、领奖和台球出杆可以等玩家决定。矿洞达到目标或矿物耗尽时结算。再打开限制测试同一关卡，检查 HUD 与结算使用同一个行动预算。

扩展牌桌和目标见 [路线目录](../src/domain/arcade/campaign.ts)、[目标判定](../src/domain/arcade/scenario.ts) 与 [牌桌预设](../src/domain/engine.ts)。秘塔远征保有独立的多层流程。矿钩的画面插值与输入取样见 [矿钩呈现](../src/client/miner/rig-motion.ts)、[矿洞组件](../src/client/miner/MinerLive.tsx)。

机制参考 [Hades 的挑战条件与关间补给](https://www.supergiantgames.com/blog/hades-welcome-to-hell-update-patch-notes/)、[Mario Party Superstars 的自由游玩和收集奖励](https://www.nintendo.com/my/switch/az82/mountain/index.html) 以及 [Slay the Spire 2 的合作路线与遗物讨论](https://www.megacrit.com/news/2026-10-29-neowsletter-issue-27/)。

迷你高尔夫的独立模式与远征关卡验收见[你画我猜与迷你高尔夫](party-games.md)。
