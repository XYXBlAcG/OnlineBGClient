# 你画我猜、迷你高尔夫与共享画板

| 内容 | 实现入口 |
| --- | --- |
| 大厅人数、AI 和设备入口 | [游戏目录](../src/domain/catalogue.ts) |
| 你画我猜的题目、分数和可见性 | [回合规则](../src/domain/drawguess/rules.ts)、[共享画布](../src/client/fayu/FayuCanvas.tsx) |
| 画板工具面板 | [画板](../src/client/fayu/FayuCanvas.tsx)、[样式（右侧抽屉，不遮画布）](../src/client/fayu/fayu.css) |
| 共享画板 | [绘制与交互](../src/client/fayu/FayuCanvas.tsx)、[图层文档](../src/domain/drawguess/canvas-document.ts)、[图层合成](../src/client/fayu/canvas-surface.ts)、[填充 Worker](../src/client/fayu/canvas-fill-worker.ts)、[只读画作](../src/client/fayu/FayuDrawing.tsx)、[样式](../src/client/fayu/fayu.css) |
| 你画我猜玩法选项 | [选项控件](../src/client/drawguess/DrawModeControl.tsx)、[协议与校验](../src/domain/protocol.ts)、[绘图用时与题词来源](../src/domain/drawguess/rules.ts)、[测试](../tests/drawguess-options.test.ts) |
| 你画我猜房主词库 | [词条与内置词库](../src/domain/drawguess/words.ts)、[本机词库](../src/client/drawguess/library.ts)、[共用词库面板](../src/client/drawguess/WordLibraryWorkspace.tsx)、[预览词库](../src/client/drawguess/DrawWordPreview.tsx)、[设置入口](../src/client/drawguess/DrawingLibrariesSettings.tsx)、[启动同步](../src/domain/room.ts) |
| 法语模式（你画我猜子模式）无尽回合、句子模板与本机词库 | [模板](../src/domain/fayu/templates.ts)、[规则](../src/domain/fayu/rules.ts)、[客户端](../src/client/fayu/FayuTable.tsx)、[本机词库](../src/client/fayu/library.ts)、[内置词性池与动画词](../src/domain/fayu/words.ts) |
| 高尔夫球洞、推杆和击球动画 | [球场与物理](../src/domain/golf/physics.ts)、[规则](../src/domain/golf/rules.ts)、[2D 牌桌](../src/client/golf/GolfTable.tsx)、[3D 渲染](../src/client/golf/render3d/GolfScene3D.ts)、[地表网格](../src/client/golf/render3d/surface.ts)、[渲染切换](../src/client/golf/GolfGame.tsx) |
| 高尔夫随机球场 | [球场生成](../src/domain/golf/courses.ts)、[丘陵与坡度](../src/domain/golf/terrain.ts)、[地形与回放测试](../tests/golf-terrain.test.ts)、[生成测试](../tests/golf-courses.test.ts)、[避障与 AI](../src/domain/golf/routing.ts) |
| 高尔夫地形 | [高度场与坡度](../src/domain/golf/terrain.ts)（山地/丘陵/高原/盆地，尖顶山峰、C1 平滑过渡、发球台与球洞自动压平）、[滚动与摩擦物理](../src/domain/golf/physics.ts)、[地面与雪线渲染](../src/client/golf/render3d/surface.ts)、[滚动测试](../tests/golf-rolling.test.ts) |
| 台球/高尔夫环境 | [环境预设与回退](../src/client/scene3d/environment.ts)、[台球球房](../src/client/pool/render3d/PoolScene3D.ts) |
| 陪练、远征和回放 | [高尔夫 AI](../src/domain/golf/strategy.ts)、[远征短局](arcade.md)、[回放引擎](../src/domain/replay.ts) |
| 桌面和手机的牌桌尺寸 | [共享牌桌容器](../src/client/ui/PartyBoard.tsx)、[响应布局](../src/client/ui/party-games.css) |
| 画板确认与撤销 | [房间编辑历史](../src/domain/drawguess/canvas-history.ts)、[编辑事务](../src/domain/drawguess/game-rules.ts)、[本机草稿队列](../src/client/fayu/canvas-edits.ts)、[恢复与交卷测试](../tests/drawing-editor-recovery.test.ts)、[图层、套索与词库测试](../tests/drawing-batch-two.test.ts) |
| 法语模式回放与恢复 | [回合控制](../src/domain/room.ts)、[回放格式](../src/domain/replay.ts)、[存档加载](../src/server/storage.ts)、[旧记录转换](../src/domain/drawguess/legacy.ts)、[版本回归](../tests/draw-golf-archive.test.ts) |
| 定向回归 | [联机状态、回放与规则](../tests/party-new-games.test.ts)、[法语规则](../tests/fayu.test.ts)、[法语词库](../tests/fayu-library.test.ts)、[手机结构](../tests/mobile-usability.test.tsx) |

## 手动验收

1. 三名玩家进同一房间。从画手和猜词玩家分别检查画题权限与提示。分别尝试连续落笔、橡皮与撤销。一人断线后重新加入，确认画布、分数和当前画手正确。完成一局后在历史记录中跳转至不同回合。
2. 两人同时推杆，检查各自的方向、轨迹和杆数。用触屏从球上拉杆，试一杆反弹与一杆落水。第三洞分别走岔路两侧，切换全景与跟球，比较上下坡与侧坡滚动。完成五洞后打开回放。
3. 多游戏远征选择迷你高尔夫优先出现，关闭倒计时和行动上限。确认球进洞后稍等球路播完再结算。过渡检查见[场景过渡验收](selection-and-scene-transitions.md#人工验收)。
4. 两款游戏分别检查窗口放大缩小、手机横竖屏和沉浸模式。牌桌应使用可用宽度，画笔和球始终对准触点。高尔夫提交动作、等待 AI 或进洞后，球场与工具栏的位置保持稳定。
5. 高尔夫 3D：单击只改方向，按住球附近的拖动才蓄力；WASD 移动镜头、Q/E 绕目标旋转（跟球模式下同样有效）。设置 → 界面显示切换台球/高尔夫渲染、环境与 3D 画质（高/均衡/流畅）；桌面自动进入 3D，手机或 WebGL 不可用回退 2D。3D 高尔夫检查推杆、球路动画、洞/旗和 2D 回退按钮；台球检查球房/竞技环境切换。
6. 房间设置把玩法切到「法语」，开两席以上，两人分别导入本机词库并确认能生成自己的句子；同时作画时只看到自己的画布；猜句阶段拖动词块完成填空，检查 3 次上限、先猜中得分更高、投票与房主的下一轮/结束按钮。所有人提交后应立即进入作画，所有人点「画完了」应立即进入猜句。双人猜中或用完次数后马上结算；用观战房主开始下一轮，确认普通观众和首席玩家看不到房主操作。打开两轮历史回放，检查第二轮的起始累计分数、每人的句子和画布。
7. 在设置 → 数据切换经典和法语词库。修改一个系统词及别名，用原词与别名分别搜到它。勾选几条后批量停用，再恢复默认。试出一题，确认自定义词仍在。经典准备页检查「预览词库」和开局后的实际题词。
8. 在「更多工具」用套索横穿一条线，拖到画布边缘后撤销。用油漆桶填充闭合区域，隐藏边界图层后比较填充范围。在两个图层画笔或填充，尝试改名、排序、清空、删除和撤销。连续画几笔后立即交卷，确认猜句画面与回放都包含最后一笔。

## 词库来源

- 法语内置日常/专有/地点/形容词/动词/副词词池与动画词（专有名词单列，避免和普通名词混搭）见[词性池](../src/domain/fayu/words.ts)。
- 动画名词参考 [anime-words](https://github.com/taoky/anime-words)（Unlicense），已人工筛选；玩家本机词库通过 JSON 文件导入/导出。
