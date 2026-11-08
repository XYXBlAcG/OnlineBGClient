# 界面设计

当前视觉方向：暖纸桌面；以 0.2.1 无城市基线为范围，保留各游戏自身牌桌布局。

| 职责                                                    | 单一实现入口                                                                                                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 浅深主题、用户主题协议                                  | [主题](../src/client/themes.ts)                                                                                                                                 |
| 派生视觉角色、间距、圆角与动效时长                      | [设计变量](../src/client/ui/design-tokens.css)、[间距规范](spacing.md)                                                                                          |
| 牌桌材质、牌面层次与资源计数                            | [牌桌材质](../src/client/ui/table-material.css)                                                                                                                 |
| 选择、双击确认与提交状态                                | [确认控件](../src/client/ui/ConfirmedChoice.tsx)                                                                                                                |
| 快捷键与阶段生命周期                                    | [命令桥接](../src/client/use-game-commands.tsx)、[常用动作](../src/client/game-quick-actions.ts)                                                                |
| 按钮、失焦摘要字段、焦点缺口、单选胶囊与既有 Radix 控件 | [控件](../src/client/ui/Controls.tsx)、[设计变量](../src/client/ui/design-tokens.css)                                                                           |
| 字体角色、界面字体与控件尺寸                            | [设计变量](../src/client/ui/design-tokens.css)、[显示比例](../src/client/display-scale.ts)                                                                      |
| 界面字体、界面元素与牌桌元素设置                        | [界面显示](../src/client/game-sizing/DisplaySettings.tsx)                                                                                                       |
| 图形化新手引导、牌面示意、目标定位与规则折叠            | [新手引导](../src/client/BeginnerGuide.tsx)、[牌面示意](../src/client/GuideVisual.tsx)                                                                          |
| 独立练习场与本地教学 AI                                 | [练习场](../src/client/Practice.tsx)、[练习房间](../src/client/practice-room.ts)                                                                                |
| 远征行装抽屉与详情牌面                                  | [行装](../src/client/expedition/Inventory.tsx)、[远征样式](../src/client/expedition/table.css)                                                                  |
| 固定高度设置面板                                        | [设置样式](../src/client/ui/experience.css)                                                                                                                     |
| GraphWar MathLive 数学编辑与侧栏射击记录                | [数学编辑](../src/client/graphwar/MathFormulaField.tsx)、[牌桌](../src/client/graphwar/GraphwarTable.tsx)                                                       |
| 开发态手机房间                                          | [手机房间](../src/client/dev/PhoneRoom.tsx)、[尺寸与链接](../src/shared/phone-preview.ts)                                                                       |
| 游戏目录、搜索、收藏、常玩                              | [目录展示](../src/client/lobby/GameLibrary.tsx)，游戏数据仍取领域目录                                                                                           |
| 封面                                                    | [游戏封面](../src/client/lobby/GameCover.tsx)，复用既有游戏图标                                                                                                 |
| 人数、AI、游戏选项、创建和邀请                          | [大厅](../src/client/Lobby.tsx)                                                                                                                                 |
| 游戏操作菜单与快捷键                                    | [游戏操作](../src/client/GameCommands.tsx)                                                                                                                      |
| 房间侧栏与新手引导入口                                  | [房间工具栏](../src/client/RoomToolbar.tsx)                                                                                                                     |
| 飞行棋天气、公式条、落点与终点标记                      | [飞行状态](../src/client/flight/FlightSpecialPanel.tsx)、[棋盘覆盖层](../src/client/flight/FlightBoardOverlay.tsx)、[飞行样式](../src/client/flight/flight.css) |
| 稀有成就目录、软件统计、回放判定与本机成就库            | [成就领域](../src/domain/achievements.ts)、[本机存储](../src/client/storage.ts)、[进度接入](../src/client/app-progress.ts)                                      |
| 成就陈列室、解锁通知与连接状态                          | [成就界面](../src/client/Achievements.tsx)、[连接状态](../src/client/ConnectionStatus.tsx)、[成就样式](../src/client/achievements.css)                          |
| 头像投掷锚点与生命周期                                  | [定位](../src/client/effect-anchor.ts)、[互动](../src/client/Interactions.tsx)                                                                                  |
| 秘塔地图、侧边投票与节点图形                            | [地图](../src/client/expedition/ExpeditionMap.tsx)、[节点图形](../src/client/expedition/NodeSymbol.tsx)                                                         |
| 大厅布局与响应式                                        | [大厅样式](../src/client/lobby/lobby.css)                                                                                                                       |

头像、AI 参数与玩法选项按需展开；收起不销毁配置。创建与链接加入沿用现有协议。原有浅深外观选择、用户主题、自定义头像及对局设置保留。文本框失焦时显示「标签 · 值」，聚焦后标签上浮到焦点缺口，值进入输入框编辑；焦点轮廓在标签左右留出真实缺口，不使用色块盖线。默认控件 14px / 600 / 20px，正文 14px，辅助 12px，分组标题 16px；输入框使用独立 16px 字体角色，下拉触发器、选项和按钮共享同一字体角色。界面字体 90%–120%、界面元素 100%–125% 可按本机调整，牌桌元素单独设置。二值设置统一使用 Switch，多选列表保留 checkbox。玩法单选使用无描述、无图标、无小字的胶囊选项；除主操作与危险操作外，顶栏和房间菜单共用中性按钮样式，房间菜单只用间距分组。新手引导主屏只保留当前步骤标题、短目标、定位按钮、牌面示意和进度，长规则与策略折叠在「规则与提示」中，步骤卡与提示区之间固定留出间距。特殊模式按游戏模式追加课程；练习场复用房间的新手引导、侧栏槽位、焦点高亮与真实规则，教学 AI 动作不写入真实房间。引导目标按元素选择器定位，优先控制、单张牌/棋子/飞机、状态数字和同类叶子集合，不使用整张牌桌作为兜底。飞行棋风暴航线显示天气动画、本回合公式、预计落点、补给点与终点标记。折叠块展开高度、标题与内容间距按[间距规范](spacing.md)统一。远征行装使用右侧抽屉，手机为底部抽屉，详情牌面不再使用窄小固定尺寸。

人工审核：浅深大厅、搜索无结果、收藏与常玩、各游戏选中状态、AI 命名/难度/速度、真人与总席位、本地创建、邀请加入、公网创建、手机横竖屏及键盘焦点。八人等待室与高密度牌面仅在独立样板中评估视觉密度，不代表已改造真实等待室或游戏规则。

定向检查见[大厅设计](../tests/lobby-design.test.tsx)、[输入与联机](../tests/room-input.test.tsx)、[主题](../tests/themes.test.ts)及[手机操作](../tests/mobile-usability.test.tsx)。不执行浏览器或桌面界面自动化。

定向回归入口：[界面结构](../tests/ui-adjustments.test.tsx)、[投掷定位](../tests/interaction-anchor.test.ts)、[正式资源清单](../tests/release-assets.test.ts)。

信息按当前任务展示；详情留在规则、行装和设置入口。路线与动作列表支持单击选择、双击确认，键盘和触屏保留确认按钮。默认快捷键与当前阶段的命令从实现入口派生，可在设置中修改；自定义绑定不重置。

界面不添加解释性副标题或重复说明；标题、状态、数据和操作文案承担信息表达。

检查入口：[双击与重复提交](../tests/confirmed-choice.test.tsx)、[阶段命令](../tests/game-command-lifecycle.test.tsx)、[暖纸与地图](../tests/paper-table.test.tsx)。

地图连线几何与节点共享 [布局模型](../src/client/expedition/map-layout.ts)，边缘连接与局部图层由[连线检查](../tests/route-links.test.ts)覆盖。
