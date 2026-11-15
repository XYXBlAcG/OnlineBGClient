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
| AI 聊天服务端运行时 | [TableMind 运行时](../src/server/table-mind/runtime.ts)、[服务入口](../src/server/main.ts)                           |
| AI 聊天设置与 AI 标记 | [设置组件](../src/client/AiSettings.tsx)、[设置入口](../src/client/Settings.tsx)、[消息组件](../src/client/social/ChatMessageView.tsx) |
| AI 身份与聊天补全 | [AI 席位身份](../src/domain/room.ts)、[@/指令补全](../src/client/social/chat-suggestions.ts)、[聊天输入](../src/client/social/ChatComposer.tsx) |
| AI 聊天验证         | [房间/协议测试](../tests/companion.test.ts)、[LLM Runner 测试](../tests/llm-runner.test.ts)、[社交反应测试](../tests/table-mind-social.test.ts)、[补全测试](../tests/chat-suggestions.test.ts)、[键盘填充](../tests/chat-composer.test.tsx)、[真实服务假模型烟测](../scripts/verify-companion.mjs)、[事件反应烟测](../scripts/verify-table-reactions.mjs)、[准备页 AI 控制测试](../tests/pregame-panel.test.tsx)、[本机配置测试](../tests/ai-config.test.ts) |
| LLM 动作决策原型     | [候选选择](../src/server/llm-seat.ts)、[运行时决策入口](../src/server/main.ts)、[AI 席位驱动](../src/client/RoomSetup.tsx)、[候选选择测试](../tests/llm-seat.test.ts)、[LLM 席位真实服务烟测](../scripts/verify-llm-seat.mjs) |

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
客户端聊天 ── chat 命令 ──► Room.chat ──► Room.tableEvents
房间动作/成就/结束 ───────────────────────┤
                                          ▼
                                    TableMind.tick
                                          ├─ TableDirector（@ / chatty / 冷却 / 上限）
                                          ├─ Room.publicContext() + buildCompanionView + TableMind 时间线/记忆
                                          ├─ buildSocialPrompt + compilePrompt
                                          ├─ LlmRunner（OpenAI 兼容 / Anthropic / Gemini / Ollama）
                                          ├─ sanitizeReply
                                          └─ Room.addCompanionMessage -> publish
```

- 共享内核 `companion-core` 固定契约、Prompt 预算、参与策略、清洗与 Provider；游戏侧只做房间适配与服务端运行时。
- AI 配置在设置 → 接入 AI 中填写：接口格式、接口地址、模型、API Key；支持输入框加宽与「测试连接」。
- 非密钥字段保存在本机设置；API Key 不再写 `localStorage`：桌面端保存到系统凭据存储（keyring），浏览器/iOS 仅保存在当前会话内存；旧版明文配置会在启动时迁移并删除。
- 保存时通过 host-only 的 `ai-config` 命令发送；测试连接通过 host-only 的 `ai-test` 命令做一次最小生成，不修改房间配置、不持久化 Key。Key 不进入快照、聊天、日志或房间配置；输入框不回显已保存 Key。
- 房主客户端重连时会自动重发本机 Provider 与安全存储中的 Key。准备页面可直接调整聊天 AI、每个 AI 席位的搜索/LLM 驱动、启用 AI 聊天，并打开「接入 / 测试 AI」。
- 服务端按接口格式创建 Provider：OpenAI 兼容、Anthropic Messages、Gemini generateContent、Ollama 原生 chat。
- 服务端有超时与失败静默；不重试风暴；同一房间同一时间最多一个社交生成请求。
- v1 输出为纯文本，经 `sanitizeReply` 去 HTML/链接/@ 并限长；没有 `stageCue`、`tone`、`targetSeat` 等结构化字段。
- 聊天消息标记 `source: "ai"`，客户端显示 AI 标记；房主可全局关闭。
- AI 消息通过 [房间聊天写入口](../src/domain/room.ts) 进入现有序号与未读链路，不绕过权威房间状态；v1 不写入回放。

### 上下文边界

读取 [Room.publicContext()](../src/domain/room.ts)：游戏名、阶段、玩家昵称、最近 20 条公开文本/系统/成就消息；再加 TableMind 的公开事件时间线和房间/系列记忆。不会读取 AI 席位的私有手牌或身份。

明确禁止：隐藏手牌/身份、候选、决策、回放内部状态、房主 token、恢复凭据、私聊。`buildCompanionView` 有单元测试；桌面聊天只使用公开上下文，AI 席位行动决策使用各自 `engine.project` 视图。

### 触发策略

- 玩家聊天、关键动作、成就、开局/结束都进入 TableMind 事件队列；默认 `mention-only`（文本包含 `@<AI名称>`），房主可切到 `chatty`。
- `chatty` 下可对动作/成就/开局/结束做低频反应；同一事件最多一个回应，按 @ > 普通聊天 > 动作 > 成就 > 开局/结束排序。
- 聊天输入支持 `@` 玩家列表和 `/` 指令补全：上下键选择、Tab 填充、Enter 发送；指令来自现有 `bannerCommands`。
- 冷却、每分钟上限、每局上限由共享 `ParticipationPolicy` 控制；房间结束/暂停不生成。
- Prompt 明确：只评论公开信息、不冒充真人、不指导作弊、不泄露隐藏信息；聊天内容视为不可信数据。

### 混合策略

```text
搜索/规则 → 合法候选 Top N + 评分/解释
                     │
                     ▼
TableMind 为 UNO 席位构建 Situation → LLM 选择候选 → 服务端校验合法 → 执行
                     │
                     └─ 超时/非法/未启用 → 搜索最高分候选
```

- LLM 不生成原始动作，只返回候选编号。
- 只在房主显式开启 LLM 驱动时使用；目前 UNO 有完整局面投影，其他游戏用通用候选选择。
- 审核记录继续以搜索候选和实际动作为准；LLM 选择作为附加说明，不影响回放重现。
- 评估指标：决策耗时、非法候选率、与搜索选择的差异、玩家主观评价。

### 分阶段

| 阶段           | 状态                                      |
| -------------- | ----------------------------------------- |
| Mock 与契约    | 已完成：`companion-core` v0.1.0           |
| 聊天接入       | 已完成：房间配置、公开上下文、AI 消息、失败静默、@/指令补全 |
| 真实 Provider  | 已实现设置内多格式配置与 `verify:companion:real`；真实模型手动验收 |
| LLM 动作决策   | 已实现搜索候选 + LLM 选择 + 搜索回退的原型；按游戏优化待后续 |
| 主动搭话       | 待审核                                    |
| 舞台联动       | 待审核                                    |
| 混合决策       | 待审核                                    |
| 本地桌面代理   | 待审核                                    |

### 验收

v1 已覆盖：

- 隐藏信息测试：以三国杀验证公开上下文不包含手牌、身份或完整 state。
- 补全测试：@ 玩家列表、AI 标记、指令过滤、参数输入后关闭。
- Provider 适配器测试：四种格式的请求地址、请求头、响应解析与错误路径。
- LLM 席位：驱动透传、候选审计、候选编号解析、非法/失败回退。
- 本机 AI 配置测试：provider 设置与 Key 的本地存取、损坏数据忽略。
- Provider 超时/取消/429/非法输出/网络错误映射。
- 房主可启用/关闭；默认关闭；`mention-only` 与 `chatty`。
- AI 消息序号、幂等、200 条上限；不改变房间状态、动作合法性或回放。
- `npm run verify:companion` 用真实房间服务 + WebSocket + fake provider 验证聊天链路；`npm run verify:table-reactions` 用真实房间服务验证动作事件触发桌搭子反应；`npm run verify:llm-seat` 用真实房间服务与 fake provider 验证 LLM 席位从搜索候选选择并推进对局；`npm run verify:companion:local` 用本机假 OpenAI 服务验证设置内 `ai-config`、`ai-test` 连接测试与真实 OpenAI Provider 适配；`npm run verify:companion:real` 用真实模型验证同一链路。

M2 已提供设置内多格式 Provider 与 `verify:companion:real`；真实模型语气、频率和延迟由用户填写配置后手动验收。

界面由用户手动验收：`COMPANION_LLM_FAKE=1 npm run server` 后打开房间服务页面，在设置 → 接入 AI 启用并选择搭话模式，发送聊天；确认 AI 标记、回复内容、@ 与 / 补全、停用后不再回复。自动化烟测只覆盖服务端链路与补全逻辑。

真实模型验收（需要 key，不写入仓库；脚本通过 `ai-config` 命令把环境变量发送给房主服务）：

```bash
npm run server:build
npm run verify:companion:local
COMPANION_LLM_BASE_URL=... COMPANION_LLM_API_KEY=... COMPANION_LLM_MODEL=... npm run verify:companion:real
```

## 四、LLM 参与游戏（原型）

### 结论

第一版不让 LLM 直接生成动作。先由现有搜索 AI 生成合法候选、评分和审核数据，LLM 只从候选中选择编号；超时、非法输出、未配置或 Provider 失败时回退搜索最高分。这样不改变规则权威，也不需要为每个游戏手写完整状态序列化。

### 已实现

- P0 牌桌编排层 `TableMind`：聊天和 LLM 席位都由每桌一个运行时统一调用；房间追加动作/聊天/成就事件供后续感知和导演层使用。
- P1 UNO 局面感知：LLM 席位现在会拿到当前颜色/牌面、自己的手牌、公开手牌数、最近动作、候选参数与评分、房间/系列记忆；不再是只有候选标签。
- P1 记忆：TableMind 按房间汇总动作/聊天/成就，作为后续局面和关系的输入；目前只含公开事实，私有记忆留给后续。
- P2 导演/反应：TableDirector 按 @、chatty、冷却、每分钟/每局上限从事件队列选择回应；桌搭子改由 TableMind.tick 处理，不再有单独的 CompanionRuntime 聊天路径。
- AI 席位新增驱动：`搜索策略` / `LLM 决策`，在准备页面每个 AI 席位旁选择。
- LLM 席位的决策请求强制携带搜索候选；服务端把候选标签和评分（Top 8）交给 LLM，只解析编号。
- 选择后复用原 `Room.acceptDecision`，动作仍由规则引擎校验；审核开启时记录“LLM 从搜索候选中选择 #N”。
- LLM 不可用/失败时静默回退搜索，不阻塞牌桌。
- 聊天 AI 与 LLM 行动席位可以选同一个 AI 席位；聊天仍只读公开信息，行动使用该席位的搜索候选。

### 边界

- 候选标签和评分来自该席位可见的搜索决策；不把其他玩家的隐藏手牌、身份或恢复凭据放进 prompt。
- LLM 不生成工具调用、不直接改房间状态、不介入回放和成就判定。
- 当前只对 UNO 做完整局面投影；其他游戏仍走通用候选选择。谈判、发言、私有记忆和长期策略留给后续。
- 延迟增加一次 LLM 调用；默认只在房主显式选择 LLM 驱动时启用，失败回退。

### 与 ChatBot 的协同

ChatBot 已完成 M0+M1：登录、流式聊天/重生成/分支、Prompt 快照、属性工坊、角色卡/世界书、Web 端加密模型凭据；记忆、Telegram、群聊舞台和 Agent 尚未开始。可借用的主要是 `SecretCipher` + `LlmSettingsService`（服务端加密凭据、`hasApiKey`/hint/测试连接）、`ChatStreamEvent` + SSE parser，以及 `ChatPromptComposer` 的 section 编译思路。游戏侧当前仍使用 vendored `companion-core@0.1.0`；升级到 0.2.0、引入流式与加密凭据属于独立的平台改动，不在本轮混入。

### 外部参考

- Cicero 用规划/RL 产出可执行行动、语言负责谈判，行动受规则引擎约束：[Science 2023](https://doi.org/10.1126/science.ade9097)
- 让 LLM 只对合法动作枚举选编号，比自由生成动作稳定得多：[arXiv:2510.04542](https://arxiv.org/abs/2510.04542)
- 社交推理中把信念推断外置给结构化模型，LLM 只负责语言：[arXiv:2506.17788](https://arxiv.org/abs/2506.17788)
- 逐回合把完整状态塞进 prompt 会拖垮一致性与上下文；可离线演化策略、线上只做选择/谈判：[arXiv:2506.04651](https://arxiv.org/abs/2506.04651)
- 多角色等待与发言顺序可用竞价/异步/限时窗口，避免一个人拖慢整桌：[arXiv:2407.13943](https://arxiv.org/abs/2407.13943)
- 约束解码（JSON Schema/CFG）可作为后续结构化输出的低开销方案：[arXiv:2411.15100](https://arxiv.org/abs/2411.15100)

### 下一步

- 本轮 v0 是通用“搜索候选 → LLM 选编号 → 失败回退搜索”，先证明链路和权限边界。
- 调研结论更看好**卡坦岛交易/谈判**作为下一阶段：交易是纯语言协商，现有 ISMCTS 交易候选、审计和回放可直接复用；LLM 只负责报价/回应文本，参数由模板给全，服务端校验。
- 社交推理（SGS/狼人杀类）端到端目前仍弱于规则 bot，放到 v2；先复用现有聊天桌搭子做语言层。

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
