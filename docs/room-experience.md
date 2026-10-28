# 房间体验与客户端审核

当前 [macOS 审核应用](../artifacts/review/room-experience/OnlineBGClient.app)；退出旧客户端后直接打开。构建、定向检查及包内服务证据见 [校验记录](../artifacts/review/room-experience/verification.json)。界面、原生菜单、跨设备与连麦由人工验收。

## 实现入口

| 范围 | 唯一实现入口 |
| --- | --- |
| 首页入口与 AI 详情显示偏好 | [偏好](../src/client/preferences.ts)、[设置](../src/client/Settings.tsx)、[AI 状态](../src/client/ComputeStatus.tsx) |
| 加入／创建 | [大厅](../src/client/Lobby.tsx) |
| 远征存档维护 | [原生服务](../src-tauri/src/hosting.rs)、[HTTP 服务](../src/server/main.ts)、[存档条目](../src/client/expedition/RunShelf.tsx) |
| 快捷键录入与持久化 | [录入组件](../src/client/KeyBindingEditor.tsx)、[命令注册](../src/client/commands.ts)、[偏好提交](../src/client/use-preferences.ts)、[窗口回执](../src/client/native/windows.ts) |
| 平台菜单 | [菜单定义](../src/client/desktop-menu.json)、[原生菜单](../src-tauri/src/desktop.rs) |
| 对局结束入口 | [房间栏](../src/client/RoomToolbar.tsx)、[专注操作](../src/client/FocusControls.tsx)、[原站适配](../scripts/upstream-room-controls.mjs) |

## 手动审核

1. 大厅进入「跨网络联机」，默认只出现加入界面。切换「创建房间」后才出现游戏与人数；来回切换保留邀请链接与创建配置。
2. 设置 → 外观，分别隐藏首页快速上手和连麦入口，重启后仍保存。声音与语音中的配置入口始终保留。
3. 设置 → 快捷键，点击组合键，录入框获得焦点。Esc 只取消当前录入；Delete／Backspace 清除；清除与取消按钮同样有效。试录冲突组合，原绑定保留并显示错误。成功后关闭、重开设置并重启客户端，检查绑定仍在。输入聊天时不触发游戏命令。
4. 普通 AI 对局默认仅显示 AI 名称与决策状态；设置 → AI 计算开启「显示计算详情」后才显示数字。结束或换局后不残留上一局状态。
5. 在存有公网上远征记录的大厅放弃一条记录，不出现开房进度、公网地址或连接切换；失败时保留条目与错误。删除最后一条后显示紧凑空状态，页面不闪动。另一个正在使用的房间和邀请链接继续有效。
6. 房主在任意游戏进行中通过「结束对局」确认结束，回到原房间等待界面；专注模式保留同一操作。普通玩家、回放、未开始或已结束时不显示结束按钮。
7. macOS 检查应用、房间、对局、视图、设置与编辑操作菜单，当前不可用操作禁用；点击设置分类打开对应页，复制粘贴正常。快捷键录入中菜单不抢走按键。Windows 检查没有原生应用菜单栏，窗口控制与房间操作正常。

语音与变声的设备及真实通话审核见 [声音与输入](voice-effects-and-input.md)。清理结果见 [废纸篓记录](../artifacts/review/room-experience/cleanup-results.json)。
