# 专注牌桌与远征体验

## 实现入口

| 功能 | 入口 |
| --- | --- |
| 专注启用条件与退出、聊天、本地玩家切换 | [显示策略](../src/client/focus-presentation.ts)、[控件](../src/client/FocusControls.tsx)、[应用接入](../src/main.tsx)、[布局](../src/client/ui/focus.css) |
| 变化宽度的首章路线、分叉汇合 | [地图规则](../src/domain/expedition/map.ts) |
| 节点几何与共享坐标 | [地图布局](../src/client/expedition/map-layout.ts) |
| 真实连线、队伍投票与当前位置 | [路线界面](../src/client/expedition/ExpeditionMap.tsx)、[共享地图视口](../src/client/MapViewport.tsx) |
| 地图固化与旧记录重放 | [回放](../src/domain/replay.ts)、[房间](../src/domain/room.ts)、[测试](../tests/expedition-map-replay.test.ts) |
| 真实卡牌飞行、敌方攻击、护盾与治疗 | [事件](../src/client/expedition/motion-events.ts)、[动画执行器](../src/client/motion/table-animator.ts) |
| 连续操作时的动效预算和目标移除清理 | [生命周期](../src/client/motion/motion-lifetime.ts)、[锚点](../src/client/motion/table-anchors.ts) |
| 滚动条与键盘滚动 | [滚动表面](../src/client/ui/scroll-surfaces.css)、[共享地图视口](../src/client/MapViewport.tsx) |
| 投掷时序、轨迹与并发清理 | [动作规划](../src/client/effect-motion.ts)、[交互执行](../src/client/Interactions.tsx) |
| 大厅游戏图标与远征存档留白 | [图标](../src/client/GameIcon.tsx)、[存档](../src/client/expedition/RunShelf.tsx) |
| 回合提示留白 | [社交样式](../src/client/ui/social-experience.css) |
| 语音设备、开关、电平与音量布局 | [设置](../src/client/voice/VoiceSettings.tsx)、[样式](../src/client/voice/voice.css) |

动画沿用「界面动画」与「游戏动画」独立设置；未开启增强游戏动画时保留基础表现。权威操作与数值不等待动画播放结束。

## 手动审核

当前审核包通过 [审核入口](review-and-submit.md) 获取。本节操作、截图与音质测试由用户亲自执行。

1. 桌面进入任意游戏，开启专注模式：应用顶栏、房间工具和引导区隐藏，牌桌获得高度；底部仍可退出专注、开关聊天。窗口原生标题栏保持系统行为。
2. 保持专注开关聊天，确认不会退出专注、不会挡住退出按钮；本地多人对局仍能切换玩家。结束对局后恢复普通界面。
3. 新开秘塔远征：路线有真实连线和不同节点数量。缩放、拖动，点击当前位置；可行路线高亮，投票姓名清楚。旧存档继续原地图，旧回放不按新算法重算路线。
4. 开启增强游戏动画，分别出攻击、防御、治疗与抽牌卡；检查卡牌飞行、敌人攻击来源、合并跳字及胜利反馈。连续出牌不等待动画；切阶段、滚动和改尺寸后没有飞到窗口角落的残影。
5. 关闭增强游戏动画并开启系统减少动态效果，分别检查基础表现与静态可读性。手机横竖屏检查地图、聊天和手牌。
6. 打开声音与语音：两个设备选择器宽度一致，耳返与降低提示音开关保持横向正常尺寸；测试麦克风时输入电平可读。配置与两端真实通话步骤见 [语音](client-voice.md#配置与实际连麦)。

7. 地图首尾层和六节点密集层检查：各节点、多人投票和路线完整；缩小、放大、当前位置后不出现空白终点。隐藏滚动条后，滚轮、移动地图、触摸拖动和聚焦地图后的方向键仍可操作。
8. 大厅检查秘塔远征与 Dominion 图标的浅深色对比；继续远征区左右留白与大厅对齐，窄窗下长姓名不挤出放弃按钮。
9. 增强动画下投掷鸡蛋、拖鞋、爱心与震惊表情：蓄力、飞行、命中和碎片衔接；Graphwar 从当前选中士兵飞向目标士兵。连续投掷、滚动、目标离场及切换游戏后无残留；关闭增强和减少动态效果分别复查。

本轮定向结构、布局几何和投掷时序检查见 [地图与社交测试](../tests/map-social-polish.test.tsx)。截图与实际 WebKit 绘制由用户手动验收。


非界面验证入口：[地图](../tests/expedition-adventure.test.ts)、[回放](../tests/expedition-map-replay.test.ts)、[静态路线](../tests/expedition-map-renderer.test.tsx)、[专注策略](../tests/focus-presentation.test.tsx)、[动效预算](../tests/motion-lifetime.test.ts)、[脱离锚点](../tests/table-anchor-detach.test.ts)、[语音控件](../tests/voice-settings-layout.test.ts)。
