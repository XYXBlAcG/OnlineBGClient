# 秘塔远征

从大厅选择「秘塔远征」。首章内容与数值以代码为准，客户端与联机服务共用同一规则；连麦配置独立于游戏，不需要 LiveKit 即可游玩。

## 实现入口

| 内容 | 单一入口 |
| --- | --- |
| 职业、卡牌与说明 | [内容](../src/domain/expedition/content.ts) |
| 遗物、药水、敌人和奇遇 | [世界内容](../src/domain/expedition/world.ts) |
| 战斗、意图和效果预览 | [战斗执行器](../src/domain/expedition/rules.ts) |
| 首章地图与难度 | [路线](../src/domain/expedition/map.ts)、[选项与动作](../src/domain/expedition/adventure-types.ts) |
| 个人奖励、商店、投票与冒险推进 | [冒险规则](../src/domain/expedition/adventure.ts) |
| AI 评分、抽样和预算 | [策略](../src/domain/expedition/ai.ts) |
| 牌桌与自适应布局 | [牌桌](../src/client/expedition/ExpeditionTable.tsx)、[样式](../src/client/expedition/table.css) |
| 可改键的牌桌命令 | [命令上下文](../src/client/use-game-commands.tsx)、[快捷动作](../src/client/game-quick-actions.ts) |
| 引导与实时局面讲解 | [引导](../src/client/expedition/guide.ts)、[局面](../src/client/guide-position.ts) |
| 继续和放弃入口 | [存档列表](../src/client/expedition/RunShelf.tsx) |
| 权威存档与恢复身份 | [房间](../src/domain/room.ts)、[网关](../src/domain/gateway.ts)、[SQLite](../src/server/storage.ts)、[本机存储](../src/client/storage.ts) |
| 按需回放与检查点 | [回放](../src/domain/replay.ts)、[后台取帧](../src/client/replay-worker.ts) |

## 保存与继续

大厅的继续入口用于恢复远征。关闭房间或切换游戏前保留已确认的冒险进度；普通回放缓存与远征存档分别管理。

联机远征的权威存档位于房主电脑。由原房主恢复后，等待室显示原角色和当前接管人；加入者确认角色并准备，房主再开始继续。角色不通过昵称认领。仍在线的同一远征保持原连接身份，离线恢复时重新确认席位。

原房间正在玩其他游戏时，先关闭该房间，再从大厅继续远征。临时公网地址变化后，应分享新的邀请链接。放弃远征需要独立确认，不影响普通回放。

## 非界面验证

- 战斗与全部卡牌：[战斗测试](../tests/expedition.test.ts)、[经济与内容执行](../tests/expedition-economy.test.ts)。
- 内容、地图与投影：[冒险测试](../tests/expedition-adventure.test.ts)。
- 并行窗口、去重、麻将回归和托管：[房间测试](../tests/expedition-room.test.ts)。
- 角色恢复、放弃与持久化：[恢复测试](../tests/expedition-save.test.ts)、[存储测试](../tests/expedition-storage.test.ts)。
- 三档策略与真实 CPU Worker：[策略](../tests/expedition-ai.test.ts)、[Worker](../tests/expedition-worker.test.ts)。
- 静态组件与动画事件：[组件](../tests/expedition-renderer.test.tsx)、[事件](../tests/game-motion-events.test.ts)。静态输出不证明界面尺寸、图层或触控正常。
- 固定种子首章基准：`npm run benchmark:expedition-chapter`；[完整报告](../artifacts/expedition-chapter/benchmark.json)保留样本、策略、人数、结果与耗时。使用普通启发式、公开投影，不含搜索；小样本不代表真人胜率或平衡已完成。
- HTTP/WebSocket：先运行 `npm run server:build`，再运行 `npm run verify:expedition-chapter`；[脚本](../scripts/smoke-expedition.mjs)使用隔离临时数据库，[结果](../artifacts/expedition-chapter/network.json)记录并发、服务重启、新设备接管及永久放弃检查。

打包、签名、资源一致性与实际包内服务的校验记录见 [审核校验](../artifacts/review/map-social-polish/verification.json)。

## 手动审核

[macOS 审核应用](../artifacts/review/map-social-polish/OnlineBGClient.app)。退出旧客户端后打开；不需要安装或填写 LiveKit。使用本地临时签名，未公证。

1. 大厅建立秘塔远征，分别选择三种职业，检查手牌、头像、卡牌详情与浅色／深色显示。
2. 战斗中选牌、选高亮目标、确认自身牌，查看敌方意图和出牌预览；用数字键、上下箭头、Enter、Esc 和 E，并在设置里改键。
3. 邀请手机加入，分别检查横竖屏、低高度窗口、聊天，以及多人同时出牌、全员结束、标记目标、暂停和托管。
4. 在路线、奇遇、营地、商店与遗物分配中确认选择；关闭房间后从大厅继续，确认接管角色及行装未重置。
5. 开关增强游戏动画，检查命中、格挡、治疗与投掷落点；关闭策略审核后检查数据面板。回放检查播放、暂停、倍速和跳转。

实际界面、截图、音效、Windows 与手机触控由用户手动验收；本轮不运行界面自动化。

专注模式、路线图与增强动效的界面验收见 [体验清单](expedition-experience.md)。
