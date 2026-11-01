# 房间派对扩展

## 范围

房间共享彩蛋币、财富折扣、分类商店、长时场景、游戏事件装扮、反制装备、离场与独立观众、竞猜、观众活动及回放。界面与实际设备上的效果由用户手动验收，不执行桌面或浏览器自动化。

使用入口和人工验收统一维护在[房间派对](room-party.md)。经济数值、商品内容、时长、分档和台词以[共享目录](../src/domain/party/catalogue.ts)和[领域模型](../src/domain/party/model.ts)为唯一配置源；文档不复制商品表。

## 领域边界

- [PartyLedger](../src/domain/party.ts)负责账户写入、收据、幂等、本局装备与跨局结算，快照只读。
- [竞猜池](../src/domain/party/predictions.ts)负责托管、窗口、锁定、取消与整数分奖；[游戏适配器](../src/domain/party/facts.ts)提供公开结果，房主不手填赢家。
- [观众活动](../src/domain/party/minigames.ts)复用账本，不改动主游戏胜负或规则。
- [Room](../src/domain/room.ts)负责独立观众身份、游戏权限、公开投影、生命周期、归档与回放事件。
- [PartyRuntime](../src/client/party/PartyRuntime.tsx)与[PixiJS 场景](../src/client/party/scene.ts)负责按绝对时间与稳定成员 ID 呈现事件。渲染器按需加载，闲置停止，屏幕刷新率与画质分别设置；游戏规则不依赖绘图能力。
- [回放时钟](../src/client/party/timeline.ts)统一处理暂停和速度，回放只呈现演出，不消费或改动语音配置。

本地和联机沿用同一领域实现及现有持久化适配器，不增加云端游戏服务。

## 插件工坊

[插件工坊](workshop.md)复用现有账本、商品定价、演出时钟与公开游戏事实，支持声明式配方的本地安装和房间同步。

自定义图片与音频素材、脚本执行、第三方在线目录和游戏规则插件属于后续扩展。可选 Apple emoji 资源包保持独立。

## 技术依据

- [PixiJS Ticker](https://pixijs.com/8.x/guides/components/ticker)：按显示刷新、停止空闲时钟及设置帧率上限。
- [Twitch Predictions](https://dev.twitch.tv/docs/api/predictions/)：竞猜窗口、奖池与结算分离的设计参考；经济规则由本项目定义。
- [Stream Avatars](https://www.streamavatars.com/)：观众共同活动的体验参考。
