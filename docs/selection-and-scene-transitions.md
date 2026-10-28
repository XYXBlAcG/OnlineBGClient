# 文字选择与场景过渡审核

当前 [macOS 审核应用](../artifacts/review/scene-experience/OnlineBGClient.app)，退出旧客户端后直接打开。构建与非界面检查见 [校验记录](../artifacts/review/scene-experience/verification.json)。

## 实现索引

| 范围 | 入口 |
| --- | --- |
| 允许选择与全选范围 | [选择策略](../src/client/selection-policy.ts)、[样式](../src/client/ui/selection.css) |
| 原生全选菜单与窗口路由 | [原生菜单](../src-tauri/src/desktop.rs)、[窗口安装](../src/client/motion.tsx) |
| 场景标识、尺寸衔接与取消 | [共享过渡](../src/client/scene-transition.ts)、[场景外壳](../src/client/SceneSurface.tsx) |
| 大厅与房间接入 | [大厅](../src/client/Lobby.tsx)、[应用](../src/main.tsx) |
| 动画开关及系统减少动态效果 | [动效策略](../src/client/motion-policy.ts)、[运行状态](../src/client/use-motion.ts) |
| 定向回归 | [选择检查](../tests/selection-policy.test.ts)、[过渡检查](../tests/scene-transition.test.ts)、[大厅表单](../tests/room-input.test.tsx) |

## 人工验收

1. 在大厅、设置、牌桌、新手引导和弹出菜单中拖选普通文字、按钮内部文字，均不产生文字选区；普通位置按 ⌘A／Ctrl+A 不选中整页。
2. 昵称、聊天输入、邀请链接输入框照常输入、全选、复制粘贴。聊天正文和邀请展示链接可拖选，聚焦对应正文后全选只覆盖该段。错误正文仍可复制，关闭按钮不可选。
3. macOS 在主窗口和独立聊天、设置、邀请窗口分别使用键盘与原生「编辑操作 → 全选」，检查作用于当前窗口；快捷键录入时 ⌘A／Ctrl+A 提示系统保留，不保存为游戏绑定；Esc 正常取消。
4. 跨网络联机在加入／创建之间切换，观察表单入场、卡片移动和高度变化；昵称、头像和已填写内容保留。快速连续切换后，最终页签与内容一致，没有旧界面覆盖或重复按钮。
5. 加入房间、开始游戏、结束对局、同房间切换游戏及退出房间，观察内容衔接，顶栏与通知保持稳定。对局操作立即响应，普通出牌、聊天和 AI 决策不触发整页动画。
6. 关闭「界面动画」，上述场景立即切换；只关闭「游戏动画」时界面过渡仍生效。开启系统减少动态效果后无过渡，切出后台再回来不补播旧动画。
7. 手机竖屏、横屏检查页面无新增横向溢出；牌桌、聊天、头像特效和弹窗层级正常，动画结束后尺寸与操作区域正确。

实际 WebKit、Windows 与手机视觉体验由用户验收；定向测试和打包不代表已经完成界面操作测试。
