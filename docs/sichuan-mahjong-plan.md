# 四川麻将

血战到底，自研牌桌与现有房间、线程池、联机、头像、聊天、引导、回放和动画通道共用。其他候选游戏不在本轮范围。

## 实现索引

| 职责 | 唯一入口 |
| --- | --- |
| 牌、阶段、动作与房间选项 | [类型与校验](../src/domain/mahjong/types.ts) |
| 换三张、定缺、摸打、碰杠胡、响应与可见信息 | [规则](../src/domain/mahjong/rules.ts) |
| 胡牌、向听与番型 | [手牌分析](../src/domain/mahjong/hand.ts) |
| 逐笔结算、查花猪、查叫、退税 | [结算](../src/domain/mahjong/settlement.ts) |
| 简单／普通／困难评估与真实预算 | [策略](../src/domain/mahjong/strategy.ts) |
| 仅依据公开信息构造未知局面 | [抽样](../src/domain/mahjong/sample.ts) |
| 同时提交、托管、持久化与回放 | [房间](../src/domain/room.ts)、[协议](../src/domain/protocol.ts)、[回放](../src/domain/replay.ts) |
| 四方牌桌、操作、规则说明与账目 | [牌桌](../src/client/mahjong/SichuanTable.tsx)、[SVG 牌面](../src/client/mahjong/MahjongTile.tsx) |
| 桌面与触屏横竖屏 | [布局](../src/client/mahjong/mahjong.css) |
| 引导与具体元素定位 | [引导](../src/client/beginner-guides.ts)、[目标](../src/client/guide-targets.ts) |
| 增强动画与牌背隐私 | [语义事件](../src/client/game-motion-events.ts)、[表现层](../src/client/motion/table-animator.ts) |
| 规则、守恒、同时响应、回放与 AI | [规则测试](../tests/sichuan-mahjong.test.ts)、[策略测试](../tests/sichuan-ai.test.ts) |
| 真实服务三真人＋AI、手机尺寸、聊天、托管、结算与回放 | [浏览器验证](../scripts/verify-sichuan.mjs) |
| macOS WebView 本地线程、AI 与操作 | [原生验证](../scripts/native-mahjong-smoke.js) |

本客户端采用明确的四川房间变体。具体计分以规则模块和牌桌「牌桌规则」为准；不包含呼叫转移、天地胡、幺九将对。换牌方向每局随机，真人响应无强制倒计时，可自行托管。AI 的抽样分数是局面评价，不是胜率；不读取真实对手手牌或牌墙顺序。审核关闭时跳过解释生成。

向听计算复用 `@kobalab/majiang-core` 的标准结构算法；四川七对、定缺与计分在本项目领域层实现，不使用日本麻将计分规则。[第三方许可证](../public/licenses/majiang-core.txt)。

实际执行证据见 [验证](verification.md)。Windows WebView2 与真实手机设备仍需对应平台验收。

## 其他牌类游戏候选

| 游戏 | 人数 | 推荐原因 | 来源 |
| --- | --- | --- | --- |
| 失落的城市：卡牌版 | 2 | 一张出牌加一张摸牌，适合经常只有两名真人的情形；规划升序探险路线 | [出版商](https://thamesandkosmos.com/collections/2-player/products/lost-cities-card-game-with-6th-expedition) |
| 牛头王 6 nimmt! | 2–10 | 同时选牌，避开第六张收罚分；适合多人短回合与手机 | [出版商](https://www.amigo-spiele.de/6-nimmt_4910_1124) |
| Sushi Go! 寿司 Go | 2–5 | 选一张后传手牌，组合计分；主题直观 | [出版商](https://gamewright.com/product/Sushi-Go) |
| TRIO | 3–6 | 记住公开过的数字，寻找三张相同牌；适合轻松聚会 | [出版商规则](https://www.cocktailgames.com/wp-content/uploads/2022/11/regle_trio_0722_EN_v3.pdf) |

这些推荐不改变本轮四川麻将范围。麻将规则核对与算法研究分别参考 [四川省体育场馆协会赛事规则](https://www.ssva.org.cn/upload/file/2023-10-08/6383235670424258795805165.pdf) 与 [向听计算研究](https://arxiv.org/abs/2108.06832)；赛事规则作为变体核对资料，研究论文不等于已经验证过的本软件性能。
