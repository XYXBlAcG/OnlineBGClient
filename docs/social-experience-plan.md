# 社交体验

保留全部游戏的专属牌桌与策略；公共社交能力由同一房间入口提供。语音不在当前范围，手机入口见 [手机浏览器](mobile-browser-plan.md)。

| 功能 | 实现入口 |
| --- | --- |
| 当前规则下的武将资料、技能解释与例子 | [武将目录](../src/domain/hero-guide.ts)、[术语](../src/domain/terms.ts) |
| 悬停、键盘聚焦与触屏详情 | [武将组件](../src/client/HeroSurface.tsx)、[原界面适配](../scripts/build-upstream.mjs) |
| 头像菜单与同步动效 | [牌桌头像](../src/client/AvatarSurface.tsx)、[动效](../src/client/Interactions.tsx)、[运动路径](../src/client/effect-motion.ts)、[原界面适配](../scripts/build-upstream.mjs) |
| 消息类型、互动种类与资源约束 | [社交模型](../src/domain/social.ts)、[协议](../src/domain/protocol.ts) |
| 消息序号、身份、去重与互动校验 | [房间](../src/domain/room.ts)、[网关](../src/domain/gateway.ts) |
| 未读、阅读位置与带时间的消息 | [阅读状态](../src/client/chat-read.ts)、[消息组件](../src/client/ChatPanel.tsx) |
| 提示音与系统通知 | [通知](../src/client/notifications.ts)、[设置](../src/client/Settings.tsx) |
| 自己头像的常用语与他人头像的特效 | [牌桌菜单](../src/client/AvatarSurface.tsx)、[分组菜单](../src/client/PhraseMenu.tsx) |
| 常用语预设、编辑与保存 | [预设](../src/domain/phrase-presets.json)、[校验与游戏语句](../src/domain/phrases.ts)、[编辑](../src/client/PhraseSettings.tsx)、[偏好](../src/client/preferences.ts) |
| 聊天侧栏宽度 | [边缘分栏](../src/client/SidebarDivider.tsx)、[消息组件](../src/client/ChatPanel.tsx) |
| 缓存与本地存档 | [清理界面](../src/client/CacheSettings.tsx)、[IndexedDB](../src/client/storage.ts)、[原生缓存](../src-tauri/src/cache.rs) |
| 深浅色、控件、浮层与减少动态效果 | [主题](../src/client/themes.ts)、[样式](../src/styles.css)、[动态偏好](../src/client/use-motion.ts) |
| 桌面右键菜单与公网进程 | [菜单策略](../src/client/desktop-context-menu.ts)、[进程管理](../src-tauri/src/hosting.rs) |
| 关于与回放 | [关于资料](../src/client/about.json)、[记录界面](../src/client/Records.tsx) |

验证入口、实际覆盖与实机待验项统一维护在 [验证](verification.md)。桌面构建会同步生成前端和内置服务，入口见 [构建配置](../src-tauri/tauri.conf.json)。
