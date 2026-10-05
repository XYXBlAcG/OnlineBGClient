# 卡坦岛 AI 入口

人数、地图和规则版本沿用 [目录](../src/domain/catalogue.ts) 与 [原站规则适配器](../src/domain/catan.ts)，不替换原站多人玩法。

| 职责 | 唯一入口 |
| --- | --- |
| 合法动作、报价、响应与回合计数 | [规则](../src/domain/catan.ts)、[动作和状态](../src/domain/catan-actions.ts) |
| 初始放置、建设、资源和道路估值 | [卡坦岛策略](../src/domain/catan-strategy.ts) |
| 隐藏资源库存约束、公开报价条件与发展卡先验 | [策略抽样](../src/domain/catan-strategy.ts) |
| 难度、树搜索和模拟 | [公共经济游戏搜索](../src/domain/economic-strategy.ts) |
| 多线程、预算和取消 | [计算协调器](../src/domain/compute.ts) |
| AI 主动交易开关 | [配置契约](../src/domain/protocol.ts)、[大厅](../src/client/Lobby.tsx)、[房间配置](../src/client/RoomSetup.tsx) |
| 合法性、整局与信息隔离验证 | [经济游戏测试](../tests/economic-ai.test.ts)、[卡坦岛规则测试](../tests/catan.test.ts)、[交易测试](../tests/catan-transactions.test.ts) |
| CPU 实测 | [统一基准入口](../scripts/benchmark-ai.mjs)、[实测记录](benchmarks/economic-ai.json) |

隐藏发展卡采用公开组成与已用骑士约束下的近似先验，不声称精确推断全部历史。树搜索有候选剪枝和有限预算，局面收益不是胜率。参考方法：[信息集蒙特卡洛树搜索原始论文](https://eprints.whiterose.ac.uk/id/eprint/75048/1/CowlingPowleyWhitehouse2012.pdf)。手机联机的计算由服务电脑执行；无 GPU 后端。
