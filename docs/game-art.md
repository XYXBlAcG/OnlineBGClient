# 游戏美术与动效

精选图形及校验、作者、授权、固定来源版本统一保存在 [素材清单](../public/art/sources.json)。随资源保留 [Kenney 声明](../public/art/Kenney-LICENSE.txt) 与 [0x72 声明](../public/art/0x72-LICENSE.txt)。

| 内容 | 实现入口 |
| --- | --- |
| 角色序列帧、粒子贴图与牌背映射 | [美术入口](../src/client/art.ts) |
| 远征角色、敌人意图与战斗表现 | [战斗场景](../src/client/expedition/BattleScene.tsx) |
| 地图宝箱 | [路线图](../src/client/expedition/ExpeditionMap.tsx) |
| 抽牌翻面、落点与卡牌动效 | [牌桌动画器](../src/client/motion/table-animator.ts) |
| 投掷飞行与粒子 | [互动层](../src/client/Interactions.tsx) |
| 聊天掷骰 | [骰子消息](../src/client/social/ChatRoll.tsx) |
| 图片与动作样式 | [美术样式](../src/client/ui/art-experience.css)、[聊天样式](../src/client/ui/social-experience.css) |
| 动画开关及后台、减少动态效果 | [表现策略](../src/client/motion-policy.ts)、[提供器](../src/client/motion.tsx) |

牌桌规则与服务端掷骰结果不由动画修改。历史骰子消息静态显示；新结果显示翻滚和落地。游戏增强效果沿用游戏动画开关，聊天掷骰遵循界面动画开关；系统减少动态效果优先。

审核时比较 UNO 抽牌翻面、秘塔各角色与宝箱、投掷粒子及聊天 `/roll 2d6`、`/roll 2d100`。检查夜间、手机横竖屏、后台恢复与关闭动画。界面交互由用户手动执行；[素材完整性](../tests/art-assets.test.ts) 和 [骰子结果](../tests/chat-roll.test.tsx) 属于非界面检查。

派对矢量演出使用 [Anime.js 时间线](https://animejs.com/documentation/timeline/timeline-methods/seek/)，高画质粒子使用 [PixiJS 社区滤镜](https://pixijs.io/filters/docs/)。统一播放入口与验收项见[房间派对](room-party.md)。授权见 [Anime.js](../public/licenses/animejs.txt) 与 [Pixi Filters](../public/licenses/pixi-filters.txt)。


