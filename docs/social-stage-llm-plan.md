# 社交舞台、成就与 LLM 桌搭子计划

状态：第一版舞台信号与成就广播已实现；LLM 桌搭子聊天（共享内核 `companion-core`）已接入；舞台提示、主动搭话、混合决策仍待审核。现有派对、成就和 AI 计算入口分别见 [派对运行时](../src/client/party/PartyRuntime.tsx)、[成就领域](../src/domain/achievements.ts)、[计算协调器](../src/domain/compute.ts)。

## 结论

- **舞台动画**：复用现有派对事件、时间轴和 Pixi 场景，不新建第二套渲染器。新增的是“信号 → 导演 → 场景”的选择层。
- **成就社交**：把成就从本机展示扩展为房间内可分享的事件和展柜，默认由玩家主动分享。
- **LLM 桌搭子**：先做聊天和舞台提示，可行且不影响规则；策略决策采用“搜索给候选、LLM 选候选”的混合模式，默认关闭，超时回退到搜索。
- 三者共用一条社交事件流：游戏里程碑、成就、聊天、观众互动都进入同一个舞台导演，而不是各自写一套动画触发。

## 当前实现

| 职责               | 入口                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| 成就广播消息       | [房间成就写入口](../src/domain/room.ts)、[聊天消息视图](../src/client/social/ChatMessageView.tsx) |
| 成就算法到舞台信号 | [成就舞台信号](../src/client/party/achievement-stage.ts)                                          |
| 派对/舞台时间轴    | [派对运行时](../src/client/party/PartyRuntime.tsx)                                                |
| 成就专属场景       | [场景绘制](../src/client/party/cinema-art.ts)、[场景目录](../src/domain/party/stage.ts)           |
| 舞台滤镜           | [滤镜](../src/client/party/filters.ts)                                                            |
| 分享开关           | [偏好](../src/client/preferences.ts)、[设置](../src/client/Settings.tsx)                          |
| AI 聊天共享内核     | [vendor 说明](../vendor/README.md)、https://github.com/XYXBlAcG/companion-core                     |
| AI 聊天配置与上下文 | [领域](../src/domain/companion.ts)、[房间](../src/domain/room.ts)、[协议](../src/domain/protocol.ts) |
| AI 聊天服务端运行时 | [运行时](../src/server/companion.ts)、[服务入口](../src/server/main.ts)                           |
| AI 聊天设置与 AI 标记 | [设置组件](../src/client/AiSettings.tsx)、[设置入口](../src/client/Settings.tsx)、[消息组件](../src/client/social/ChatMessageView.tsx) |
| AI 身份与聊天补全 | [AI 席位身份](../src/domain/room.ts)、[@/指令补全](../src/client/social/chat-suggestions.ts)、[聊天输入](../src/client/social/ChatComposer.tsx) |
| AI 聊天验证         | [房间/协议测试](../tests/companion.test.ts)、[运行时测试](../tests/companion-runtime.test.ts)、[补全测试](../tests/chat-suggestions.test.ts)、[键盘填充](../tests/chat-composer.test.tsx)、[真实服务假模型烟测](../scripts/verify-companion.mjs) |

第一版已实现：成就系统消息升级为带稀有度、符号和标题的聊天卡片；普通和稀有只保留聊天卡片，史诗、传说、神话从最近的成就消息派生舞台事件，播放 3 套专属场景，并叠加 Bloom/Glow 滤镜。舞台事件不写入权威房间状态，不改变对局结果。开发态可用 `?dev=stage` 验收成就舞台和全部派对/游戏特效。

AI 聊天第一版只做聊天：设置分区为「接入 AI」，房主启用后默认 `mention-only`；聊天 AI 直接使用准备页面里第一个 AI 席位的名称与头像，不单独命名。服务端只读取公开房间信息，回复经 `source: "ai"` 写入现有聊天链路；不参与舞台、动作校验、回放或 AI 决策。模型在设置 → 接入 AI 中填写，支持 OpenAI 兼容、Anthropic、Gemini、Ollama 四种接口格式；`COMPANION_LLM_FAKE=1` 可用于真实服务烟测，真实模型用 `npm run verify:companion:real` 验收。

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

### 可行性结论

- **桌搭子聊天**：可行，收益高，规则风险低。LLM 只生成聊天文本和舞台提示，不参与动作校验。
- **主动搭话**：可行。由服务端在回合开始、关键操作、长时间沉默、成就解锁等事件上触发。
- **策略决策**：可以接入，但不建议让 LLM 直接生成动作。正确做法是搜索/规则先产生合法候选，LLM 只在候选里选择或解释；超时、非法输出或未启用时回退搜索。
- **本地对局**：桌面端可通过 Tauri 后端代理；浏览器本地对局没有安全保存密钥的位置，优先只支持服务端房间。

### 架构（v1 已实现）

```text
客户端设置 ── companion 命令 ──► Room.setCompanion
客户端聊天 ── chat 命令 ──► Room.chat ──► CompanionRuntime.maybeReply
                                          │
                                          ├─ Room.publicContext() + trigger
                                          │    -> buildCompanionView
                                          ├─ compilePrompt
                                          ├─ LlmProvider（OpenAI 兼容 / Anthropic / Gemini / Ollama）
                                          ├─ sanitizeReply
                                          └─ Room.addCompanionMessage -> publish
```

- 共享内核 `companion-core` 固定契约、Prompt 预算、参与策略、清洗与 Provider；游戏侧只做房间适配与服务端运行时。
- AI 配置在设置 → 接入 AI 中填写：接口格式、接口地址、模型、API Key；非密钥字段保存在房间配置，Key 保存在本机 `localStorage` 与房主服务内存。
- 保存时通过 host-only 的 `ai-config` 命令发送；Key 不进入快照、聊天、日志或房间配置。房主客户端重连时会自动重发本机配置。
- 服务端按接口格式创建 Provider：OpenAI 兼容、Anthropic Messages、Gemini generateContent、Ollama 原生 chat。
- 服务端有超时与失败静默；不重试风暴；同一房间最多一个生成请求。
- v1 输出为纯文本，经 `sanitizeReply` 去 HTML/链接/@ 并限长；没有 `stageCue`、`tone`、`targetSeat` 等结构化字段。
- 聊天消息标记 `source: "ai"`，客户端显示 AI 标记；房主可全局关闭。
- AI 消息通过 [房间聊天写入口](../src/domain/room.ts) 进入现有序号与未读链路，不绕过权威房间状态；v1 不写入回放。

### 上下文边界

v1 只读取 [Room.publicContext()](../src/domain/room.ts)：游戏名、阶段、玩家昵称、最近 20 条公开文本/系统/成就消息，以及当前触发消息。

明确禁止：隐藏手牌/身份、候选、决策、回放内部状态、房主 token、恢复凭据、私聊。`buildCompanionView` 有单元测试，验证隐藏信息不进入 prompt；AI 席位发言和混合决策的可见范围是后续阶段。

### 触发策略

- v1 只在玩家发送普通聊天后触发；默认 `mention-only`（文本包含 `@<AI名称>`），房主可切到 `chatty`。
- 聊天输入支持 `@` 玩家列表和 `/` 指令补全：上下键选择、Tab 填充、Enter 发送；指令来自现有 `bannerCommands`。
- 冷却、每分钟上限、每局上限由共享 `ParticipationPolicy` 控制；房间结束/暂停不生成。
- 主动事件（回合开始、关键出牌、成就、沉默）是后续阶段，不在 v1。
- Prompt 明确：只评论公开信息、不冒充真人、不指导作弊、不泄露隐藏信息；聊天内容视为不可信数据。

### 混合策略

```text
搜索/规则 → 合法候选 Top N + 评分/解释
                     │
                     ▼
LLM 选择候选（可选） → 服务端校验候选合法 → 执行
                     │
                     └─ 超时/非法/未启用 → 搜索最高分候选
```

- LLM 不生成原始动作，只返回候选编号。
- 只在房主显式开启时使用，且优先用于远征、领土等非实时强对抗游戏。
- 审核记录继续以搜索候选和实际动作为准；LLM 选择作为附加说明，不影响回放重现。
- 评估指标：决策耗时、非法候选率、与搜索选择的差异、玩家主观评价。

### 分阶段

| 阶段           | 状态                                      |
| -------------- | ----------------------------------------- |
| Mock 与契约    | 已完成：`companion-core` v0.1.0           |
| 聊天接入       | 已完成：房间配置、公开上下文、AI 消息、失败静默、@/指令补全 |
| 真实 Provider  | 已实现设置内多格式配置与 `verify:companion:real`；真实模型手动验收 |
| 主动搭话       | 待审核                                    |
| 舞台联动       | 待审核                                    |
| 混合决策       | 待审核                                    |
| 本地桌面代理   | 待审核                                    |

### 验收

v1 已覆盖：

- 隐藏信息测试：以三国杀验证公开上下文不包含手牌、身份或完整 state。
- 补全测试：@ 玩家列表、AI 标记、指令过滤、参数输入后关闭。
- Provider 适配器测试：四种格式的请求地址、请求头、响应解析与错误路径。
- 本机 AI 配置测试：provider 设置与 Key 的本地存取、损坏数据忽略。
- Provider 超时/取消/429/非法输出/网络错误映射。
- 房主可启用/关闭；默认关闭；`mention-only` 与 `chatty`。
- AI 消息序号、幂等、200 条上限；不改变房间状态、动作合法性或回放。
- `npm run verify:companion` 用真实房间服务 + WebSocket + fake provider 验证聊天链路；`npm run verify:companion:local` 用本机假 OpenAI 服务验证设置内 `ai-config` 与真实 OpenAI Provider 适配；`npm run verify:companion:real` 用真实模型验证同一链路。

M2 已提供设置内多格式 Provider 与 `verify:companion:real`；真实模型语气、频率和延迟由用户填写配置后手动验收。

界面由用户手动验收：`COMPANION_LLM_FAKE=1 npm run server` 后打开房间服务页面，在设置 → 接入 AI 启用并选择搭话模式，发送聊天；确认 AI 标记、回复内容、@ 与 / 补全、停用后不再回复。自动化烟测只覆盖服务端链路与补全逻辑。

真实模型验收（需要 key，不写入仓库；脚本通过 `ai-config` 命令把环境变量发送给房主服务）：

```bash
npm run server:build
npm run verify:companion:local
COMPANION_LLM_BASE_URL=... COMPANION_LLM_API_KEY=... COMPANION_LLM_MODEL=... npm run verify:companion:real
```

## 推荐顺序

1. **舞台信号与导演层** + **成就房间广播**：已完成。
2. **LLM 聊天**：已完成 v1（公开信息 + 房主配置 + 失败回退）。
3. **LLM 主动搭话与舞台提示**：复用舞台导演，待审核。
4. **LLM 混合策略**：单游戏试点，搜索始终兜底，待审核。
5. 观众互动、合作成就、成就展柜逐步扩展。

## 待确认

- Provider 默认模型：v1 支持 OpenAI 兼容、Anthropic、Gemini、Ollama；具体模型由房主在设置中填写。
- AI 聊天默认关闭，房主在「接入 AI」中启用（已实现）。
- 成就广播默认关闭还是按玩家偏好开启（未变）。
- 舞台场景的付费边界：只复用现有派对物品，还是新增免费社交场景（未变）。
- 是否允许观众触发舞台和 LLM 互动（未变）。
- 跨对局/跨产品记忆：未实现，需要身份与隐私设计。

成就舞台由本机偏好 `achievementStage` 独立控制，默认关闭；不影响成就解锁、聊天成就卡片和其他派对特效。入口见 [偏好](../src/client/preferences.ts)、[设置](../src/client/Settings.tsx)、[舞台运行时](../src/client/party/PartyRuntime.tsx)。
