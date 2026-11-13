# 秘塔远征

从大厅选择「秘塔远征」，确认远征难度和 N0–N10 阶位后进入房间配置；房主档案中的永久传承会自动带入，并对全队生效。地图显示节点、连线、罗盘消耗与队友投票，遭遇详情在抵达后查看。难度倍率见 [选项定义](../src/domain/expedition/adventure-types.ts)，已保存的远征按其记录的倍率继续。职业、主题地图与数值以代码为准，客户端与联机服务共用同一规则；连麦配置独立于游戏，不需要 LiveKit 即可游玩。

## 实现入口

| 内容                                     | 单一入口                                                                                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 职业、卡牌与说明                         | [内容注册](../src/domain/expedition/content.ts)、[效果类型](../src/domain/expedition/card-types.ts)、[职业卡池](../src/domain/expedition/extra-cards.ts)                                                           |
| 契刃客与骰术师职业牌                     | [契刃客卡池](../src/domain/expedition/covenant-cards.ts)、[骰术师卡池](../src/domain/expedition/dice-cards.ts)                                                                                                     |
| 多层主题与进阶                           | [主题](../src/domain/expedition/chapters.ts)                                                                                                                                                                       |
| 远征 N0–N10 阶位                         | [进阶规则](../src/domain/expedition/ascension.ts)                                                                                                                                                                  |
| 难度补偿与曲线校验                       | [难度补偿](../src/domain/expedition/adventure-types.ts)、[曲线校验](../scripts/verify-expedition-difficulty.mjs)                                                                                                  |
| 炮台、热量、蓄能、回响、祝福与骰子       | [资源规则](../src/domain/expedition/resources.ts)                                                                                                                                                                  |
| 多级强化与预览                           | [强化规则](../src/domain/expedition/content.ts)、[服务界面](../src/client/expedition/CardService.tsx)                                                                                                              |
| 旧存档读入                               | [迁移入口](../src/domain/expedition/migration.ts)、[房间恢复](../src/domain/room.ts)                                                                                                                               |
| 遗物、药水、敌人和奇遇                   | [世界内容](../src/domain/expedition/world.ts)                                                                                                                                                                      |
| 首领议程、阶段与机制文案                 | [首领机制](../src/domain/expedition/boss-mechanics.ts)                                                                                                                                                             |
| 敌人特性与触发数据                       | [敌人特性](../src/domain/expedition/enemy-traits.ts)                                                                                                                                                               |
| 战斗、意图和效果预览                     | [战斗执行器](../src/domain/expedition/rules.ts)                                                                                                                                                                    |
| 小兵孵化、爆裂与首领死亡继承             | [战斗执行器](../src/domain/expedition/rules.ts)                                                                                                                                                                    |
| 随机遭遇词条                             | [遭遇词条](../src/domain/expedition/modifiers.ts)                                                                                                                                                                  |
| 深渊裂隙支线层                           | [地图生成](../src/domain/expedition/map.ts)、[冒险推进](../src/domain/expedition/adventure.ts)                                                                                                                     |
| 节点资源变化、遗物获得、抢商店与 AI 队友 | [冒险推进](../src/domain/expedition/adventure.ts)、[遗物获得层](../src/client/expedition/RelicGainedOverlay.tsx)、[队友面板](../src/client/expedition/CompanionRoster.tsx)                                         |
| 开发态自动代理、断点与 AI 路线风格       | [演练逻辑](../src/domain/expedition/lab.ts)、[开发控制条](../src/client/expedition/DevExpeditionController.tsx)、[量化模型](../analysis/expedition-experience/model.ts)                                            |
| 废牌、永久诅咒与临时状态                 | [状态牌注册](../src/domain/expedition/status-cards.ts)                                                                                                                                                             |
| 路线原型与地图                           | [路线原型](../src/domain/expedition/route-profiles.ts)、[地图生成](../src/domain/expedition/map.ts)、[曲线布局](../src/client/expedition/map-layout.ts)、[选项与动作](../src/domain/expedition/adventure-types.ts) |
| 职业详情与完整职业牌池                   | [职业详情组件](../src/client/expedition/ProfessionDetail.tsx)                                                                                                                                                      |
| 个人奖励、商店、投票与冒险推进           | [冒险规则](../src/domain/expedition/adventure.ts)                                                                                                                                                                  |
| AI 评分、抽样和预算                      | [策略](../src/domain/expedition/ai.ts)                                                                                                                                                                             |
| 牌桌与自适应布局                         | [牌桌](../src/client/expedition/ExpeditionTable.tsx)、[样式](../src/client/expedition/table.css)                                                                                                                   |
| 可改键的牌桌命令                         | [命令上下文](../src/client/use-game-commands.tsx)、[快捷动作](../src/client/game-quick-actions.ts)                                                                                                                 |
| 引导与实时局面讲解                       | [引导](../src/client/expedition/guide.ts)、[局面](../src/client/guide-position.ts)                                                                                                                                 |
| 继续和放弃入口                           | [恢复抽屉](../src/client/lobby/ResumeDrawer.tsx)、[存档列表](../src/client/expedition/RunShelf.tsx)                                                                                                                |
| 权威存档与恢复身份                       | [房间](../src/domain/room.ts)、[网关](../src/domain/gateway.ts)、[SQLite](../src/server/storage.ts)、[本机存储](../src/client/storage.ts)                                                                          |
| 按需回放与检查点                         | [回放](../src/domain/replay.ts)、[后台取帧](../src/client/replay-worker.ts)                                                                                                                                        |

## 难度与阶位

旅途/标准/挑战由敌人属性倍率区分，标准与挑战附带开局补偿（生命、金币、幸运筹码、罗盘），挑战档 N0 保持可玩并随 N 阶下降；阶位惩罚与补偿逐级叠加。曲线不设硬性胜率数字，校验入口：`npm run verify:expedition-difficulty`（挑战档 N0 非零、标准/挑战随 N 递减）。

## 保存与继续

大厅的继续入口用于恢复远征。关闭房间或切换游戏前保留已确认的冒险进度；普通回放缓存与远征存档分别管理。

联机远征的权威存档位于房主电脑。由原房主恢复后，等待室显示原角色和当前接管人；加入者确认角色并准备，房主再开始继续。角色不通过昵称认领。仍在线的同一远征保持原连接身份，离线恢复时重新确认席位。

原房间正在玩其他游戏时，先关闭该房间，再从大厅继续远征。临时公网地址变化后，应分享新的邀请链接。放弃远征需要独立确认，不影响普通回放。

## 非界面验证

- 战斗与全部卡牌：[战斗测试](../tests/expedition.test.ts)、[经济与内容执行](../tests/expedition-economy.test.ts)。
- 首领议程、部件、阶段、孢子、根须与界面投影：[首领机制测试](../tests/expedition-boss-mechanics.test.tsx)。
- 小兵孵化、死亡爆裂、首领死亡连锁、跨层捷径、观星台与誓约碑：[扩展测试](../tests/expedition-expansion.test.tsx)。
- N0–N10 累积规则、多路地图、外侧走线与新遭遇词条：[阶位与地图测试](../tests/expedition-ascension-map.test.ts)、[敌人特性测试](../tests/expedition-enemy-traits.test.ts)。
- 封牌、沉默、抢夺、节点结算、反制遗物与新职业：[高级机制测试](../tests/expedition-advanced-mechanics.test.tsx)。
- 内容、地图与投影：[冒险测试](../tests/expedition-adventure.test.ts)。
- 并行窗口、去重、麻将回归和托管：[房间测试](../tests/expedition-room.test.ts)。
- 角色恢复、放弃与持久化：[恢复测试](../tests/expedition-save.test.ts)、[存储测试](../tests/expedition-storage.test.ts)。
- 三档策略与真实 CPU Worker：[策略](../tests/expedition-ai.test.ts)、[Worker](../tests/expedition-worker.test.ts)。
- 能力较强 AI 的真实 `decide` 完整对局与职业详情投影：[困难 AI 测试](../tests/expedition-hard-ai.test.ts)、[高级机制测试](../tests/expedition-advanced-mechanics.test.tsx)。
- 静态组件与动画事件：[组件](../tests/expedition-renderer.test.tsx)、[事件](../tests/game-motion-events.test.ts)。静态输出不证明界面尺寸、图层或触控正常。
- 固定种子首章基准：`npm run benchmark:expedition-chapter`；完整报告保留样本、策略、人数、结果与耗时。使用普通启发式、公开投影，不含搜索；小样本不代表真人胜率或平衡已完成。
- HTTP/WebSocket：先运行 `npm run server:build`，再运行 `npm run verify:expedition-chapter`；[脚本](../scripts/smoke-expedition.mjs)使用隔离临时数据库，结果记录并发、服务重启、新设备接管及永久放弃检查。

构建、包校验与自动更新入口见 [软件更新](updating.md)。

## 手动审核

客户端安装与公开下载见 [软件更新](updating.md)。退出旧客户端后安装；游戏无需填写 LiveKit。

1. 大厅建立秘塔远征，分别查看职业页的所有职业，检查手牌、头像、卡牌详情与浅色／深色显示。
2. 在大厅侧栏直接选择秘塔远征与麻将，确认不再出现开局弹窗；切换游戏、开始下一局和结束后重开都从统一房间入口进入。切换 N0–N10，核对放大的负面加成摘要；检查远征 AI 显示为“能力较弱／能力中等／能力较强”。进入战斗后检查 N 阶标识、遭遇词条、敌人特性、小兵成员、首领议程起点和敌人属性是否按阶位变化。
3. 战斗中选牌、选高亮目标、确认自身牌，查看敌方意图和出牌预览；用数字键、上下箭头、Enter、Esc 和 E，并在设置里改键。
4. 邀请手机加入，分别检查横竖屏、低高度窗口、聊天，以及多人同时出牌、全员结束、标记目标、暂停和托管。
5. 在路线、奇遇、营地、锻造所、商店、观星台、誓约碑、当铺、赌局、禁书库、追猎台、深渊裂隙、旅伴营地与遗物分配中确认选择；节点结束不再显示完整结算页，仅在获得新遗物时弹出遗物说明，点击任意位置关闭。顶栏在任意阶段常显生命、金币、罗盘，战斗阶段显示能量。检查开局至少三类独立路线、曲线不穿过节点、选中节点只高亮相关连接、分叉数量受控、罗盘消耗、反向环边、已探索节点仅通行、观星收益和誓约后的首领幼体；进入深渊裂隙后确认六行支线逐层推进、只在最后一行归位；关闭房间后从大厅继续，确认接管角色及行装未重置。
6. 开关增强游戏动画，检查命中、格挡、治疗与投掷落点；关闭策略审核后检查数据面板。回放检查播放、暂停、倍速和跳转。
7. 抽查所有首领战，核对机制面板、议程增长、阶段切换、部件受击与破碎反馈；检查失语圣像的封牌与封口、熔金暴君的夺金与贡赋，以及裂巢母兽的小兵孵化及首领死亡连锁消散。
8. 在缄默抄写员、禁言祭司、熔金税吏和遗物贪食者的战斗中确认废牌不可出、封口可由净化解除、赃金和赃物显示在敌人身上且击杀后归还；分别用断锁钳、静默耳塞、当票和赃物天平检查触发效果。
9. 在商店点击抢商店，确认进入 24 回合高难战斗；胜利后本店商品全为免费，当前地图与后续大层不再生成商店，原商店节点变为空节点。超时后确认老板带走全部商品、当前商店关闭但后续商店保留。检查活动遗物估值随节点、战斗和打牌数增长，并可在商店交易页按估值出售。分别招募易逝、限次和轮回队友，在战斗开始前选择上场或待命，确认阵亡、次数耗尽和复起规则。
10. 仅在 `npm run dev` 中使用牌桌内开发控制条，选择路线策略，在指定节点开始前或结算后停止并直接在正式地图、战斗和手牌界面接管；确认生产构建不包含开发标记。
11. 选择契刃客与骰术师，检查生命费用、骰子消耗、下一轮骰子补充、全部职业牌与浅深色牌面；展开职业详细信息，核对起始牌组、流派关键词和全部 24 张职业牌。

实际界面、截图、音效、Windows 与手机触控由用户手动验收；本轮不运行界面自动化。

专注模式、路线图与增强动效的界面验收见 [体验清单](expedition-experience.md)。

战斗意图、行装和卡牌升级／移除审核见 [显示与卡牌服务](expedition-presentation-plan.md)。

完整扩展范围与后续批次见[扩展方案](expedition-depth-plan.md)。

## 多层与卡牌审核

主题和已开放层数以[主题注册](../src/domain/expedition/chapters.ts)为准。每层首领之后先分配个人奖励，再到驿站选择进阶；全员完成后进入下一张地图。旧存档保留原路线和终点，新远征使用当前主题配置。桌面设置、连麦配置与其他游戏存档不参与远征迁移。

- 在营地或驿站精研中连续强化同一张牌，核对等级、前后牌面和实际出牌结果；达到收益上限后检查确认按钮。
- 分别在浅色、深色和手机横屏查看手牌、奖励、行装和强化界面；暂不可用的卡牌正文仍应清晰。
- 在首领奖励、驿站和下一层各关闭并恢复一次；检查牌组、进阶、幸运筹码及队友接管。确认切层不会创建新公网入口。
- 重选个人奖励应只扣本人筹码；重选奇遇需要全员同意。有人选择原奇遇选项时，不应扣取重选筹码。

规则验证：[多级强化](../tests/expedition-upgrades.test.ts)、[跨层与随机重选](../tests/expedition-chapters.test.ts)、[职业机制](../tests/expedition-mechanisms.test.ts)、[真实房间回放与恢复](../tests/expedition-depth-replay.test.ts)、[文字对比度](../tests/expedition-card-contrast.test.ts)。对比度与静态组件检查不替代人工界面验收。

多层固定种子基准：`node scripts/benchmark-expedition-depth.mjs`，可通过 `EXPEDITION_BENCHMARK_SEEDS` 指定每职业种子数；报告记录实际样本与来源指纹，不代表真人胜率。地图生成的定向检查覆盖每个已开放主题的固定种子。

## 投票与路线审核

[选项与历史票箱](../src/domain/expedition/ballot.ts)是地图、动作和裁决的共用描述来源；[地图](../src/client/expedition/ExpeditionMap.tsx)复用原节点图形，使用空间位置与站数区分同类节点；[逐人状态](../src/client/expedition/VoteStatus.tsx)显示姓名、座位和选择。先预览再确认投票，平票保留地图并提示裁决人；历史结果保留结算前票箱。

人工使用两处同类型节点检查：候选和地图能互相定位、本人改投、相同昵称、长名字、领队裁决、旁观者等待，以及事件／遗物／领取人投票。不得以测试通过代替界面与触控审核。[定向测试](../tests/expedition-ballot.test.tsx)。

地图交互入口：[地图](../src/client/expedition/ExpeditionMap.tsx)、[共享视窗](../src/client/MapViewport.tsx)、[缩放模型](../src/client/map-view.ts)。投票面板默认关闭，可独立开启并记住选择；节点直接选择、双击投票及键盘确认不依赖面板。横版初始显示可读局部，提供全图总览与返回局部；手动拖动/滚动后停止自动跟随，点当前位置恢复。节点字号跟随缩放，不由整图宽度决定。

战斗选牌支持再次点击取消，Esc 和取消按钮沿用合法动作；唯一自身目标可以直接确认。即时提示见 [提示组件](../src/client/expedition/ExpeditionHint.tsx)，可隐藏并记住本机选择，不增加正式课程。

定向检查：[地图与可读缩放](../tests/expedition-map-comfort.test.tsx)、[地图输出](../tests/expedition-map-renderer.test.tsx)、[曲线与命中坐标](../tests/route-links.test.ts)、[确认防重复](../tests/confirmed-choice.test.tsx)。地图拖动、动画、字号和实际手感由用户人工审核。

## 进阶机制与远征档案

开局选项：[ExpeditionOptionsControl](../src/client/expedition/ExpeditionOptionsControl.tsx)；规则入口：[advanced](../src/domain/expedition/advanced.ts) 与 [Adventure](../src/domain/expedition/adventure.ts)；AI 复用 [策略](../src/domain/expedition/ai.ts)。既有远征不自动开启进阶机制。

档案事实归并：[journal](../src/domain/expedition/journal.ts)；永久科技树与数值：[legacy](../src/domain/expedition/legacy.ts)；持久化、合并导入与导出：[ClientStore](../src/client/storage.ts)；大厅读取与购买：[use-expedition-journal](../src/client/expedition/use-expedition-journal.ts)、[档案面板](../src/client/expedition/ExpeditionJournalPanel.tsx)、[档案样式](../src/client/expedition/journal.css)。

档案现在包含四类信息：

- 总览：探索、通关、胜率、最深层、首领、职业/卡牌/遗物发现与最近远征。
- 传承：有前置依赖的永久科技树，消耗结算获得的秘塔学识；加成覆盖起始金币、最大生命、罗盘、幸运、营地恢复、开局药水和首次奖励重选。具体节点、价格和数值以 [legacy.ts](../src/domain/expedition/legacy.ts) 为唯一来源。
- 图鉴：全部职业、卡牌和遗物；未发现条目保留轮廓、类型和发现条件，不提前展示效果。
- 记录：每次远征的章节、胜负、N 阶、职业、首领和学识。

学识只在该远征结算时记录一次；旧格式 1 档案会自动迁移。联机远征使用房主档案的传承，对全队生效，传承写入房间配置并由服务器应用，客户端只负责展示和购买；移动端本地开局读取同一份档案。档案独立于回放缓存。

定向检查：[新机制与权威回放](../tests/expedition-advanced-batch.test.ts)、[发现与结算幂等](../tests/expedition-journal.test.ts)、[传承与学识](../tests/expedition-legacy.test.ts)、[档案迁移与合并](../tests/expedition-storage.test.ts)、[档案渲染](../tests/expedition-journal-renderer.test.tsx)。人工验收：打开远征档案，核对总览、科技树前置与购买、三类图鉴锁定态、记录详情和导入导出；进行一局远征，确认结算学识只增加一次；升级传承后开新局，检查开局金币/生命/罗盘/幸运/药水和首次奖励重选；联机确认房主传承全队生效。回看入口见[连续对局与回放](replay-series.md)。
