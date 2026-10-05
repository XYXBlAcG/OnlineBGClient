# 手机浏览器

电脑客户端开房并保持运行，可选择仅启动服务；首位手机玩家负责开局和房间控制。手机通过 HTTPS 邀请链接或二维码加入；无需安装或账号，只需昵称。同一浏览器保存自己的恢复身份。联机入口见 [临时公网房间](hosting.md)。不实施云端部署、手机独立建房、PWA、后台推送或原生手机 App。

手机只提供准备、核心游戏操作、公开规则／武将说明、可选新手引导、聊天／常用语、未读、恢复与离开；房主拥有邀请和房间控制。游戏与 AI 能力以 [游戏目录](../src/domain/catalogue.ts) 为准，全部游戏沿用公共规则与协议。

| 职责 | 实现入口 |
| --- | --- |
| 触屏识别与精简功能边界 | [设备能力](../src/client/use-mobile.ts)、[应用入口](../src/main.tsx) |
| 邀请、昵称、房间信息与自动恢复 | [加入页](../src/client/MobileJoin.tsx)、[服务](../src/server/main.ts) |
| 二维码、复制与系统分享 | [邀请组件](../src/client/Invite.tsx) |
| 游戏专属界面与显式动作确认 | [原界面](../src/client/OriginalGame.tsx)、[合法操作](../src/client/GameCommands.tsx)、[游戏目录](../src/domain/catalogue.ts) |
| 竖横屏、滚动、安全区与聊天抽屉 | [公共样式](../src/styles.css)、[可视高度与输入](../src/client/ChatPanel.tsx) |
| 武将触屏详情与头像互动 | [社交体验](social-experience-plan.md) |
| 有序增量同步与动作反馈 | [同步契约](../src/domain/sync.ts)、[连接](../src/client/connection.ts)、[界面](../src/main.tsx) |
| 心跳、前台恢复与断线暂停 | [连接](../src/client/connection.ts)、[服务](../src/server/main.ts)、[房间](../src/domain/room.ts) |

移动浏览器关闭后的后台连接和通知不作为保证。浏览器模拟不替代真实触屏、锁屏和移动网络验证；实际覆盖及待验设备见 [验证](verification.md)。
