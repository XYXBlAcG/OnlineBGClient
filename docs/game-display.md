# 游戏元素大小

在「设置 → 游戏显示」调整本机牌桌中的元素比例；大厅、聊天、设置与退出专注等公共操作保持原尺寸。地图自身的缩放仍用于浏览棋盘，与元素比例独立。

偏好按显示配置保存，显示配置包含屏幕逻辑尺寸与系统像素比。当前窗口和牌桌可用空间决定可调范围；窗口缩小或聊天展开时，超出范围的偏好暂时收回，空间恢复后再使用保存值。

## 实现索引

- [比例与显示配置策略](../src/client/game-sizing/model.ts)
- [窗口、显示缩放与牌桌尺寸订阅](../src/client/game-sizing/GameSizing.tsx)
- [设置控件](../src/client/game-sizing/GameSizeSettings.tsx)、[偏好](../src/client/preferences.ts)
- [统一牌桌应用](../src/client/OriginalGame.tsx)、[原生设置载荷](../src/client/native/contract.ts)
- [地图坐标与拖拽](../src/client/MapViewport.tsx)、[坐标比例](../src/client/map-view.ts)
- [比例策略测试](../tests/game-sizing.test.ts)、[多牌桌生命周期测试](../tests/game-sizing-lifecycle.test.tsx)

## 人工审核

在大屏麻将中放大，检查手牌、弃牌、动作按钮和详情；随后调整窗口、展开聊天、切换显示器与系统缩放，再退出重开。检查保存比例、当前范围和临时收回提示。换到秘塔远征及其他游戏，检查点击、键盘、地图拖动、当前位置、表情投掷与退出房间。

原生设置窗口使用主牌桌的尺寸信息；回放窗口按自己的可用空间约束。真实系统绘制与鼠标／触屏命中需人工确认。
