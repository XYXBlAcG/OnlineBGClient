# 验证入口

日常按改动范围选择测试；发布前执行完整验证。

| 范围 | 入口 |
| --- | --- |
| 社交模型、消息序号与资源 | [互动与消息](../tests/social.test.ts)、[阅读状态](../tests/chat-read.test.ts)、[旧存档升级](../tests/archive-upgrade.test.ts) |
| 服务身份与手机延迟链路 | [权限和投影复用](../tests/service-host.test.ts)、[增量基线](../tests/snapshot-sync.test.ts)、[真实延迟代理与手机浏览器](../scripts/verify-mobile-host.mjs) |
| 卡坦岛地图、交易、发展卡、强盗与回放 | [规则测试](../tests/catan.test.ts)、[事务与回放](../tests/catan-transactions.test.ts)、[三个真实浏览器牌桌](../scripts/verify-catan.mjs) |
| 常用语与扩展特效契约 | [偏好和互动目录](../tests/social-preferences.test.ts) |
| 毒药完整对局与手牌隔离 | [毒药测试](../tests/poison.test.ts) |
| 并行、取消与审核记录控制 | [真实线程测试](../tests/compute.test.ts)、[记录开关](../tests/audit-recording.test.ts)、[性能基准](../scripts/benchmark-ai.mjs) |
| 八游戏回放只读与头像契约 | [牌桌测试](../tests/game-surface.test.tsx) |
| 缓存清理与存档保护 | [真实浏览器存储](../scripts/verify-cache.mjs)、[原生缓存测试](../src-tauri/src/cache.rs) |
| 武将解释与原牌桌 | [资料覆盖](../tests/hero-guide.test.ts)、[武将渲染](../tests/sgs-renderer.test.tsx) |
| 手机与三个客户端社交流程 | [打包服务回归](../scripts/verify-social.mjs) |
| Windows 后台进程无控制台 | [进程测试](../src-tauri/src/hosting.rs)、[Windows 工作流](../.github/workflows/desktop.yml) |
| 游戏原资源与渲染 | [upstream.test.ts](../tests/upstream.test.ts)、[checkers-renderer.test.tsx](../tests/checkers-renderer.test.tsx) |
| 规则与观察隔离 | [engine.test.ts](../tests/engine.test.ts)、[ddz.test.ts](../tests/ddz.test.ts)、[checkers.test.ts](../tests/checkers.test.ts)、[expansion.test.ts](../tests/expansion.test.ts) |
| 策略、完整 AI 对局与审核 | [ai.test.ts](../tests/ai.test.ts)、[strategy-search.test.ts](../tests/strategy-search.test.ts)、[strategies.test.ts](../tests/strategies.test.ts) |
| 生命周期、游戏切换、席位、恢复和动作去重 | [room.test.ts](../tests/room.test.ts)、[room-lifecycle.test.ts](../tests/room-lifecycle.test.ts)、[游戏切换](../tests/room-game-switch.test.ts)、[connection.test.ts](../tests/connection.test.ts) |
| 真实 SQLite、确定性回放 | [storage.test.ts](../tests/storage.test.ts)、[replay.test.ts](../tests/replay.test.ts) |
| 桌面菜单与审核偏好 | [菜单测试](../tests/desktop-context-menu.test.ts)、[偏好测试](../tests/themes.test.ts)、[跳棋渲染](../tests/checkers-renderer.test.tsx) |
| 命令作用域与主题契约 | [commands.test.ts](../tests/commands.test.ts)、[themes.test.ts](../tests/themes.test.ts) |
| 服务进程重启、身份与聊天恢复 | [verify-restart.mjs](../scripts/verify-restart.mjs) |
| 隔离服务与三个真实浏览器客户端 | [verify-client.mjs](../scripts/verify-client.mjs)、[smoke-client.mjs](../scripts/smoke-client.mjs) |
| 四游戏 WebSocket 联机 | [smoke-network.mjs](../scripts/smoke-network.mjs) |
| 原生 WebView、控件和离线 Worker | [原生入口](../src-tauri/examples/smoke.rs)、[交互脚本](../scripts/native-smoke.js) |
| 原生临时公网房主与浏览器好友 | [房主入口](../src-tauri/examples/hosting_smoke.rs)、[房主脚本](../scripts/native-hosting-smoke.js)、[好友脚本](../scripts/smoke-host-guest.mjs) |
| 平台自动构建 | [工作流](../.github/workflows/desktop.yml) |

`npm run verify:client` 自动启动独立服务与存档目录。浏览器支持 CHROME_PATH，未指定时选本机 Chrome 或 Playwright Chromium。网络脚本通过 TEST_SERVICE 指定入口、TEST_GAME 指定游戏。原生脚本通过 COMPANION_SMOKE_OUTPUT 指定结果文件，运行 `cargo run --release --example smoke --features tauri/custom-protocol`。

## 当前验证

2026-10-04 至 2026-10-05：按本轮改动范围执行测试，验证入口均使用实际规则、工作线程、存储和隔离服务。

- 规则与领域：毒药完整真人／AI 对局、隐藏信息、药锅收牌；卡坦岛 2／3／5／8 人地图与初始建造、银行和真人交易、发展卡、强盗、特殊建造与确定性回放；原游戏回放只读；切换与席位调整的原子性；房间生命周期、消息与真实 SQLite 回放恢复。
- 计算：真实 Node 工作线程与单线程动作及审核一致；过期任务取消后可继续计算；审核默认关闭、显式启用与停用后的存储行为。
- 浏览器：关于页双链接、游戏大厅、主题与控件、键盘动作、本地恢复、回放播放／暂停／倍速；聊天未读、历史阅读、通知、可编辑常用语、消息时间、侧栏宽度保存、20 种特效的三端同步、点击穿透与动画清理、手机核心界面、武将详情和联机切换。
- 卡坦岛浏览器牌桌：三人及八人真人客户端（含手机布局）直接点击 SVG 完成蛇形建造、掷骰快捷键、同步显示与只读回放；本地轮流切换席位完成建造。
- macOS 原生 WebView：右键菜单抑制、默认审核隐藏、武将详情、统一深色控件、离线 Worker、确认、回放、重开与关闭；卡坦岛本地三人蛇形建造与原骰子按钮。
- 临时公网：macOS 原生房主与移动浏览器经 HTTPS／WSS 邀请、对局、聊天、身份恢复；同房切换保持公网入口，结束／退出的取消和确认、活动服务缓存保护及进程关闭。
- 缓存：真实 IndexedDB 大小与清理、活动对局和身份保留；原生目录清理保留房间数据库。
- 手机服务模式：电脑不占席位，两个手机布局客户端控制开局、同房切换与卡坦岛建造；服务管理窗口断开不暂停牌桌。人工增加 360 ms 往返延迟时，提示即时可见、重复点击只提交一次；聊天不再深拷贝牌桌，手机不自动覆盖服务计算配置。
- 服务重启：实际 SQLite、原身份与暂停恢复、确定性回放重建、动作去重。

手机网络优化测量见 [浏览器与延迟代理数据](benchmarks/mobile-network.json)：对同一组更新比较实际增量包与完整包，另测操作反馈时间；这是手机布局模拟，不是物理手机或公网实测。

性能测量使用 [基准脚本](../scripts/benchmark-ai.mjs)，实测数据见 [CPU 基准](benchmarks/ai-cpu.json)，固定局面与搜索预算；结果随硬件和同时运行的任务变化。当前使用 CPU 搜索，尚未接入 GPU 推理后端。

macOS ARM64 构建使用同一次准备流程生成前端和内置服务；配置见 [桌面构建](../src-tauri/tauri.conf.json)。GitHub 自动构建与 Windows 控制台检查入口见 [工作流](../.github/workflows/desktop.yml)。

## 实机待验

Windows 11 上两个服务进程的窗口行为、系统通知、高 DPI（125%／150%／200%）、中文输入法；iOS Safari／Android Chrome 的软键盘、触屏完整对局、锁屏与 Wi-Fi／移动数据切换；至少三台独立设备及不同网络联机。浏览器模拟和 Windows Server 构建机不替代这些实机检查。

斗地主维持真人玩法，其他游戏的规则、完整 AI 对局与策略审核入口由测试索引定义。没有实现语音或云端部署。

## 游戏与发布验证入口

| 覆盖 | 入口 |
| --- | --- |
| 图标、卡坦岛背景边界、璀璨宝石规则与投影 | [game-expansion.test.ts](../tests/game-expansion.test.ts) |
| 两款 AI 完整对局、公开报价约束与种子重现 | [economic-ai.test.ts](../tests/economic-ai.test.ts) |
| 真实 Worker、预算、取消与审核样本重现 | [compute.test.ts](../tests/compute.test.ts) |
| 浏览器房间菜单交互 | [交互入口](../scripts/browser-controls.mjs) |
| 双平台文件、版本标签与 SHA-256 | [release-assets.test.ts](../tests/release-assets.test.ts) |
| 璀璨宝石真实桌面／手机点击、联机、回放与本地 AI | [verify-splendor.mjs](../scripts/verify-splendor.mjs) |
| 宝石选中与禁用时颜色、引导开启时真实出牌 | [verify-splendor.mjs](../scripts/verify-splendor.mjs) |
| 五游戏引导、默认关闭、步骤导航、个人偏好与手机布局 | [契约测试](../tests/beginner-guide.test.ts)、[浏览器检查](../scripts/verify-beginner-guides.mjs) |
| 原规则锦囊身份与全部十五种说明 | [锦囊内容测试](../tests/trick-guide.test.ts) |
| 弹窗坐标、真实三国杀存档、锦囊悬停／键盘／触屏、牌桌定位与标记清理 | [交互检查](../scripts/verify-education.mjs) |
| 八款牌桌的低高度窗口、横竖屏、引导与聊天切换、专注模式 | [视口检查](../scripts/verify-viewport.mjs) |
| 卡坦岛真实联机、缩放后 SVG 点击、热座与回放 | [verify-catan.mjs](../scripts/verify-catan.mjs) |
| 六个困难跳棋 AI、真实计算统计、暂停恢复、缩小地图与尺寸保存 | [契约测试](../tests/ai-observation.test.ts)、[浏览器检查](../scripts/verify-ai-observation.mjs) |
| 原生牌桌与 AI | [原生脚本](../scripts/native-smoke.js) |
| 经济游戏 CPU 实测 | [记录](benchmarks/economic-ai.json)、[入口](../scripts/benchmark-ai.mjs) |

本机已验证的完整自我对局人数与结果由经济游戏测试输出，真人牌桌使用真实 Chromium 与 macOS WebView 验证；手机浏览器为触屏尺寸模拟。困难搜索按时间预算比较实际完成样本量，未评测胜率提升，不代表 AMD Ryzen 9 9955HX／RTX5080 的实机性能。Windows 11 安装需实机验收；自动构建与 Release 产物由 GitHub 工作流提供。
