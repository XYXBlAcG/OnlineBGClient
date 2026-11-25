# 你画我猜、迷你高尔夫与共享画板

| 内容 | 实现入口 |
| --- | --- |
| 大厅人数、AI 和设备入口 | [游戏目录](../src/domain/catalogue.ts) |
| 你画我猜的题目、分数和可见性 | [回合规则](../src/domain/drawguess/rules.ts)、[共享画布](../src/client/fayu/FayuCanvas.tsx) |
| 共享画板 | [绘制与交互](../src/client/fayu/FayuCanvas.tsx)、[平滑与图层遮罩渲染](../src/client/fayu/FayuDrawing.tsx)、[样式](../src/client/fayu/fayu.css) |
| 你画我猜房主词库 | [词条与内置词库](../src/domain/drawguess/words.ts)、[本机词库](../src/client/drawguess/library.ts)、[设置入口](../src/client/drawguess/DrawingLibrariesSettings.tsx)、[启动同步](../src/domain/room.ts) |
| 法语模式（你画我猜子模式）无尽回合、句子模板与本机词库 | [模板](../src/domain/fayu/templates.ts)、[规则](../src/domain/fayu/rules.ts)、[客户端](../src/client/fayu/FayuTable.tsx)、[本机词库](../src/client/fayu/library.ts)、[内置词性池与动画词](../src/domain/fayu/words.ts) |
| 高尔夫球洞、推杆和击球动画 | [球场与物理](../src/domain/golf/physics.ts)、[规则](../src/domain/golf/rules.ts)、[2D 牌桌](../src/client/golf/GolfTable.tsx)、[3D 渲染](../src/client/golf/render3d/GolfScene3D.ts)、[地表网格](../src/client/golf/render3d/surface.ts)、[渲染切换](../src/client/golf/GolfGame.tsx) |
| 高尔夫随机球场 | [球场生成](../src/domain/golf/courses.ts)、[丘陵与坡度](../src/domain/golf/terrain.ts)、[地形与回放测试](../tests/golf-terrain.test.ts)、[生成测试](../tests/golf-courses.test.ts)、[避障与 AI](../src/domain/golf/routing.ts) |
| 台球/高尔夫环境 | [环境预设与回退](../src/client/scene3d/environment.ts)、[台球球房](../src/client/pool/render3d/PoolScene3D.ts) |
| 陪练、远征和回放 | [高尔夫 AI](../src/domain/golf/strategy.ts)、[远征短局](arcade.md)、[回放引擎](../src/domain/replay.ts) |
| 桌面和手机的牌桌尺寸 | [共享牌桌容器](../src/client/ui/PartyBoard.tsx)、[响应布局](../src/client/ui/party-games.css) |
| 画板确认与撤销 | [房间编辑历史](../src/domain/drawguess/canvas-history.ts)、[编辑队列](../src/client/fayu/canvas-edits.ts)、[定向测试](../tests/canvas-edits.test.ts) |
| 法语模式回放与恢复 | [回合控制](../src/domain/room.ts)、[回放格式](../src/domain/replay.ts)、[存档加载](../src/server/storage.ts)、[旧记录转换](../src/domain/drawguess/legacy.ts)、[版本回归](../tests/draw-golf-archive.test.ts) |
| 定向回归 | [联机状态、回放与规则](../tests/party-new-games.test.ts)、[法语规则](../tests/fayu.test.ts)、[法语词库](../tests/fayu-library.test.ts)、[手机结构](../tests/mobile-usability.test.tsx) |

## 手动验收

1. 三名玩家进同一房间。从画手和猜词玩家分别检查画题权限与提示。分别尝试连续落笔、橡皮与撤销。一人断线后重新加入，确认画布、分数和当前画手正确。完成一局后在历史记录中跳转至不同回合。
2. 两人同时推杆，检查各自的方向、轨迹和杆数。用触屏从球上拉杆，试一杆反弹与一杆落水。第三洞分别走岔路两侧，切换全景与跟球，比较上下坡与侧坡滚动。完成五洞后打开回放。
3. 多游戏远征选择迷你高尔夫优先出现，关闭倒计时和行动上限。确认球进洞后稍等球路播完再结算。过渡检查见[场景过渡验收](selection-and-scene-transitions.md#人工验收)。
4. 两款游戏分别检查窗口放大缩小、手机横竖屏和沉浸模式。牌桌应使用可用宽度，画笔和球始终对准触点。高尔夫提交动作、等待 AI 或进洞后，球场与工具栏的位置保持稳定。
5. 设置 → 界面显示切换台球/高尔夫渲染、环境与 3D 画质（高/均衡/流畅）；桌面自动进入 3D，手机或 WebGL 不可用回退 2D。3D 高尔夫检查推杆、球路动画、洞/旗和 2D 回退按钮；台球检查球房/竞技环境切换。
6. 房间设置把玩法切到「法语」，开两席以上，两人分别导入本机词库并确认能生成自己的句子；同时作画时只看到自己的画布；猜句阶段拖动词块完成填空，检查 3 次上限、先猜中得分更高、投票与房主的下一轮/结束按钮。所有人提交后应立即进入作画，所有人点「画完了」应立即进入猜句。双人猜中或用完次数后马上结算；用观战房主开始下一轮，确认普通观众和首席玩家看不到房主操作。打开两轮历史回放，检查第二轮的起始累计分数、每人的句子和画布。
7. 你画我猜房主在设置 → 数据维护词库后，准备页应显示本局自定义词数；开局后自定义词进入词库，猜词者 snapshot 不应包含完整词库。导出 TXT 再导入应保留分类。
8. 法语画板检查油漆桶、套索移动/删除、图层增删/重命名/贴纸、撤销/重做；连续画几笔后立即提交，确认猜句与回放都包含最后一笔。在第四、五层分别画笔或填充，清空第五层后撤销、重做，确认第四层完整保留。

## 词库来源

- 法语内置日常/专有/地点/形容词/动词/副词词池与动画词（专有名词单列，避免和普通名词混搭）见[词性池](../src/domain/fayu/words.ts)。
- 动画名词参考 [anime-words](https://github.com/taoky/anime-words)（Unlicense），已人工筛选；玩家本机词库通过 JSON 文件导入/导出。
