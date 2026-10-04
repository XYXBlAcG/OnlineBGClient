# 验证入口

日常按改动范围选择测试；发布前执行完整验证。

| 范围 | 入口 |
| --- | --- |
| 游戏原资源与渲染 | [upstream.test.ts](../tests/upstream.test.ts)、[checkers-renderer.test.tsx](../tests/checkers-renderer.test.tsx) |
| 规则与观察隔离 | [engine.test.ts](../tests/engine.test.ts)、[ddz.test.ts](../tests/ddz.test.ts)、[checkers.test.ts](../tests/checkers.test.ts)、[expansion.test.ts](../tests/expansion.test.ts) |
| 策略、完整 AI 对局与审核 | [ai.test.ts](../tests/ai.test.ts)、[strategy-search.test.ts](../tests/strategy-search.test.ts)、[strategies.test.ts](../tests/strategies.test.ts) |
| 生命周期、席位、恢复和动作去重 | [room.test.ts](../tests/room.test.ts)、[room-lifecycle.test.ts](../tests/room-lifecycle.test.ts)、[connection.test.ts](../tests/connection.test.ts) |
| 真实 SQLite、确定性回放 | [storage.test.ts](../tests/storage.test.ts)、[replay.test.ts](../tests/replay.test.ts) |
| 命令作用域与主题契约 | [commands.test.ts](../tests/commands.test.ts)、[themes.test.ts](../tests/themes.test.ts) |
| 服务进程重启、身份与聊天恢复 | [verify-restart.mjs](../scripts/verify-restart.mjs) |
| 隔离服务与三个真实浏览器客户端 | [verify-client.mjs](../scripts/verify-client.mjs)、[smoke-client.mjs](../scripts/smoke-client.mjs) |
| 四游戏 WebSocket 联机 | [smoke-network.mjs](../scripts/smoke-network.mjs) |
| 原生 WebView、控件和离线 Worker | [原生入口](../src-tauri/examples/smoke.rs)、[交互脚本](../scripts/native-smoke.js) |
| 原生临时公网房主与浏览器好友 | [房主入口](../src-tauri/examples/hosting_smoke.rs)、[房主脚本](../scripts/native-hosting-smoke.js)、[好友脚本](../scripts/smoke-host-guest.mjs) |
| 平台自动构建 | [工作流](../.github/workflows/desktop.yml) |

`npm run verify:client` 自动启动独立服务与存档目录。浏览器支持 CHROME_PATH，未指定时选本机 Chrome 或 Playwright Chromium。网络脚本通过 TEST_SERVICE 指定入口、TEST_GAME 指定游戏。原生脚本通过 COMPANION_SMOKE_OUTPUT 指定结果文件，运行 `cargo run --release --example smoke --features tauri/custom-protocol`。

真实浏览器已验证五游戏大厅、收藏、主题、滑杆键盘、本地席位切换、F2 与确认、本地刷新恢复、结束返回等待室、回放、三真人斗地主出牌、聊天、刷新重连、离开与房主关闭。斗地主规则测试包括三真人完整对局及隐藏信息；其他四游戏保留完整 AI 对局与审核测试。

既有公网测试通过临时 Cloudflare Tunnel HTTPS/WSS 路径完成动作、消息、去重与席位恢复，包含原生房主与浏览器好友。客户端请求来自同一本机网络；两台设备分别使用不同网络、Windows 11 实机与移动端仍待验证。平台构建成功不代表实机交互已验证。

交付前完整回归：17 个测试文件、43 个测试通过。服务进程重启已验证牌局、聊天、原身份、暂停恢复与动作去重。

macOS ARM64 正式应用包与原生 WebView 已通过大厅、深色控件、离线 Worker、UNO／三国杀、确认、等待室、回放、重开与关闭验证。原生临时公网房间与独立 Chrome 好友已通过邀请、对局、聊天、刷新身份恢复及取消／确认关闭、服务清理。

[双平台构建记录](https://github.com/XYXBlAcG/OnlineBGClient/actions/runs/37185726938) 已通过 macOS ARM64 应用包、Windows x64 NSIS 安装器以及两个构建机上的服务重启、三玩家浏览器流程。Windows 构建机为 Windows Server 2022，Windows 11 实机交互仍待验证。
