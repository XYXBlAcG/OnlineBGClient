# 界面、游戏动效与自选头像

保留完整牌桌、手牌、系统原生辅助窗口和边缘分栏。远程开房按 [独立方案](remote-host-plan.md) 暂缓。

## 使用入口

设置 → 外观提供两个独立复选框；手机可在加入页或自己的头像菜单 → 动效偏好中选择：

| 选项 | 未勾选 | 勾选 |
| --- | --- | --- |
| 界面动画 | 界面即时切换 | 轻量界面动效 |
| 游戏动画 | 当前版游戏动效 | 增强游戏动效 |

静态界面优化始终生效。设备自行保存偏好，系统减少动态效果和页面后台状态优先；不改变规则、AI 思考预算或房间动作节奏。

大厅、手机加入房间和设置页可选择头像；对局中点击自己头像 → 更换头像。可选预设，也可输入一个完整 emoji 或单个汉字。头像与玩家身份同步，重连、换游戏和回放保留；点击他人头像只提供互动特效。

## 单一实现入口

| 职责 | 源 |
| --- | --- |
| 偏好、默认值与存储 | [preferences](../src/client/preferences.ts) |
| 两通道有效策略 | [策略](../src/client/motion-policy.ts)、[系统与可见性](../src/client/use-motion.ts)、[Provider](../src/client/motion.tsx) |
| 设置分组与复选框 | [Settings](../src/client/Settings.tsx)、[MotionControls](../src/client/MotionControls.tsx) |
| 共用视觉与游戏适配 | [外壳样式](../src/styles.css)、[体验样式](../src/client/ui/experience.css) |
| 牌桌接入与 SVG 动画 | [OriginalGame](../src/client/OriginalGame.tsx)、[生成器](../scripts/upstream-motion.mjs) |
| 已确认动作与局部反馈 | [语义事件](../src/client/game-motion-events.ts)、[局部反馈](../src/client/game-motion.ts) |
| 可中断动画、实体交接与 UNO 3D 翻牌 | [GameMotionLayer](../src/client/GameMotionLayer.tsx)、[TableAnimator](../src/client/motion/table-animator.ts)、[图形采样](../src/client/motion/table-sample.ts) |
| 当前版游戏反馈 | [GameFeedback](../src/client/GameFeedback.tsx) |
| 头像特效与清理 | [Interactions](../src/client/Interactions.tsx) |
| 头像校验和默认展示 | [avatar](../src/domain/avatar.ts) |
| 头像选择与牌桌菜单 | [Picker](../src/client/AvatarPicker.tsx)、[AvatarSurface](../src/client/AvatarSurface.tsx) |
| 房间身份与同步 | [协议](../src/domain/protocol.ts)、[Gateway](../src/domain/gateway.ts)、[Room](../src/domain/room.ts) |
| 回放头像与播放策略 | [格式](../src/domain/replay.ts)、[Records](../src/client/Records.tsx) |
| 原生辅助窗口偏好同步 | [AuxiliaryRoot](../src/client/native/AuxiliaryRoot.tsx) |

游戏表现只读取玩家可见投影和已公开动作；移动副本不接收点击或键盘焦点。连续更新、切换视角、缩放、滚动、减少动态效果和切后台时清理过期表现。回放暂停、定位和倍速使用相同牌桌入口。

## 审核与验证

- [macOS Apple Silicon 审核入口](multiplayer-room-experience.md#审核产物)：解压后打开 OnlineBGClient.app。
- [真实设置截图](../artifacts/review/experience-settings.png)、[真实牌桌截图](../artifacts/review/experience-splendor.png)、[手机头像与动效入口](../artifacts/review/experience-mobile-avatar.png)。
- [八游戏与四组合浏览器检查](../scripts/verify-experience.mjs)：真实服务、权威动作、桌面／手机头像同步、暂停回放与实时牌桌隔离、系统减少动态效果、清理、低高度；[本机帧时间](../artifacts/review/experience-performance.json) 为 Chromium 动作后空闲帧记录，不代表动画期间或手机实机性能。
- [UNO 双视角翻牌检查](../scripts/verify-uno-motion.mjs)：真实摸牌、本人正面、他人牌背、落点、点击中断与减少动态效果；[原生翻牌检查](../scripts/native-motion-smoke.js) 使用 `COMPANION_SMOKE_PROFILE=motion`。
- [动作语义测试](../tests/game-motion-events.test.ts)、[头像身份测试](../tests/avatar.test.ts)、[策略测试](../tests/motion-policy.test.ts)、[反馈测试](../tests/game-motion.test.ts)。
- [完整牌桌检查](../scripts/verify-workspace.mjs)、[横竖屏检查](../scripts/verify-viewport.mjs)、[社交检查](../scripts/verify-social.mjs)、[缓存检查](../scripts/verify-cache.mjs)。
- [原生检查](../scripts/native-smoke-runner.mjs)、[辅助窗口检查](../scripts/native-auxiliary-smoke.js)。Windows WebView2 和真实手机仍需对应设备验收。
