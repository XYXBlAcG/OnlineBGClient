# 验证入口

日常按改动范围选择测试；发布前执行完整验证。

| 范围 | 入口 |
| --- | --- |
| 社交模型、消息序号与资源 | [互动与消息](../tests/social.test.ts)、[资源](../tests/assets.test.ts)、[阅读状态](../tests/chat-read.test.ts)、[旧存档升级](../tests/archive-upgrade.test.ts) |
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

2026-10-04：本轮相关 13 个测试文件、24 个测试通过；类型检查与生产构建通过。浏览器验证入口均使用真实服务、独立浏览器上下文及真实存储。

- 既有客户端回归：关于、回放播放／暂停／倍速、默认审核与偏好保存、统一控件、五游戏大厅、三真人斗地主、刷新恢复、离开和关闭。
- 打包服务回归：直接启动桌面包内置服务；三客户端的五游戏切换、头像互动、同名未读、历史滚动、内置／自定义／GIF 表情、收藏与最近、减少动态效果、二维码、武将详情和手机竖横屏恢复。
- 服务重启：真实 SQLite、原身份与暂停恢复、动作去重、图片上传后重启读取；资源清理验证引用预览与近期上传保留。
- 临时公网 HTTPS/WSS：原生房主与手机尺寸 Chrome 完成对局、聊天、自定义表情、原身份恢复、保持公网地址的游戏切换及退出清理。两个客户端来自同一本机网络。
- macOS 原生 WebView：右键菜单抑制、审核默认隐藏、武将详情、深色控件、离线 Worker、UNO／三国杀、确认、回放、重开和关闭。

macOS ARM64 构建使用同一次准备流程生成前端和内置服务；配置见 [桌面构建](../src-tauri/tauri.conf.json)。GitHub 自动构建与 Windows 控制台检查入口见 [工作流](../.github/workflows/desktop.yml)。

## 实机待验

Windows 11 上两个服务进程的窗口行为、系统通知、高 DPI（125%／150%／200%）、中文输入法；iOS Safari／Android Chrome 的软键盘、触屏完整对局、锁屏与 Wi-Fi／移动数据切换；至少三台独立设备及不同网络联机。浏览器模拟和 Windows Server 构建机不替代这些实机检查。

斗地主维持真人玩法，其他四游戏的规则、完整 AI 对局与策略审核入口由上方测试索引定义。没有实现语音或云端部署。
