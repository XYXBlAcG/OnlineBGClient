# 社交舞台、成就与 LLM 桌搭子计划

状态：第一版舞台信号与成就广播已实现；LLM 桌搭子聊天（共享内核 `companion-core`）已接入；舞台提示、主动搭话、混合决策仍待审核。现有派对、成就和 AI 计算入口分别见 [派对运行时](../src/client/party/PartyRuntime.tsx)、[成就领域](../src/domain/achievements.ts)、[计算协调器](../src/domain/compute.ts)。

## 结论

- **舞台动画**：复用现有派对事件、时间轴和 Pixi 场景，不新建第二套渲染器。新增的是“信号 → 导演 → 场景”的选择层。
- **成就社交**：把成就从本机展示扩展为房间内可分享的事件和展柜，默认由玩家主动分享。
- **LLM 桌搭子**：先做聊天和舞台提示，可行且不影响规则；策略决策采用“搜索给候选、LLM 选候选”的混合模式，默认关闭，超时回退到搜索。
- 三者共用一条社交事件流：游戏里程碑、成就、聊天、观众互动都进入同一个舞台导演，而不是各自写一套动画触发。

## 当前实现

| 职责                  | 入口                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 成就广播消息          | [房间成就写入口](../src/domain/room.ts)、[聊天消息视图](../src/client/social/ChatMessageView.tsx)                                                                                                                                                                                                                                                                                                                                                            |
| 成就算法到舞台信号    | [成就舞台信号](../src/client/party/achievement-stage.ts)                                                                                                                                                                                                                                                                                                                                                                                                     |
| 派对/舞台时间轴       | [派对运行时](../src/client/party/PartyRuntime.tsx)                                                                                                                                                                                                                                                                                                                                                                                                           |
| 成就专属场景          | [场景绘制](../src/client/party/cinema-art.ts)、[场景目录](../src/domain/party/stage.ts)                                                                                                                                                                                                                                                                                                                                                                      |
| 舞台滤镜              | [滤镜](../src/client/party/filters.ts)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 分享开关              | [偏好](../src/client/preferences.ts)、[设置](../src/client/Settings.tsx)                                                                                                                                                                                                                                                                                                                                                                                     |
| AI 聊天共享内核       | [vendor 说明](../vendor/README.md)、https://github.com/XYXBlAcG/companion-core                                                                                                                                                                                                                                                                                                                                                                               |
| AI 聊天配置与上下文   | [领域](../src/domain/companion.ts)、[房间](../src/domain/room.ts)、[协议](../src/domain/protocol.ts)                                                                                                                                                                                                                                                                                                                                                         |
| AI 聊天服务端运行时   | [TableMind 运行时](../src/server/table-mind/runtime.ts)、[服务入口](../src/server/main.ts)                                                                                                                                                                                                                                                                                                                                                                   |
| AI 聊天设置与 AI 标记 | [设置组件](../src/client/AiSettings.tsx)、[设置入口](../src/client/Settings.tsx)、[消息组件](../src/client/social/ChatMessageView.tsx)                                                                                                                                                                                                                                                                                                                       |
| AI 身份与聊天补全     | [AI 席位身份](../src/domain/room.ts)、[@/指令补全](../src/client/social/chat-suggestions.ts)、[聊天输入](../src/client/social/ChatComposer.tsx)                                                                                                                                                                                                                                                                                                              |
| AI 聊天验证           | [房间/协议测试](../tests/companion.test.ts)、[LLM Runner 测试](../tests/llm-runner.test.ts)、[社交反应测试](../tests/table-mind-social.test.ts)、[补全测试](../tests/chat-suggestions.test.ts)、[键盘填充](../tests/chat-composer.test.tsx)、[真实服务假模型烟测](../scripts/verify-companion.mjs)、[事件反应烟测](../scripts/verify-table-reactions.mjs)、[准备页 AI 控制测试](../tests/pregame-panel.test.tsx)、[本机配置测试](../tests/ai-config.test.ts) |
| LLM 动作决策原型      | [候选选择](../src/server/llm-seat.ts)、[运行时决策入口](../src/server/main.ts)、[AI 席位驱动](../src/client/RoomSetup.tsx)、[候选选择测试](../tests/llm-seat.test.ts)、[LLM 席位真实服务烟测](../scripts/verify-llm-seat.mjs)                                                                                                                                                                                                                                |

第一版已实现：成就系统消息升级为带稀有度、符号和标题的聊天卡片；普通和稀有只保留聊天卡片，史诗、传说、神话从最近的成就消息派生舞台事件，播放 3 套专属场景，并叠加 Bloom/Glow 滤镜。舞台事件不写入权威房间状态，不改变对局结果。开发态可用 `?dev=stage` 验收成就舞台和全部派对/游戏特效。

AI 的当前支持范围、凭据边界、配置和验收统一见 [AI 运行](ai-runtime.md)。

## 一、舞台动画

### 目标

让牌桌在关键局面和社交事件发生时“有反应”，同时不遮挡操作、不改变规则、不影响低端设备和回放。

### 现有基础

| 能力           | 入口                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------- |
| 派对事件与账本 | [派对模型](../src/domain/party/model.ts)、[派对信号](../src/domain/party/facts.ts)           |
| 客户端时间轴   | [时间轴](../src/client/party/timeline.ts)                                                    |
| Pixi 场景      | [场景运行时](../src/client/party/PartyRuntime.tsx)、[场景绘制](../src/client/party/scene.ts) |
| 游戏动效       | [游戏动效层](../src/client/GameMotionLayer.tsx)、[动效策略](../src/client/motion-policy.ts)  |
| 社交互动       | [互动组件](../src/client/Interactions.tsx)、[横幅层](../src/client/social/BannerLayer.tsx)   |

### 数据流

`游戏快照 / 成就 / 聊天 / 观众互动 → StageSignal → StageDirector → StageCue → 现有 PartyScene`

- `StageSignal` 是只读事件，不进入权威状态，不改变游戏结果。
- `StageDirector` 负责优先级、冷却、并发上限、目标席位、文本降级和 `prefers-reduced-motion`。
- `StageCue` 可以复用现有 `PartyEvent` 的时间、seed、duration 和 visual 字段，也可以映射到已有派对物品的场景模式。
- 回放只读取已记录的社交事件；没有记录时不补生成。

### 场景分组

| 分组       | 触发示例                            | 表现                                     |
| ---------- | ----------------------------------- | ---------------------------------------- |
| 对局里程碑 | 胡牌、绝杀、连跳、炸弹、稀有成就    | 聚光、粒子、短暂慢动作、座位高亮         |
| 逆转与悬念 | 大幅落后后反超、赛点、最后一回合    | 舞台灯光收束、观众席反应、比分条强调     |
| 社交互动   | 鸡蛋、鲜花、拖鞋、表情雨、观众欢呼  | 复用现有互动粒子，不新增付费语义         |
| 房间事件   | 玩家加入/离开、准备、投票、观众下注 | 轻量提示，不打断当前场景                 |
| 成就解锁   | 任何稀有度成就                      | 按稀有度升级光效和时长，神话级使用全舞台 |

### 控制规则

- 同时最多 2 个舞台场景；高优先级场景可以打断低优先级，低优先级进入队列或丢弃。
- 每个席位有触发冷却，避免连续刷屏。
- 舞台层 `pointer-events: none`，不遮挡牌桌操作。
- 设置中提供“完整 / 文本 / 关闭”三档；减少动态时只保留文字提示。
- 舞台失败时回退到文字 caption，不影响游戏。

### 验收

- 舞台事件不改变房间状态、动作校验或回放结果。
- 最大并发、冷却、文本降级和低端设备回退可测试。
- 桌面和手机由用户手动审核；不使用自动化界面操作代替。

## 二、成就社交

### 现状

成就定义、解锁、本地存储和弹窗已经存在；当前主要是个人展示和本机通知，缺少房间内的共享反馈。

### 可增加的社交层

| 功能         | 说明                                                 | 默认     |
| ------------ | ---------------------------------------------------- | -------- |
| 房间成就广播 | 玩家解锁成就时，向房间发送一条系统消息并触发舞台场景 | 主动开启 |
| 成就展柜     | 玩家选择 1–3 个成就展示在头像/席位/大厅资料中        | 主动设置 |
| 合作成就     | 整桌共同完成的条件，例如全员使用互动、无暂停完成一局 | 开启     |
| 观众见证     | 观众可以给成就点赞或投派对币，不改变对局结果         | 可选     |
| 成就回放书签 | 回放时间轴标记成就触发点                             | 开启     |

### 数据与隐私

- 复用 [成就定义与解锁结构](../src/domain/achievements.ts)，不新建第二套成就表。
- 房间广播只包含成就标题、稀有度、席位名称和可公开的 evidence 摘要；不发送本机统计、私人手牌或完整回放。
- 成就分享是玩家偏好；关闭后只保留本机弹窗。
- 防刷：同一成就同一房间只广播一次；观众点赞有冷却。

### 协议

- 在现有聊天内容中增加 `achievement` 类型，或在房间快照中增加只读 `socialEvents`。
- 推荐先走聊天消息：实现成本低，已有持久化、序号、未读和回放基础。
- 舞台导演监听同一消息，不把动画状态写入权威房间状态。

## 三、LLM 桌搭子

当前实现与使用限制见 [AI 运行](ai-runtime.md)，不在此复述配置和生命周期规则。

后续研究方向为卡坦岛报价与谈判、系列房间的明确记忆边界、固定种子模型策略评测。新增游戏的席位投影与合法候选审核通过后，才扩展模型决策范围。ChatBot 联动另见 [审查与规划](ai-review-and-integration-plan.md)，尚未实施。

## 推荐顺序

1. **舞台信号与导演层** + **成就房间广播**：已完成。
2. **LLM 聊天**：已完成 v1（公开信息 + 房主配置 + 失败回退）。
3. **LLM 主动搭话与舞台提示**：复用舞台导演，待审核。
4. **LLM 混合策略**：UNO 试点，入口与验收见 [AI 运行](ai-runtime.md)。
5. 观众互动、合作成就、成就展柜逐步扩展。

## 待确认

- Provider 默认模型：v1 支持 OpenAI 兼容、Anthropic、Gemini、OpenCode Go、Ollama；具体模型由房主在设置中填写。
- AI 聊天默认关闭，房主在「接入 AI」中启用（已实现）。
- 成就广播默认关闭还是按玩家偏好开启（未变）。
- 舞台场景的付费边界：只复用现有派对物品，还是新增免费社交场景（未变）。
- 是否允许观众触发舞台和 LLM 互动（未变）。
- 跨对局/跨产品记忆：未实现，需要身份与隐私设计。

成就舞台由本机偏好 `achievementStage` 独立控制，默认关闭；不影响成就解锁、聊天成就卡片和其他派对特效。入口见 [偏好](../src/client/preferences.ts)、[设置](../src/client/Settings.tsx)、[舞台运行时](../src/client/party/PartyRuntime.tsx)。
