# 社交体验

保留全部游戏的专属牌桌与策略；公共社交能力由同一房间入口提供。语音不在当前范围，手机入口见 [手机浏览器](mobile-browser-plan.md)。

| 功能 | 实现入口 |
| --- | --- |
| 当前规则下的武将资料、技能解释与例子 | [武将目录](../src/domain/hero-guide.ts)、[术语](../src/domain/terms.ts) |
| 悬停、键盘聚焦与触屏详情 | [武将组件](../src/client/HeroSurface.tsx)、[原界面适配](../scripts/build-upstream.mjs) |
| 头像菜单与同步动效 | [头像](../src/client/Avatars.tsx)、[动效](../src/client/Interactions.tsx)、[原界面适配](../scripts/build-upstream.mjs) |
| 消息类型、互动种类与资源约束 | [社交模型](../src/domain/social.ts)、[协议](../src/domain/protocol.ts) |
| 消息序号、身份、去重与互动校验 | [房间](../src/domain/room.ts)、[网关](../src/domain/gateway.ts) |
| 未读、阅读位置与聊天侧栏 | [阅读状态](../src/client/chat-read.ts)、[消息组件](../src/client/ChatPanel.tsx) |
| 提示音与系统通知 | [通知](../src/client/notifications.ts)、[设置](../src/client/Settings.tsx) |
| 内置表情、导入预览、收藏与最近使用 | [目录](../src/domain/social.ts)、[选择器](../src/client/StickerPicker.tsx)、[偏好](../src/client/preferences.ts) |
| 图片传输、静态预览与加载重试 | [客户端资源](../src/client/stickers.ts)、[图片](../src/client/StickerImage.tsx)、[服务资源](../src/server/assets.ts) |
| 本地图片和服务存档 | [IndexedDB](../src/client/storage.ts)、[SQLite](../src/server/storage.ts)、[HTTP 入口与清理](../src/server/main.ts) |
| 深浅色、控件、浮层与减少动态效果 | [主题](../src/client/themes.ts)、[样式](../src/styles.css)、[动态偏好](../src/client/use-motion.ts) |
| 桌面右键菜单与公网进程 | [菜单策略](../src/client/desktop-context-menu.ts)、[进程管理](../src-tauri/src/hosting.rs) |
| 关于与回放 | [关于资料](../src/client/about.json)、[记录界面](../src/client/Records.tsx) |

验证入口、实际覆盖与实机待验项统一维护在 [验证](verification.md)。桌面构建会同步生成前端和内置服务，入口见 [构建配置](../src-tauri/tauri.conf.json)。
