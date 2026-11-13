# 秘塔远征手机存档与 AI 节奏计划

目标：在原生手机壳里继续本地或联机远征，原生只做入口和状态展示，存档与恢复仍由 Web 的 IndexedDB／房间服务负责，避免形成第二套存档。

## 当前手机布局

- 手机竖屏战斗使用单列阶段区：紧凑状态栏、可横向滑动的敌人意图、战斗场景、拇指区操作条、底部横滑手牌。
- 队伍、路线、牌组/遗物、职业详情、托管等低频操作收进抽屉，竖屏底部弹出，横屏右侧滑出。
- 职业选择改成两列大触控卡，全部职业在第一屏可见。
- AI 队友、牌组/遗物、职业详情在需要时展开；职业详情为底部浮层。
- 手机横屏战斗使用左侧意图/操作栏 + 右侧战斗场景 + 底部手牌；AI 队友只保留紧凑横条。
- 秘塔远征地图提供横屏版：楼层从左到右推进，手机横屏自动启用，桌面可在路线面板切换并记住选择。横屏地图把路线选择收进「选择路线」抽屉，地图占满牌桌。
- 布局入口见 [table.css](../src/client/expedition/table.css)，地图方向见 [map-layout.ts](../src/client/expedition/map-layout.ts)，守卫入口见 [原生牌桌样式](../src/client/ui/native-table.css)。

## 已完成

- 原生首页「继续远征」打开 [ShellRunsScreen](../ios-native/OnlineBGShell/WebTableScreen.swift)，复用 Web [RunShelf](../src/client/expedition/RunShelf.tsx)。
- Web 产物内置在 App；单机由 `127.0.0.1` 本地静态服务器提供。邀请链接中的房间服务通过 `service` 参数传入，IndexedDB 不再按房间域名分裂。
- 原生 `ready` 早于快照隐藏加载层，存档页不会等待 15 秒兜底。
- 原生设置增加 AI 响应时间；本地 URL 传 `aiDelayMs`，开局写入房间配置。
- 原生和 Web 手机开局增加远征难度（剧情/标准/挑战），通过 `expeditionDifficulty` 写入 `RoomConfig.expedition`。
- 远征职业、卡牌、地图和资源图标统一为文本字形（Variation Selector 15），不使用彩色 emoji；玩家头像仍是用户内容。
- 手机职业选择两列、战斗底部手牌、横屏左操作右场景。
- 放弃远征使用 iOS 原生确认；Web 关闭/离开房间结果回传原生后再退出壳。

## 待完成

- 恢复成功的原生提示；失败提示和放弃远征确认已接入原生 Alert。
- 联机远征在 Shell 基址下的重连、房主离线、存档迁移验收。
- 托管/桌面房主存档在手机上的限制说明。

## 现状

- 本地对局由 [本地 Worker](../src/client/local-worker.ts) 在每次快照后写入 IndexedDB；远征运行同时写入 `runs` 和 `runLinks`。
- 联机远征由房间服务的 [Gateway](../src/domain/gateway.ts) 和 [RoomStore](../src/server/storage.ts) 保存；恢复协议为 `restore-run`。
- Web 已有 [RunShelf](../src/client/expedition/RunShelf.tsx)、[ResumeDrawer](../src/client/lobby/ResumeDrawer.tsx) 和 [restoreRun](../src/main.tsx) 的完整恢复流程。
- 原生壳目前从 `native-table=expedition` 直接新建本地房间，没有展示 `runLinks` 的入口。
- AI 节奏已有 [RoomConfig.aiDelayMs](../src/domain/protocol.ts)、[setTempo](../src/domain/room.ts) 和 [RoomToolbar](../src/client/RoomToolbar.tsx) 的房主控制；原生设置还没有传这个参数。

## 设计

### 1. 原生远征入口

不在 Swift 复制远征存档或令牌。新增一个原生入口「继续远征」，打开带 `native-runs=expedition` 的 Web 壳：

- Web 在 native shell 中渲染现有 `RunShelf`，展示大层、节点、参与者和更新时间。
- 点击继续调用现有 `restoreRun`；本地存档走 `LocalConnection`，联机存档走 `NetworkConnection`。
- 传入 `native-room=1` 或新的 `native-runs=1` 时隐藏重复的 Web 顶栏，保留原生返回和 Web 结束/放弃操作。
- 恢复成功后 Web 进入牌桌，原生加载态收到 `ready` 后消失，不切换第二套页面。
- 放弃操作复用 `abandon-run`，原生用 iOS 确认框替代 Web 横幅提示。

### 2. 保存与恢复

- 保持 `WKWebsiteDataStore.default()`，不清理 IndexedDB；当前牌桌 WebView 已经使用默认数据存储。
- 本地每次快照后由 `local-worker` 自动保存；原生只在切后台时关闭网络连接，不主动清空 Web 数据。
- 联机远征由服务端 `runs` 持久化；原生恢复时只传 `run` 和原有身份令牌，不把令牌写入 Swift 存储。
- 恢复入口使用现有协议版本和 `migrateExpedition`，不在原生解析远征状态。

### 3. AI 行动间隔

- 开局配置增加 `aiDelayMs` 参数：原生远征设置页提供 0.5 / 1 / 1.5 / 2.5 秒几档，默认 1.5 秒。
- 本地房间把参数写入 `RoomConfig`；联机房间由房主创建时写入。
- 联机对局中房主仍通过房间工具栏调整 `tempo`；原生不再提供局内速度菜单，客人只读。
- 原生设置页显示“AI 响应时间”，不复制 Web 的倒计时和 AI 计算策略。

### 4. 远征设置

- 原生设置现有的“AI 朋友”“AI 能力”继续映射到席位难度。
- 远征难度已接入；后续再加入飞升等级和初始幸运，这些参数继续由 [远征选项](../src/domain/expedition/adventure-types.ts) 定义，不新增 Swift 结构。

## 实施顺序

1. Web 增加 `native-runs` 模式和原生样式，复用 `RunShelf`。
2. 原生首页/大厅增加「继续远征」到该 Web 壳。
3. 给 `localRoomConfig` 和 native table URL 增加 `aiDelayMs`，原生开局设置传入。
4. 增加房主在局内调整 AI 间隔的原生入口。
5. 补定向测试并做真机存档、恢复、放弃、AI 节奏验收。

## 验收

- 本地远征推进若干节点后退出应用，重新打开能从存档继续，手牌、地图、楼层和角色状态一致。
- 联机远征由房主和客人分别退出再进入，身份令牌、席位、AI 朋友和进度一致。
- 放弃远征后存档从列表消失，普通回放不受影响。
- 0.5 秒和 2.5 秒档位对 AI 行动间隔有可见差异，出牌和聊天不被阻塞。
- 原生只做入口和提示；不出现在 Swift 里维护远征状态、令牌或第二套恢复协议。

## 相关入口

- [远征实现索引](expedition.md)
- [Web 恢复入口](../src/main.tsx)
- [本地存档 Worker](../src/client/local-worker.ts)
- [索引存储](../src/client/storage.ts)
- [远征牌桌](../src/client/expedition/ExpeditionTable.tsx)
- [房间节奏](../src/domain/room.ts)
- [原生 Web 壳](../ios-native/OnlineBGShell/WebTableScreen.swift)
