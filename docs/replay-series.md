# 连续对局与回放

回放入口为 [Records](../src/client/Records.tsx)。同一房间记录按开局时间组成 [播放列表](../src/client/replay-playlist.ts)，支持上一局、下一局和可选连播；最后一局结束后停止，不循环、不跳入其他房间。速度与视角在换局时保留，视角超出新局人数时收敛。

[下一局控件](../src/client/RoundContinuation.tsx) 使用现有 [准备状态](../src/client/room-readiness.ts) 和房间开始命令，不重建公网入口。未准备或离线时禁用开始，并显示等待对象。

检查：[播放列表](../tests/replay-playlist.test.ts)、[准备控件](../tests/round-continuation.test.tsx)。

人工审核：同房间保存三局，选择最早一局连播；核对暂停、调速、拖动、切换视角、前后局切换及最后停止。切换视角不显示旧视角画面，定位时保留当前可展示画面。真人取消准备后，房主应看到等待原因；准备后可直接进入下一局，邀请链接和聊天保留。

## 聚会队列与远征回看

队列入口：[PartyQueue](../src/client/PartyQueue.tsx)，换局复用 [RoomSetup](../src/client/RoomSetup.tsx)。房间菜单可规划后续游戏，结算页可确认队首席位；队列由 [Room](../src/domain/room.ts) 持久化，以版本号拒绝过期写入。未继续占座的真人转为旁观，保留身份与连接。

远征按记录中的 runId 关联连播；[时间轴](../src/domain/replay-timeline.ts)在 [Worker](../src/client/replay-worker.ts) 中分批从规则回放派生。章节、节点和关键选择可跳转；个人书签由 [ClientStore](../src/client/storage.ts) 保存，随对应记录删除。时间轴不调用 AI。

检查：[队列与席位](../tests/room-queue.test.ts)、[时间轴、书签与档案隔离](../tests/replay-timeline-notes.test.ts)、[跨房间远征关联](../tests/replay-playlist.test.ts)、[真实双端同步与旁观聊天](../tests/room-queue-network.test.ts)。人工检查多人同步、换局席位确认、章节跳转、连续播放、书签重启后保留。
