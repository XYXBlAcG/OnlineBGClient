# 界面设计

当前视觉方向：暖纸桌面；以 0.2.1 无城市基线为范围，保留各游戏自身牌桌布局。

| 职责 | 单一实现入口 |
| --- | --- |
| 浅深主题、用户主题协议 | [主题](../src/client/themes.ts) |
| 派生视觉角色、间距、圆角与动效时长 | [设计变量](../src/client/ui/design-tokens.css) |
| 牌桌材质、牌面层次与资源计数 | [牌桌材质](../src/client/ui/table-material.css) |
| 选择、双击确认与提交状态 | [确认控件](../src/client/ui/ConfirmedChoice.tsx) |
| 快捷键与阶段生命周期 | [命令桥接](../src/client/use-game-commands.tsx)、[常用动作](../src/client/game-quick-actions.ts) |
| 按钮语义与既有 Radix 控件 | [控件](../src/client/ui/Controls.tsx) |
| 游戏目录、搜索、收藏、最近 | [目录展示](../src/client/lobby/GameLibrary.tsx)，游戏数据仍取领域目录 |
| 封面 | [游戏封面](../src/client/lobby/GameCover.tsx)，复用既有游戏图标 |
| 人数、AI、游戏选项、创建和邀请 | [大厅](../src/client/Lobby.tsx) |
| 游戏操作菜单与快捷键 | [游戏操作](../src/client/GameCommands.tsx) |
| 头像投掷锚点与生命周期 | [定位](../src/client/effect-anchor.ts)、[互动](../src/client/Interactions.tsx) |
| 秘塔地图、侧边投票与节点图形 | [地图](../src/client/expedition/ExpeditionMap.tsx)、[节点图形](../src/client/expedition/NodeSymbol.tsx) |
| 大厅布局与响应式 | [大厅样式](../src/client/lobby/lobby.css) |

头像、AI 参数与玩法选项按需展开；收起不销毁配置。创建与链接加入沿用现有协议。原有浅深外观选择、用户主题、自定义头像及对局设置保留。

人工审核：浅深大厅、搜索无结果、收藏与最近、各游戏选中状态、AI 命名/难度/速度、真人与总席位、本地创建、邀请加入、公网创建、手机横竖屏及键盘焦点。八人等待室与高密度牌面仅在独立样板中评估视觉密度，不代表已改造真实等待室或游戏规则。

定向检查见[大厅设计](../tests/lobby-design.test.tsx)、[输入与联机](../tests/room-input.test.tsx)、[主题](../tests/themes.test.ts)及[手机操作](../tests/mobile-usability.test.tsx)。不执行浏览器或桌面界面自动化。

定向回归入口：[界面结构](../tests/ui-adjustments.test.tsx)、[投掷定位](../tests/interaction-anchor.test.ts)、[正式资源清单](../tests/release-assets.test.ts)。

信息按当前任务展示；详情留在规则、行装和设置入口。路线与动作列表支持单击选择、双击确认，键盘和触屏保留确认按钮。默认快捷键与当前阶段的命令从实现入口派生，可在设置中修改；自定义绑定不重置。

检查入口：[双击与重复提交](../tests/confirmed-choice.test.tsx)、[阶段命令](../tests/game-command-lifecycle.test.tsx)、[暖纸与地图](../tests/paper-table.test.tsx)。

地图连线几何与节点共享 [布局模型](../src/client/expedition/map-layout.ts)，边缘连接与局部图层由[连线检查](../tests/route-links.test.ts)覆盖。
