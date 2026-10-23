# Graphwar

普通函数双队对战，接入现有大厅、房间、联机、AI、聊天、头像互动、引导、回放与主题。玩法和地图选项以 [类型目录](../src/domain/graphwar/types.ts) 为准；一阶、二阶微分方程尚未接入，不与原作服务器互通。

## 实现索引

| 职责 | 唯一入口 |
| --- | --- |
| 注册、人数与能力 | [游戏目录](../src/domain/catalogue.ts) |
| 选项、动作、弹道记录 | [类型与校验](../src/domain/graphwar/types.ts)、[动作](../src/domain/actions.ts) |
| 有界标量表达式与原作 log/ln 语义 | [表达式](../src/domain/graphwar/expression.ts) |
| 坐标镜像、平移、连续碰撞、爆破 | [轨迹](../src/domain/graphwar/trajectory.ts) |
| 随机地图、通路与部署 | [地图](../src/domain/graphwar/map.ts) |
| 生命值、弧长伤害与战术参数 | [平衡](../src/domain/graphwar/balance.ts)、[伤害](../src/domain/graphwar/damage.ts) |
| 士兵轮换、移动、防御、友伤与胜负 | [规则](../src/domain/graphwar/rules.ts) |
| 可复用游戏配置与延时结算契约 | [选项](../src/domain/game-options.ts)、[插件](../src/domain/plugin.ts)、[引擎](../src/domain/engine.ts) |
| 计时、去重、暂停与恢复 | [房间](../src/domain/room.ts)、[协议](../src/domain/protocol.ts) |
| 权威弹道保存与只读重放 | [回放](../src/domain/replay.ts) |
| 三档候选搜索、友伤与开路评分 | [策略](../src/domain/graphwar/strategy.ts)、[CPU 工作线程](../src/domain/compute.ts) |
| 游戏选项 | [共享控件](../src/client/graphwar/GraphwarOptionsControl.tsx) |
| 战场、数学键盘、模板与本机历史 | [牌桌](../src/client/graphwar/GraphwarTable.tsx)、[历史](../src/client/graphwar/formula-history.ts) |
| 士兵头像、单位选择与精确互动落点 | [共享头像](../src/client/AvatarSurface.tsx)、[牌桌](../src/client/graphwar/GraphwarTable.tsx) |
| Canvas 动画、主题与播放控制 | [战场表现](../src/client/graphwar/GraphwarBoard.tsx) |
| 防抖、过期取消与预览预算 | [预览](../src/client/graphwar/use-preview.ts)、[Worker](../src/client/graphwar/preview-worker.ts) |
| 桌面、竖屏与横屏 | [基础样式](../src/client/graphwar/graphwar.css)、[共享横屏](../src/client/ui/mobile-landscape.css) |
| 结合坐标、士兵、输入框和障碍的引导 | [教学内容](../src/client/graphwar/guide.ts)、[定位](../src/client/guide-targets.ts) |

参考 [原作教程](https://www.graphwar.com/tutorial.html) 和 [原作源码](https://github.com/catabriga/graphwar)；地图生成、数学输入区及扩展玩法由本客户端实现。空间索引采用 RBush（[许可证](../public/licenses/rbush-LICENSE.txt)、[quickselect](../public/licenses/quickselect-LICENSE.txt)）。表达式解析采用 mathjs 的数值入口，使用允许的表达式节点构造标量计算，不加载符号计算流程。[许可证](../public/licenses/mathjs-LICENSE.txt)、[NOTICE](../public/licenses/mathjs-NOTICE.txt)。

## 验证入口

- [规则与边界](../tests/graphwar-rules.test.ts)：平移、镜像、语法、友伤、多目标命中、窄障碍、爆破与有界对局。
- [房间](../tests/graphwar-room.test.ts)：选项、超时、重复动作、重连、恢复、切换与权威弹道回放。
- [AI](../tests/graphwar-ai.test.ts)：合法命中、关闭审核、真实 CPU Worker、一致性、取消与完整障碍对局。
- [结构与历史](../tests/graphwar-ui.test.tsx)：实际组件静态输出、只读回放、引导目标和历史数据边界，不等同于界面验收。
- [真实服务](../tests/graphwar-network.test.ts)：启动临时本机 HTTP/WebSocket 服务，用两个协议客户端验证同步、去重与回放，不启动或操作浏览器。

## 手动验收

使用 [当前 macOS 审核应用](review-and-submit.md#本地-macos-审核应用)。新协议需要退出旧客户端、重启公网服务并刷新手机页面。

1. 大厅选择 Graphwar，以一名真人和一名 AI 开局；检查蓝橙分队、当前士兵高亮、倒计时与双方剩余兵力。再以多人配置检查头像是否可互动、名字能否识别。
2. 先选开阔战场，比较 `0.2*x` 和 `0.2*x+10` 的预览；两者应重合。输入 `sin(` 应禁止发射；输入 `sqrt(x)` 可以发射，但负半轴起点会提前终止。
3. 用数学键盘插入符号，选择模板、编辑函数、按 Enter 发射；输入法候选确认不能误发射。连点发射不重复出招，网络失败后可重新操作。
4. 检查经典、爆破开路与精准狙击在浮岛、堡垒地图中的效果；灰色实体阻挡弹道，爆破后的缺口可再次穿过，友军也会受伤。
5. 房主关闭弹道预览后，所有玩家都不能显示虚线；本机切换预览与主题时不要发出游戏动作。分别检查浅色、深色、系统主题。
6. 开关游戏增强动画，检查逐段弹道、发光与爆破；基线模式使用简洁弹道。查看回放，暂停、调速、拖动进度，不能出现发射或结束游戏操作。
7. 用真实手机通过邀请链接加入，分别检查竖屏、横屏、沉浸模式、系统键盘与数学键盘；输入与聊天不能挡住发射按钮。退出手机页面后对局暂停，重连获得新的完整回合时间。
8. 在同一房间切换到其他游戏再切回，检查成员身份保留、旧预览和旧 AI 任务不覆盖新局。开启新手引导，分别定位当前士兵、坐标轴、输入框和障碍。

Windows 11、真实手机、跨网络操作与视觉效果待用户手动审核；本地构建和协议测试不替代这些验收。

生命值、弧长伤害、地图与互动的实现入口及手动审核见 [战术与互动](graphwar-balance-plan.md)。

选择发射点、移动确认、非对称地形与补位验收见 [牌桌与部署](graphwar-interaction-plan.md)。
