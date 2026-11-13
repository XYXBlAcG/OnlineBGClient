# 界面评审与 Xcode 联调

## 规则

任何面向用户的界面改动，必须先在可交互环境中由你亲自审核，审核通过后才能提交、合并或发布。未审核的界面改动不进入 commit，不触发 iOS 构建。

审核以真实操作为准：

- 点击、滑动、长按、横竖屏切换由你执行。
- 我负责启动预览、构建、安装、读取日志、截图和修改代码。
- 不使用浏览器自动化或桌面自动化代替你的触摸审核。

## 评审通道

| 通道                     | 用途                                              | 入口                                      |
| ------------------------ | ------------------------------------------------- | ----------------------------------------- |
| 浏览器 Native Shell 原型 | 快速确认布局、配色、卡片、手牌和动效              | `npm run dev` 后打开 `/?dev=native-shell` |
| Xcode Simulator          | 确认 SwiftUI 真实布局、安全区、原生控件、触感逻辑 | `ios-native/` 工程，DeviceHub 中手动操作  |
| 真机                     | 最终确认安全区、120Hz、触觉、键盘、性能和侧载     | 用户手动安装并执行                        |

## Xcode 27 工作流

Xcode 27 使用 `DeviceHub.app` 管理 Simulator，不再使用旧的 `Simulator.app`。

```sh
npm run native:preview
```

该命令会先构建 Web，把 `dist` 打进 App，再生成 Xcode 工程、选择 iOS 27.0 / iPhone 18 Pro Simulator、构建、安装并启动原型，同时打开 DeviceHub。App 内置只监听 `127.0.0.1:17878` 的静态服务器，单机游玩不依赖 Mac 上的开发服务器。运行时版本、设备名称和 UDID 以本机 `xcrun simctl list` 为准，不在文档里维护第二份。

## 真机安装与命令行启动

Xcode 27 的 Developer Disk Image 位于 `/Library/Developer/DeveloperDiskImages/iOS_DDI`。用以下命令确认 DDI 可用：

```sh
xcrun devicectl list preferredDDI --platform iOS
xcrun devicectl list devices
```

真机必须解锁、保持屏幕点亮、已信任这台 Mac；`State` 应为 `available`。`unavailable` 时先在手机上确认信任并重新插拔 USB。

签名构建（把 UDID 和 Team ID 换成实际值）：

```sh
cd ios-native
xcodegen generate
xcodebuild \
  -project OnlineBGShell.xcodeproj \
  -scheme OnlineBGShell \
  -configuration Debug \
  -destination 'platform=iOS,id=<DEVICE_UDID>' \
  -derivedDataPath .build-device \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM=<TEAM_ID> \
  build
```

安装：

```sh
idevice_id -l
ideviceinstaller -u <DEVICE_UDID> install \
  .build-device/Build/Products/Debug-iphoneos/OnlineBGShell.app
```

安装后在手机主屏打开 OnlineBG Shell。命令行启动需要与手机系统匹配的 Developer Disk Image；DDI 不匹配时直接在手机上点开即可。

真机可用后也可以直接用脚本完成签名构建、安装和尝试启动：

```sh
npm run native:device
```

脚本会先构建 Web、把 `dist` 打进 App，再用 `ideviceinstaller` 安装；默认使用本机 `DEVELOPMENT_TEAM`，可用 `DEVICE_UDID`、`DEVELOPMENT_TEAM` 覆盖。App 运行时不依赖 Mac；联机房间只向邀请链接里的房间服务发起连接。调试时可显式设置 `SHELL_BASE_URL` 覆盖内置本地服务器。

如果真机仍无法连接，直接在 Xcode 中打开 `ios-native/OnlineBGShell.xcodeproj`，选择你的 Team 和手机，由你手动 Run。

## 评审流程

1. 先做浏览器原型，确认视觉方向；需要原生布局时再做 SwiftUI。
2. 启动 DeviceHub 和原型 App，提供明确的复核页面和操作步骤。
3. 你手动审核；我根据反馈继续改，未通过前不 commit。
4. 你明确说“通过”后，再执行 `git add`、`git commit` 和后续构建。
5. 每次界面改动都重复此流程；不能以“已经编译通过”代替审核。
6. iOS Release 继续保持暂停，直到界面和真机验收都通过。

## 审核清单

- 灵动岛、状态栏、Home Indicator 和横屏安全区
- 首次进入牌桌的加载中状态，以及网络较慢时不会露出空白
- 横屏隐藏原生导航栏，悬浮返回按钮不遮挡关键操作，联机 Web 聊天按钮仍可用
- 本地牌桌不显示聊天；联机房间右下角 Web 聊天可打开、关闭和发送
- Web 错误横幅和确认改为 iOS 原生提示/确认，不再出现“请先结束对局再离开”
- 加入房间可选择玩家/旁观者；返回时由 Web 回传关闭结果再退出原生壳
- 设置页显示版本号和构建号；手机端不出现新手引导
- 秘塔远征显示“AI 朋友 / AI 能力”，职业/卡牌/地图图标不再出现彩色 emoji
- 秘塔远征开局可选剧情/标准/挑战难度，并实际影响远征
- 秘塔远征「玩家」「操作」「选择路线」抽屉能打开队伍、牌组/遗物、职业详情、托管和路线，横竖屏都不挡手牌
- 秘塔远征信息栏的生命、金币、能量、罗盘、誓约和深度徽章高度与字号统一
- 秘塔远征地图在手机横屏自动切换为从左到右的横屏布局；桌面可在路线面板切换横竖屏并保持选择
- 本地开局可选 1 名真人对多个 AI，AI 数量和难度生效
- 首页「继续远征」能列出本地/联机存档并恢复；AI 响应设置开局生效
- 进入和退出牌桌使用全屏过渡，底栏不突兀闪隐
- 44pt 触控目标、按钮间距和按下反馈
- 手牌高度、横滑、选牌、确认/取消
- 底部 Tab Bar、动作栏和底部抽屉
- 浅色/深色、减少动态效果
- 大厅卡片与桌面图标、封面、文案一致
- 原生控件是否真的比 Web 控件更清晰、更快
- 动画是否稳定，是否影响滚动和点击延迟

## 相关入口

- [Native Shell 原型](../ios-native/OnlineBGShell/)
- [浏览器手机预览](phone-preview.md)
- [手机牌桌审核](mobile-usability.md)
- [发布规范](release-workflow.md)
