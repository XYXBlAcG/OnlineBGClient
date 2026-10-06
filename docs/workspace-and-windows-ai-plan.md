# 桌面牌桌与原生窗口

牌桌使用游戏默认布局，手牌、资源、玩家信息与公共区域一起显示。设置、关于、回放、邀请、游戏操作、下一局配置和诊断使用系统辅助窗口；系统标题栏和窗口边缘负责缩放，内部控件沿用共享前端。

聊天与引导由用户主动打开，默认收起。宽桌面共用右侧区域，可拖动分栏调整宽度，方向键微调、Escape 取消拖动、双击恢复默认宽度。窄桌面使用独立系统窗口，手机使用边缘抽屉。引导窗口向主牌桌请求定位，不创建另一份游戏。

| 职责 | 单一入口 |
| --- | --- |
| 完整牌桌与回放 | [OriginalGame](../src/client/OriginalGame.tsx)、[Records](../src/client/Records.tsx) |
| 主窗口与辅助区域状态 | [应用入口](../src/main.tsx) |
| 边缘分栏与尺寸约束 | [SidebarDivider](../src/client/SidebarDivider.tsx)、[布局约束](../src/client/sidebar-layout.ts)、[偏好](../src/client/preferences.ts) |
| 游戏排布、共享控件与图层 | [样式](../src/styles.css)、[Controls](../src/client/ui/Controls.tsx)、[地图](../src/client/MapViewport.tsx) |
| 原生窗口与生命周期 | [Rust 窗口](../src-tauri/src/windows.rs)、[应用入口](../src-tauri/src/lib.rs) |
| 投影与操作请求 | [契约](../src/client/native/contract.ts)、[桥接](../src/client/native/windows.ts)、[辅助窗口](../src/client/native/AuxiliaryRoot.tsx) |
| 引导步骤、目标与标记 | [步骤](../src/client/beginner-guides.ts)、[目标](../src/client/guide-targets.ts)、[构建标记](../scripts/upstream-guide-targets.mjs)、[引导](../src/client/BeginnerGuide.tsx)、[标记](../src/client/GuideHighlight.tsx) |
| 头像互动与牌桌动画 | [头像](../src/client/AvatarSurface.tsx)、[互动](../src/client/Interactions.tsx)、[牌面反馈](../src/client/GameFeedback.tsx) |
| 平台验证 | [验证索引](verification.md) |

房间连接和 AI 由主窗口持有；辅助窗口接收有序投影，操作通过主窗口提交。窗口位置与大小由 Tauri Window State 保存。
