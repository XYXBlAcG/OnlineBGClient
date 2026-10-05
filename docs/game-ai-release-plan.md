# 游戏、AI 与发布入口

保留各游戏原站牌桌，统一使用房间、动作校验、联机、回放、快捷键和社交能力。其他体验提案见 [待审核功能](product-next-plan.md)，自动更新与平台扩展见 [后续规划](roadmap.md)。

| 职责 | 唯一入口 |
| --- | --- |
| 卡坦岛操作区适配、璀璨宝石原牌桌适配 | [资源构建](../scripts/build-upstream.mjs) |
| 操作区与大厅图标样式 | [样式](../src/styles.css)、[大厅](../src/client/Lobby.tsx) |
| 游戏人数、版本与能力 | [游戏目录](../src/domain/catalogue.ts) |
| 卡坦岛规则与策略 | [卡坦岛 AI 入口](catan-ai-plan.md) |
| 璀璨宝石规则与可见信息 | [规则适配器](../src/domain/splendor.ts)、[动作和状态](../src/domain/splendor-actions.ts) |
| 璀璨宝石策略及估值 | [策略](../src/domain/splendor-strategy.ts) |
| 搜索策略注册与按需实例化 | [注册器](../src/domain/strategies.ts) |
| 信息集树搜索 | [搜索](../src/domain/economic-strategy.ts) |
| 并行调度、时间预算与取消 | [协调器](../src/domain/compute.ts) |
| 实际样本审核与重现 | [决策契约](../src/domain/types.ts)、[结果合并](../src/domain/strategy.ts)、[审核重放](../src/client/audit-worker.ts) |
| 固定资源与来源 | [清单](../upstream/manifest.json)、[来源索引](../upstream/README.md) |
| 双平台构建、检查与发布条件 | [工作流](../.github/workflows/desktop.yml) |
| Release 文件、标签与校验 | [产物准备](../scripts/release-assets.mjs)、[发布](../scripts/publish-release.mjs) |
| 应用版本 | [package.json](../package.json)，Tauri 与关于页引用同一来源 |
| 测试覆盖及实测限制 | [验证](verification.md) |

璀璨宝石采用原站基础版，不接入扩展、漫威或双人对决版。原站允许少拿宝石与放弃回合；原站候选和执行规则是本客户端的唯一规则来源。出版商规则用于核对：[基础版规则](https://cdn.svc.asmodee.net/production-spacecowboys/uploads/2025/10/SCSPL01EN_SPLENDOR_RULES_LIGHT.pdf)。

Release 包含 Windows x64 安装包、macOS arm64 ZIP 和校验文件。私有仓库下载需要仓库访问权限；客户端自动更新、GPU 模型和公开分发不在当前范围。审核与作者提交入口见 [操作说明](review-and-submit.md)。
