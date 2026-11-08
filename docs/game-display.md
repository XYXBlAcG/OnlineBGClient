# 界面与牌桌显示

「设置 → 界面显示」同时提供界面字体、界面元素和牌桌元素三组缩放。

- 所有平台统一使用 SF Pro 界面字体与 PingFang SC 中文字体。macOS 直接使用系统字体；其他平台缺少字体时从 0.4.1 Release 的字体包下载并缓存到本机，不随应用安装包分发。
- 界面字体 90%–120%，默认 100%，影响正文、按钮、下拉菜单和输入框。
- 设置面板自身保持标准比例，不受界面字体和界面元素缩放影响，避免调整时设置窗口变形。
- 界面元素 100%–125%，默认 100%，影响控件高度、间距与常用界面元素。
- 牌桌元素只影响本机牌桌，范围由当前窗口和牌桌可用空间决定；大厅、聊天、设置与退出专注不跟随牌桌比例。
- 提供标准、舒适、大预设和恢复默认。偏好按显示配置保存。窗口缩小或聊天展开时，超出范围的牌桌偏好暂时收回，空间恢复后再使用保存值。

## 实现索引

- [显示比例应用](../src/client/display-scale.ts)、[偏好](../src/client/preferences.ts)
- [界面字体与控件尺寸令牌](../src/client/ui/design-tokens.css)、[字体加载](../src/client/fonts.tsx)、[字体下载](../src-tauri/src/fonts.rs)
- [牌桌比例与显示配置策略](../src/client/game-sizing/model.ts)
- [窗口、显示缩放与牌桌尺寸订阅](../src/client/game-sizing/GameSizing.tsx)
- [界面显示设置](../src/client/game-sizing/DisplaySettings.tsx)
- [统一牌桌应用](../src/client/OriginalGame.tsx)、[原生设置载荷](../src/client/native/contract.ts)
- [地图坐标与拖拽](../src/client/MapViewport.tsx)、[坐标比例](../src/client/map-view.ts)
- [比例策略测试](../tests/game-sizing.test.ts)、[多牌桌生命周期测试](../tests/game-sizing-lifecycle.test.tsx)

## 人工审核

在大屏麻将中放大牌桌，检查手牌、弃牌、动作按钮和详情；随后调整窗口、展开聊天、切换显示器与系统缩放，再退出重开。检查保存比例、当前范围和临时收回提示。再在大厅、设置、聊天、下拉菜单和输入框检查界面字体与元素缩放，确认无溢出、无遮挡。换到秘塔远征及其他游戏，检查点击、键盘、地图拖动、当前位置、表情投掷与退出房间。

原生设置窗口使用主牌桌的尺寸信息；回放窗口按自己的可用空间约束。真实系统绘制与鼠标／触屏命中需人工确认。
