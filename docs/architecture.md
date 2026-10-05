# 客户端架构

Tauri 2 提供原生窗口与系统 WebView；游戏区域保留 Hullqin 的 React 界面。大厅与审核面板采用系统字体。浏览器、桌面共用客户端；离线对局不依赖原站或 Node.js。

## 实现索引

| 职责 | 唯一来源 |
| --- | --- |
| 原站资源版本及校验 | [资源清单](../upstream/manifest.json)、[来源](../upstream/README.md) |
| 原界面与规则提取、边界适配 | [构建脚本](../scripts/build-upstream.mjs) |
| 原模块隔离与依赖注入 | [运行时](../src/upstream/runtime.ts) |
| 状态与动作类型 | [领域类型](../src/domain/types.ts)、[动作校验](../src/domain/actions.ts) |
| 游戏注册、版本、能力与人数约束 | [目录](../src/domain/catalogue.ts) |
| 游戏规则插件契约 | [适配器](../src/domain/plugin.ts)、[内置规则](../src/domain/builtin-rules.ts) |
| 策略注册与审核版本检查 | [策略契约](../src/domain/strategies.ts) |
| 主题插件与外观变量 | [主题注册](../src/client/themes.ts)、[样式](../src/styles.css) |
| 统一控件与弹窗 | [控件](../src/client/ui/Controls.tsx) |
| 命令、绑定与游戏键盘操作 | [命令注册](../src/client/commands.ts)、[游戏操作](../src/client/GameCommands.tsx)、[原界面](../src/client/OriginalGame.tsx) |
| 桌面浏览器菜单策略 | [菜单策略](../src/client/desktop-context-menu.ts)、[应用入口](../src/main.tsx) |
| 设置与目录偏好 | [设置](../src/client/Settings.tsx)、[偏好](../src/client/preferences.ts) |
| 可选新手引导与各游戏教学内容 | [引导组件](../src/client/BeginnerGuide.tsx)、[内容注册](../src/client/beginner-guides.ts)、[个人偏好](../src/client/preferences.ts) |
| 视口高度分配、共享侧栏与专注模式 | [房间界面](../src/main.tsx)、[布局](../src/styles.css)、[屏幕类型](../src/client/use-mobile.ts) |
| 地图适配、缩放与平移 | [地图视口](../src/client/MapViewport.tsx)、[游戏边界接入](../scripts/build-upstream.mjs) |
| 引导中的实际局面与合法动作 | [局面投影](../src/client/guide-position.ts)、[快照契约](../src/domain/protocol.ts) |
| 武将与锦囊的悬停、聚焦和触屏详情 | [公共详情组件](../src/client/DetailSurface.tsx)、[锦囊牌面](../src/client/CardSurface.tsx)、[锦囊内容](../src/domain/card-guide.ts)、[武将牌面](../src/client/HeroSurface.tsx) |
| 大厅与游戏分类 | [大厅](../src/client/Lobby.tsx) |
| 系统菜单、托盘和窗口退出 | [桌面](../src-tauri/src/desktop.rs)、[应用入口](../src-tauri/src/lib.rs) |
| 服务存档 | [SQLite](../src/server/storage.ts) |
| 本地存档与记录 | [IndexedDB](../src/client/storage.ts) |
| 关于与作者主页 | [资料](../src/client/about.json)、[关于页](../src/client/About.tsx)、[原生菜单与链接](../src-tauri/src/desktop.rs) |
| 回放播放与导入导出 | [回放格式](../src/domain/replay.ts)、[记录界面](../src/client/Records.tsx)、[文件](../src/client/files.ts) |
| 卡坦岛真人规则与界面动作 | [规则](../src/domain/catan.ts)、[动作类型](../src/domain/catan-actions.ts)、[界面意图](../src/domain/catan-intent.ts) |
| 璀璨宝石规则与界面动作 | [规则](../src/domain/splendor.ts)、[动作](../src/domain/splendor-actions.ts) |
| 卡坦岛与璀璨宝石搜索 | [公共信息集搜索](../src/domain/economic-strategy.ts)、[卡坦岛](../src/domain/catan-strategy.ts)、[璀璨宝石](../src/domain/splendor-strategy.ts) |
| Release 产物与发布 | [游戏与发布入口](game-ai-release-plan.md) |
| 斗地主真人规则 | [斗地主](../src/domain/ddz.ts) |
| AI 名称派生 | [名称](../src/domain/names.ts) |
| 确认交互 | [确认服务](../src/client/confirmation-controller.ts)、[确认框](../src/client/Confirmation.tsx) |
| 跳棋原规则与棋子目标分配 | [跳棋](../src/domain/checkers.ts) |
| 飞行棋原规则适配 | [飞行棋](../src/domain/flight.ts) |
| 合法动作、规则执行与玩家可见信息 | [规则入口](../src/domain/engine.ts) |
| 三国杀名称与显示文本 | [术语目录](../src/domain/terms.ts) |
| CPU 执行策略与线程池 | [设置契约](../src/domain/performance.ts)、[共享线程池与协调器](../src/domain/compute.ts)、[基准入口](../scripts/benchmark-ai.mjs) |
| 缓存大小与清理 | [界面](../src/client/CacheSettings.tsx)、[原生缓存](../src-tauri/src/cache.rs)、[本地存储](../src/client/storage.ts) |
| 毒药原规则适配 | [毒药](../src/domain/poison.ts) |
| 房间配置与人数调整 | [配置界面](../src/client/RoomSetup.tsx)、[权威写入口](../src/domain/room.ts) |
| 难度预算、权重、抽样与评分 | [策略](../src/domain/strategy.ts) |
| 房间生命周期与动作去重 | [房间](../src/domain/room.ts) |
| 服务电脑身份与玩家管理权限 | [房间身份](../src/domain/room.ts)、[创建入口](../src/domain/gateway.ts)、[大厅](../src/client/Lobby.tsx) |
| 增量快照与游戏投影复用 | [同步契约](../src/domain/sync.ts)、[快照](../src/domain/room.ts)、[连接与确认](../src/client/connection.ts) |
| 通信校验与快照 | [协议](../src/domain/protocol.ts) |
| 离线后台执行 | [本地 Worker](../src/client/local-worker.ts) |
| 联机权威执行 | [房间服务](../src/server/main.ts)、[AI Worker](../src/server/ai-worker.ts) |
| 重连与凭据恢复 | [连接](../src/client/connection.ts) |
| 审核与后台重放 | [审核面板](../src/client/Audit.tsx)、[重放 Worker](../src/client/audit-worker.ts) |
| 临时公网开房 | [运行说明](hosting.md) |
| 手机核心界面与邀请 | [手机入口](mobile-browser-plan.md) |
| 公共消息、表情、互动与武将说明 | [社交入口](social-experience-plan.md) |
| 本地审核与作者提交 | [操作说明](review-and-submit.md) |
| 全 AI 观战与运行统计 | [房间](../src/domain/room.ts)、[并行搜索](../src/domain/compute.ts)、[计算栏](../src/client/ComputeStatus.tsx) |
| 面板尺寸与地图 | [尺寸组件](../src/client/SurfaceResize.tsx)、[偏好](../src/client/preferences.ts)、[地图视口](../src/client/MapViewport.tsx) |
| 桌面原生入口 | [Tauri](../src-tauri/) |

## 边界

本项目的房间服务独立于原站，无法加入原站房间。前端提交语义动作，由房间唯一写入口调用原规则。离线与在线使用同一引擎和策略。

AI 只接收对应席位可见信息。审核展示实际候选、特征贡献、抽样均值与标准误；局面分数不代表胜率。房主启用审核时生成完整记录，结束后公开；训练房间可即时审核。审核关闭时保留对局动作与回放，不生成完整解释或保存审核记录。搜索采用有限预算和候选剪枝，不能保证最优策略。

原站生成代码隔离在 upstream 层，通过固定资源和提取脚本重建。该层的大文件属于构建产物；自有逻辑保持按领域职责分离。

## 平台与功能状态

桌面构建目标与检查入口由 [工作流](../.github/workflows/desktop.yml) 定义。实际构建、原生验证与未覆盖的平台见 [验证](verification.md)。游戏、策略和主题目前随应用打包；独立安装与其他平台安排见 [规划](roadmap.md)。

语音不在当前范围。公网接入与服务部署方案见 [联机运行](network.md)。验证入口与实际覆盖见 [验证](verification.md)。
