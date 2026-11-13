# 斗地主

- 原站规则与合法动作：[规则适配](../src/domain/ddz.ts)。
- 按点数组合生成候选，再通过原规则校验：[组合](../src/domain/ddz-combinations.ts)。
- 简单、普通、困难使用公开信息启发式策略：[AI](../src/domain/ddz-strategy.ts)，统一从 [策略注册](../src/domain/strategies.ts) 调度。普通增加农民合作，困难额外保留连续牌连接；不是训练模型或胜率保证。
- [规则测试](../tests/ddz.test.ts)、[AI 完整对局与公开牌权](../tests/ddz-ai.test.ts)。

人工审核：一名真人与两名 AI 开局，检查抢地主、组合出牌、跟牌、不要、农民合作与终局；分别选择三档难度，关闭策略审核后核对不生成决策归档。
