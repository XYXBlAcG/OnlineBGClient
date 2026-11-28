# AI 运行与验收

## 使用范围

本地对局使用规则与搜索 AI。本机房主服务支持聊天模型；UNO 额外支持“搜索候选 → 模型选择 → 规则引擎提交”。其他游戏不提供模型决策选项。模型错误、超时或未配置时采用搜索结果；实际来源和原因由计算状态显示。

接口接入不代表模型已验证。连接测试检查接口响应，合成烟测检查传输和动作链路；策略质量需要固定种子对照和真实模型对局，不能从连接成功推导。

## 实现入口

| 职责                            | 唯一入口                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Provider 格式、参数、目标与验证 | [配置模型](../src/domain/ai-provider.ts)                                                                            |
| 协议与可用游戏                  | [聊天领域](../src/domain/companion.ts)、[协议](../src/domain/protocol.ts)                                           |
| 本机凭据、迁移与目标绑定        | [配置存储](../src/client/ai-config.ts)、[系统凭据](../src-tauri/src/ai_credentials.rs)                              |
| 可信房主连接与请求确认          | [客户端会话](../src/client/ai/provider-session.ts)、[原生窗口请求](../src/client/native/ai-request.ts)              |
| 服务授权与配置确认              | [AI 命令](../src/server/ai-commands.ts)                                                                             |
| 房间隔离、取消与释放            | [房间注册表](../src/server/table-mind/rooms.ts)、[TableMind](../src/server/table-mind/runtime.ts)                   |
| 请求预算、总时限与重试          | [Runner](../src/server/llm-runner.ts)、[接口适配](../src/server/ai-providers.ts)                                    |
| 私有信息边界                    | [公开事件](../src/domain/table-mind/public-action.ts)、[UNO 席位投影](../src/domain/table-mind/perspectives/uno.ts) |
| 权威牌面解释                    | [UNO 编码](../src/domain/uno-cards.ts)                                                                              |
| 候选与审核开关                  | [搜索](../src/domain/strategy.ts)、[房间提交](../src/domain/room.ts)                                                |
| 设置与实际状态                  | [AI 设置](../src/client/AiSettings.tsx)、[计算状态](../src/client/ComputeStatus.tsx)                                |
| 对局行动间隔与稳定状态栏        | [行动节奏](../src/domain/ai-tempo.ts)、[共享状态行](../src/client/TableChrome.tsx)、[节奏回归](../tests/ai-tempo.test.ts) |

## 凭据与连接

密钥存入系统凭据库，按接口格式与目标 origin 绑定；浏览器会话仅保存在内存。修改目标后不自动复用其他目标的密钥。旧记录写入并验证成功后才删除，失败保留来源以供重试。密钥明文不进入房间快照、存档和回放。房间 SQLite 仍为普通数据库，存档中的恢复身份不是加密字段；Unix 下服务数据目录与数据库文件限制为当前用户访问，Windows 依赖用户数据目录的系统 ACL。

自动同步只面向本机启动的房主服务；开发模式允许本机回环服务。远端房间宣称具有房主权限，不会取得本机密钥。各房间持有独立模型会话；房主权限失效、房间释放和清除配置会撤销相应会话。存档保留非秘密参数，重启后重新建立本机会话。

“推理模型”选项仅调整 OpenAI 兼容 Chat Completions 的参数格式，不等于支持 Responses API。参数定义以配置模型为准；不同接口、模型和代理应分别执行连接测试。Ollama 需要用户已运行本机服务，不会自动安装模型或提供游戏 GPU 策略内核。

## 定向验证入口

| 检查                                                | 入口                                                                                                       |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 108 张 UNO 编码、精简候选、私有动作、执行与回放一致 | [正确性测试](../tests/ai-correctness.test.ts)                                                              |
| 凭据迁移失败与目标隔离                              | [凭据测试](../tests/ai-credentials-safety.test.ts)                                                         |
| 非可信服务、连接切换、确认与断线                    | [客户端会话测试](../tests/ai-provider-session.test.ts)、[原生请求测试](../tests/native-ai-request.test.ts) |
| 房间授权、密钥隔离与清除                            | [命令测试](../tests/ai-commands.test.ts)、[运行时隔离测试](../tests/table-mind-isolation.test.ts)          |
| 参数、重试总时限、取消与清除                        | [Runner 测试](../tests/llm-runner.test.ts)、[适配器测试](../tests/ai-providers.test.ts)                    |
| 合成 HTTP 与 WebSocket                              | `npm run server:build` 后运行 `npm run verify:companion:local`                                             |
| 合成模型动作采纳                                    | `npm run server:build` 后运行 `npm run verify:llm-seat`                                                    |

## 人工验收

1. 在客户端保存接口配置，重开设置与应用；密钥状态正确，界面不回显密钥。
2. 创建本机联机房间并测试连接；成功与失败均等待服务端结果。切换接口地址后重新填写对应密钥。
3. UNO 选择模型驱动并关闭策略审核；正常操作，计算状态显示实际来源，不保存完整审核记录。
4. 请求期间暂停、换局、退出或清除配置；旧回复不进入新局，失败时状态有明确说明。
5. 加入远端房间；本机密钥不自动托管，其他游戏和本地对局继续使用搜索 AI。
6. 旧配置迁移后检查存档、设置与连麦配置；这些数据不参与 AI 凭据清理。
7. 用「最快」节奏连续观察几个 AI 回合。确认思考提示、完成提示和出牌之间牌桌位置稳定；在高尔夫检查同一个 AI 等球路播放并留出观察时间，在黄金矿脉检查按角度下钩仍正常。

跨产品身份、长期记忆和 ChatBot 联动尚未接入；历史审查与后续方向见 [审查快照](ai-review-and-integration-plan.md)。
