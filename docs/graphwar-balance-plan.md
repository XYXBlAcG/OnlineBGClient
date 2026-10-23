# Graphwar 战术与互动

战斗、AI、预览和回放共用规则核心。数值与难度预算的唯一来源为 [平衡配置](../src/domain/graphwar/balance.ts)，基本接入见 [Graphwar](graphwar-plan.md)。

## 实现索引

| 职责 | 入口 |
| --- | --- |
| 地图规格、生命值、穿透、防御、人数与难度 | [平衡配置](../src/domain/graphwar/balance.ts) |
| 实际弹道弧长、直线距离与穿透衰减 | [伤害](../src/domain/graphwar/damage.ts) |
| 自适应采样、连续碰撞、爆炸与空间索引 | [弹道求解](../src/domain/graphwar/trajectory.ts) |
| 非对称掩体、随机部署与通路验证 | [地图生成](../src/domain/graphwar/map.ts) |
| 发射、移动、防御、轮换与长局裁决 | [规则](../src/domain/graphwar/rules.ts) |
| 有限精度瞄准、开路、友伤与反击评分 | [策略](../src/domain/graphwar/strategy.ts) |
| 席位边界与各游戏约束 | [游戏目录](../src/domain/catalogue.ts)、[协议](../src/domain/protocol.ts) |
| 规则版本与权威命中记录 | [回放](../src/domain/replay.ts)、[弹道记录](../src/domain/graphwar/types.ts) |
| 血条、伤害明细、操作与教学 | [牌桌](../src/client/graphwar/GraphwarTable.tsx)、[绘制](../src/client/graphwar/GraphwarBoard.tsx)、[引导](../src/client/graphwar/guide.ts) |
| 缩放、平移和当前士兵定位 | [地图视口](../src/client/MapViewport.tsx) |
| 预览开关与响应式菜单 | [共享控件](../src/client/ui/Controls.tsx)、[样式](../src/styles.css) |
| 视口级互动与牌桌可见范围 | [互动宿主](../src/client/Interactions.tsx)、[裁剪几何](../src/client/effect-viewport.ts) |

旧规则 Graphwar 记录保留，打开时提示使用对应版本客户端；不按新规则重新解释。关闭策略审核后不生成评分解释。实际飞行不另外加入随机命中修正，难度误差在候选公式生成时确定。

## 验证与手动审核

自动检查为模块、静态组件、真实 Worker 和服务协议检查，不启动浏览器或操作屏幕。

- [平衡不变量与地图](../tests/graphwar-balance.test.ts)：弧长、采样混叠、穿透、友伤、防御、移动、密集部署与通路。
- [AI](../tests/graphwar-ai.test.ts)：预算、可复现决策、关闭审核、真实线程取消和完整对局。
- [房间与回放](../tests/graphwar-room.test.ts)：多人边界、去重、计时、重连、恢复与旧规则记录提示。
- [服务协议](../tests/graphwar-network.test.ts)：真实 HTTP/WebSocket 与打包服务 AI。
- [互动范围](../tests/interaction-viewport.test.ts)、[牌桌结构](../tests/graphwar-ui.test.tsx)、[地图几何](../tests/map-view.test.ts)。

使用 [审核应用](review-and-submit.md#本地-macos-审核应用)，退出旧客户端并重启服务；手机刷新邀请页面。请手动检查：

1. 大厅及下一局配置中的预览开关横向排列，点击标签与键盘都可切换；关闭后没有虚线或预览计算。
2. 不同地图与兵力开局，士兵坐标分散，生命条可辨认；放大、拖动、适配窗口与“当前士兵”能定位战场。分别检查桌面、手机竖屏和横屏。
3. 比较直线、弧线与高频曲线的预计扣血；长绕行和连续穿透衰减，队友也会受伤，满血士兵不会被一击淘汰。
4. 移动消耗回合，不穿过中线、障碍或其他士兵；非法位置不提交。防御显示盾牌，受到一次攻击后消耗。
5. 比较三档 AI，审核开启时可查看瞄准点、评分和预算；关闭时没有策略解释。实际难度和乐趣由真人对局判断，离线耗时不代表胜率。
6. 发送鸡蛋、拖鞋和其他特效，检查不被牌桌裁剪、不遮挡操作；菜单不需横向滚动。切换游戏、缩放或滚动后没有残留碎片。
7. 同一房间切换游戏、重连、结束并播放回放；扣血与原局一致，回放没有行动按钮。旧规则记录提示版本差异且仍保留。

Windows、真实手机与跨网络操作待用户手动验收。

## 独立后续范围

据点、合作 Boss、有限弹药与共享补给未接入，需分别审核，复用现有伤害、行动与地形核心。

选兵、移动确认、指定士兵投掷与公平部署的入口和手动验收见 [牌桌与部署](graphwar-interaction-plan.md)。
