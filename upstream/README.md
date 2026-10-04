# 原站资源

来源：[Hullqin 桌游](https://game.hullqin.cn/)，2026-10-04 固定公开构建资源。当前未获得可维护的原始源码仓库。

- [房间与通信资源](https://fe-1255520126.file.myqcloud.com/game/static/js/app.75ad5e73.chunk.js)
- [斗地主资源](https://fe-1255520126.file.myqcloud.com/game/static/js/ddz.1895f9e7.chunk.js)
- [UNO 资源](https://fe-1255520126.file.myqcloud.com/game/static/js/uno.b93c4f09.chunk.js)
- [四国弑资源](https://fe-1255520126.file.myqcloud.com/game/static/js/sgs.906041c4.chunk.js)
- [飞行棋资源](https://fe-1255520126.file.myqcloud.com/game/static/js/fxq.3c7c1a54.chunk.js)
- [跳棋资源](https://fe-1255520126.file.myqcloud.com/game/static/js/tq.d4815314.chunk.js)
- [资源哈希与模块清单](manifest.json)
- [本地提取与适配入口](../scripts/build-upstream.mjs)

raw 保留固定原始产物。生成模块不直接手改；更新原始资源后通过 `npm run upstream:build` 重建，再执行对应规则与界面验证。文本目录唯一来源是 [terms.ts](../src/domain/terms.ts)。
