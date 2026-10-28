# 操作反馈与原生窗口审核

[macOS 审核应用](../artifacts/review/window-experience/OnlineBGClient.app)，退出旧客户端后直接打开。构建、定向检查与包内服务证据见 [校验记录](../artifacts/review/window-experience/verification.json)。

## 实现索引

| 范围 | 入口 |
| --- | --- |
| 创建／开始请求状态、防重复及失败清理 | [操作状态](../src/client/room-operation.ts)、[应用接入](../src/main.tsx) |
| 场景入场与取消 | [共享过渡](../src/client/scene-transition.ts)、[场景外壳](../src/client/SceneSurface.tsx) |
| 大厅切换与组队选项 | [大厅](../src/client/Lobby.tsx) |
| 高级联机参数 | [偏好](../src/client/preferences.ts)、[设置](../src/client/Settings.tsx) |
| 独立回合状态行 | [应用](../src/main.tsx)、[状态样式](../src/client/ui/social-experience.css)、[专注](../src/client/ui/focus.css) |
| 隐藏创建、就绪校验、窗口复用和超时 | [原生窗口](../src-tauri/src/windows.rs)、[就绪通知](../src/client/native/windows.ts)、[内容生命周期](../src/client/native/AuxiliaryRoot.tsx) |
| 记录读取完成 | [记录窗口](../src/client/Records.tsx) |
| 回归入口 | [操作测试](../tests/room-operation.test.ts)、[就绪测试](../tests/window-ready.test.tsx)、[大厅测试](../tests/room-input.test.tsx) |

## 人工验收

1. 本地和公网分别创建房间，观察按钮的进行中反馈与房间入场。连续点击只提交一次；失败或取消后可以重试。公网准备耗时较长时，取消后不再进入迟到的房间。
2. 开始对局、再来一局和原生菜单开始操作，检查等待反馈与牌桌入场；关闭界面动画后仍立即执行命令。对局中出牌和 AI 状态更新不重播整页动画。
3. 检查地图、玩家信息与手牌顶部均不被“轮到你了”覆盖。轮到他人时状态行保持紧凑，不反复挤动棋盘；专注、手机横屏和竖屏同样检查。
4. 大厅没有“更多设置”。组队游戏直接显示组队选项；在设置 → 联机修改入口方式或自定义服务地址，重新创建房间确认生效。当前房间不随输入设置切换服务。
5. 在加入／创建与本地／跨网络之间连续切换，检查游戏库、昵称、头像和配置保留，页签与实际内容一致，没有额外横向溢出。
6. 首次打开关于、记录和设置，分别在浅色与深色下检查白屏及内容入场。关闭后再次打开，检查位置与尺寸保留、内容更新；通过原生菜单切换设置分类时正确聚焦。记录窗口等记录读取结束后再显示。
7. 快速关闭再打开辅助窗口，不应被旧的就绪通知重新弹出。关闭设置后麦克风试听停止；关闭记录后回放和订阅停止。模拟加载失败时主窗口显示错误，可重新打开。
8. 关闭界面动画或开启系统减少动态效果，窗口就绪逻辑仍生效，旋转反馈和内容入场停用。游戏动画维持独立偏好。

实际窗口白屏、帧率、原生焦点、设备与手机体验由用户手动验收。单元测试和签名结果不代表已经完成实机界面操作。
