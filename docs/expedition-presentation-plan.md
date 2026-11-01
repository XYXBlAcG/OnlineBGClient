# 秘塔远征显示与自建服务

## 实现索引

| 内容 | 唯一入口 |
| --- | --- |
| 战斗角色、敌方意图与紧凑展示 | [战斗场景](../src/client/expedition/BattleScene.tsx)、[展示模型](../src/client/expedition/presentation.ts)、[牌桌样式](../src/client/expedition/table.css) |
| 队友手牌、牌堆与遗物 | [行装](../src/client/expedition/Inventory.tsx) |
| 卡牌显示、详情与美术 | [卡牌](../src/client/expedition/ExpeditionCard.tsx) |
| 升级与移除选择、效果对比及确认 | [卡牌服务](../src/client/expedition/CardService.tsx)、[展示模型](../src/client/expedition/presentation.ts) |
| 营地与商店入口 | [节点界面](../src/client/expedition/CardNodes.tsx)、[牌桌](../src/client/expedition/ExpeditionTable.tsx) |
| 服务价格、牌组限制与恢复 | [规则常量](../src/domain/expedition/card-services.ts)、[冒险执行](../src/domain/expedition/adventure.ts) |
| 蓄力、出击与命中 | [动作帧](../src/client/motion/effect-gesture.ts)、[动画执行](../src/client/motion/table-animator.ts) |
| 本机元素比例 | [游戏显示](game-display.md) |

## 人工审核

界面操作和截图由用户执行。审核包交付 `.app`，提交与推送另行授权。

1. 在 1280×720、1024×600、390×844 和 844×390 检查四人战斗、最长敌方意图、多个状态与打开聊天；敌方下一步行动保持可读，紧凑条可展开各目标的伤害。
2. 打开队友行装，切换手牌、牌堆、遗物并点选卡牌；检查详情、返回和关闭后原先选牌状态。抽牌堆显示组成，不显示抽取顺序。
3. 营地升级查看原牌和升级牌，商店移除查看完整效果、费用和剩余牌数；先选牌再确认。另一端更新金币或阶段后，旧选择不得继续提交。
4. 分别检查浅深主题、增强游戏动画开关、减少动态效果，以及连续出牌、敌方攻击、格挡和治疗；动作不阻塞操作或残留。

非界面测试：[展示](../tests/expedition-presentation.test.tsx)、[真实规则与卡牌服务](../tests/expedition-card-service.test.tsx)、[动作](../tests/expedition-gesture.test.ts)、[经济执行](../tests/expedition-economy.test.ts)。

## 自建服务：后续阶段

现有基础见 [联机运行](network.md)、[服务入口](../src/server/main.ts)、[网关](../src/domain/gateway.ts)、[存储](../src/server/storage.ts)与 [Dockerfile](../Dockerfile)。已有多房间和持久化；现有席位令牌不代表服务器账号认证。

建议首发面向 Linux 的 Docker Compose 包，包含配置示例、持久化卷、健康检查及启动入口；镜像覆盖 amd64、arm64。裸机 Node 包作为后续选择，避免首先维护多个系统安装器。游戏服务与 LiveKit 仍独立。

玩家连接服务器地址并登录后，可创建房间或输入该服务器内的短房间号加入。邀请链接保留；临时公网房间继续使用现有入口。服务器接入作为独立连接方式，避免让房间号脱离服务器地址。

认证采用管理员邀请开通、禁用公开注册。账户身份与房间席位分离，建立身份和席位的服务端关联；可撤销会话、禁用账号，限制每账号开房与服务资源。HTTP、WebSocket、图片、存档和语音令牌入口统一验证权限。登录复用成熟认证库，不自行实现密码学。

后续服务能力发现由一个版本化响应声明协议版本、认证要求与建房权限，客户端统一消费。只有客户端与服务端一起接入时才落地此契约；本轮不提供尚无实现的可用按钮或接口。

| 阶段 | 内容 | 初步工作量 |
| --- | --- | --- |
| 发行基础 | 整理启动配置、双架构镜像、Compose、持久化与服务重启验证 | 2–3 工程日 |
| 认证与房间接入 | 邀请账户、会话撤销、账号席位关联、客户端登录及短房间号 | 5–8 工程日 |
| 运维交付 | 配额、备份恢复、升级流程、跨端与多房间回归 | 2–4 工程日 |

以上为基于当前代码的范围估算，总计 9–15 工程日，不是交付承诺；不含完整网站管理后台、高可用集群或语音媒体服务部署。运行容量与最低硬件需用真实服务压测确定，不根据客户端 CPU 占用推断。

