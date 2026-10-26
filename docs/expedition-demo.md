# 秘塔远征：独立战斗样板

此页仅记录独立离线样板。大厅中的正式首章、联机、AI 与冒险存档见 [秘塔远征](expedition.md)。样板内置报告只对应报告生成时的规则，不作为正式首章的平衡结论。

## 运行与审核

- `npm run demo:expedition`：生成可直接打开的 [HTML](../artifacts/demo/expedition/index.html)，不需要在线资源。
- 选择卡牌，再点击高亮目标。自身与全体效果再次点击卡牌或点击使用确认；两个角色都结束行动后进入敌方阶段。
- 数字键选牌，Enter 使用自身／全体效果，E 结束行动，Esc 取消选择。角色页签切换控制对象。
- “AI 执行一步”显示当前建议与理由；“自动试玩”连续完成战斗和奖励，可随时暂停。
- “数值与实测”查看规则数据，后台重测可取消；“出牌记录”查看本轮结算。
- 界面动画与增强游戏动画独立设置；支持浅色、深色、手机横竖屏。

## 单一信息源

| 内容 | 入口 |
| --- | --- |
| 卡牌、职业、敌人设计值 | [内容](../src/domain/expedition/content.ts) |
| 执行、预览、敌方意图 | [规则](../src/domain/expedition/rules.ts) |
| 三种策略及完整模拟 | [策略](../src/domain/expedition/strategy.ts) |
| 当前实测数据与运行环境 | [报告](../src/client/expedition/balance-report.json) |
| 基准生成 | [脚本](../scripts/benchmark-expedition.mjs)，`npm run benchmark:expedition` |
| 战斗界面与图形 | [界面](../src/client/expedition/ExpeditionDemo.tsx)、[场景](../src/client/expedition/BattleScene.tsx) |
| 单元验证 | [测试](../tests/expedition.test.ts)，`npx vitest run tests/expedition.test.ts` |
| 隔离浏览器验证 | [脚本](../scripts/verify-expedition-demo.mjs)，`npm run verify:expedition`；非默认浏览器位置使用 `CHROME_PATH` |
| 实际渲染截图与几何记录 | [截图目录](../artifacts/demo/expedition/screenshots/) |

基准分别使用共同种子组和独立复核组。平均剩余生命包含失败局；实际格挡仅计吸收的伤害；批次耗时包含规则模拟及决策。启发式策略不读取未来抽牌顺序。数据仅描述本 Demo 的自动策略表现，不代表真人胜率或原作平衡。浏览器重测使用本机 Worker，耗时与 Node 环境报告分开呈现。

隔离浏览器检查不等同于原生 WebView、手机真机触控与用户体验验收，后者由用户手动完成。
