# 台球

支持 8 球与 9 球，两席对局可由 AI 补足。2D 与 3D 共用规则、击球录像和输入状态；3D 不可用时回到 2D。桌面端在设置中选择渲染方式。

## 使用

大厅或房间的游戏配置中选择玩法与击球时限。移动鼠标瞄准，按住并向后拖动蓄力，松开发射；自由球时先放置白球。控制区可切换高低杆、左右塞、杆身角度、轨迹预览和视角。新手引导入口复用牌桌引导。

联机由服务端计算击球，所有玩家播放同一份录像；播放期间等待下一杆，计时从播放结束后开始。规则采用休闲模式，具体判罚以 [PoolRules](../src/domain/pool/rules.ts) 为唯一实现来源：8 球清完己方球组后打进 8 号获胜，同一杆打进最后一颗组球与 8 号按休闲规则计胜；台面未分色但一方球组已清空时打进 8 号同样计胜。分色后台桌标题显示双方球组，鼠标悬停球体显示球号（2D/3D）。9 球犯规进袋的复位参考 [WPA 规则](https://www.wpapool.com/wp-content/uploads/2026/01/2026.01.02-WPA-Rules.pdf)。

## 实现索引

- [目录与人数](../src/domain/catalogue.ts)、[配置与动作类型](../src/domain/pool/types.ts)、[规则](../src/domain/pool/rules.ts)。
- [几何、摆球与复位](../src/domain/pool/table.ts)、[物理](../src/domain/pool/physics.ts)、[AI](../src/domain/pool/strategy.ts)。
- [共享牌桌](../src/client/pool/PoolGame.tsx)、[操作](../src/client/pool/use-pool-aim.ts)、[播放](../src/client/pool/use-pool-playback.ts)、[3D 场景](../src/client/pool/render3d/PoolScene3D.ts)。
- [回放](../src/domain/replay.ts)、[房间调度](../src/domain/room.ts)、[规则适配器](../src/domain/plugin.ts)。
- 设计背景：[3D](pool-3d-plan.md)、[物理](pool-3d-physics-plan.md)；运行行为以源码为准。

## 验收

自动检查：`tests/pool-*.test.*`，包括大厅玩法选项、模式传递、犯规复位、播放等待、物理、多候选局面的三档 AI 与真实 Worker、录像与恢复、共享交互、3D 资源释放；[真实双端测试](../tests/pool-network.test.ts)验证相同击球录像与回合时限。

人工检查：8 球与 9 球分别开局，切换 2D/3D，查看球号、光照、自由球落点、瞄准、拖动蓄力与各种杆法；观察自己、好友与 AI 的完整击球动画。检查超时、犯规、终局、退出、回放和重新打开存档。低高度窗口、聊天展开和浅深色主题均应保留可操作空间。实际手感、GPU 表现与跨设备界面由用户手动验收。
