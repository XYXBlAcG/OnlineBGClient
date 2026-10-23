# Graphwar 牌桌与部署

保留函数对战规则和共享社交体系。数值与难度以 [平衡配置](../src/domain/graphwar/balance.ts) 为准；现有接入索引见 [Graphwar](graphwar-plan.md)。

## 实现入口

| 职责 | 唯一入口 |
| --- | --- |
| 自己士兵选择、紧凑操作栏、玩家状态与移动确认 | [牌桌](../src/client/graphwar/GraphwarTable.tsx) |
| 地图单位、选中光圈、血条和互动锚点 | [绘制](../src/client/graphwar/GraphwarBoard.tsx)、[共享头像](../src/client/AvatarSurface.tsx) |
| 范围、幽灵落点与路径 | [移动展示](../src/client/graphwar/MovementOverlay.tsx) |
| 移动合法性与拒绝原因 | [移动判定](../src/domain/graphwar/movement.ts) |
| 发射源归属、回合、生命值与首轮保护 | [动作类型](../src/domain/graphwar/types.ts)、[规则](../src/domain/graphwar/rules.ts)、[弹道](../src/domain/graphwar/trajectory.ts) |
| 非对称群落、随机半径、部署间距、通路和两侧覆盖率 | [生成器与质量检查](../src/domain/graphwar/map.ts) |
| 奇数人数补位与幂等配置 | [归一化](../src/domain/room-balance.ts)、[协议](../src/domain/protocol.ts) |
| 具体投掷起终点与身份校验 | [互动类型](../src/domain/social.ts)、[房间](../src/domain/room.ts) |
| 视口位置跟踪、飞行与命中碎片 | [共享特效宿主](../src/client/Interactions.tsx)、[运动路径](../src/client/effect-motion.ts) |
| 权威初始战场与实际选兵动作 | [回放](../src/domain/replay.ts)、[游戏选项](../src/domain/game-options.ts) |
| 多士兵候选与统一总预算 | [AI 策略](../src/domain/graphwar/strategy.ts) |
| 具体步骤和快捷键 | [引导](../src/client/graphwar/guide.ts)、[牌桌](../src/client/graphwar/GraphwarTable.tsx) |

地图生成参考 [Graphwar 原作](https://github.com/catabriga/graphwar/blob/master/src/GraphServer/GraphServer.java#L632) 的独立随机位置、高斯半径和拒绝碰撞部署；公平性由本客户端的检查与规则约束，不依赖镜像地形。旧规则录像保留，版本差异显示明确提示。

## 手动审核

使用 [当前审核应用](review-and-submit.md#本地-macos-审核应用)。退出旧客户端，重新启动公网服务并刷新手机链接。下列界面操作仅由用户执行：

1. 三名玩家创建 Graphwar，开局前能看见平衡补位 AI；调整其名称与难度。改成四名真人时自动移除补位；同房切换游戏不残留补位。
2. 依次点击自己地图上的不同士兵，选中光圈与预览起点同步；倒计时不重置。数字键切换自己的士兵，编辑聊天或函数时不抢键；不能控制队友。
3. 点击对方某一名士兵发送鸡蛋、拖鞋等特效：从自己刚选的士兵飞出，命中被点的那名士兵。两端看到相同起终点。缩放、拖动期间不跑向状态条，不挡住游戏点击；动画设置仍有效。
4. 点击移动，查看范围与绿色可达区域；悬停显示路径，触屏点选目的地。红色显示具体原因，非法目的地不能确认；确认才消耗回合，Escape 取消，方向键微调。
5. 检查玩家完整名字、血量、工具展开与房间菜单；数学键盘、伤害明细收起时地图有足够空间。分别检查桌面、手机竖屏和横屏。
6. 多次开局观察非镜像地形与分散部署，尝试最大兵力、大型地图和不同地形。首轮护阵在全部玩家各行动一次后撤除，AI、预览、实际结算与回放一致。
7. 结束并播放回放，检查发射起点、移动、血量和初始地图一致；重连、同房换游戏后无旧选兵或特效残留。

模块、静态组件与真实协议测试索引见 [战术测试](../tests/graphwar-tactics.test.ts)、[平衡测试](../tests/graphwar-balance.test.ts)、[服务](../tests/graphwar-network.test.ts)、[结构](../tests/graphwar-ui.test.tsx)。这些结果不代替真人难度、视觉与触控验收。语音和云端部署仍不在本轮范围。
