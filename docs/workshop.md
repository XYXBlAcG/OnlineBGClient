# 插件模型与包工具

插件界面暂未开放。设置、房间和派对商店均不提供插件入口；新房间使用内置演出。已安装配方与已有回放保持保存，记录中的演出仍通过共享模型解析。

## 开发入口

- [配方模型](../src/domain/workshop/model.ts)、[场景与粒子枚举](../src/domain/party/stage.ts)
- [包解析与导出](../src/client/workshop/package.ts)、[打包工具](../scripts/build-workshop-pack.ts)
- [本机存储](../src/client/storage.ts)、[房间版本与账本](../src/domain/party.ts)
- [包测试](../tests/workshop.test.ts)、[存储测试](../tests/workshop-store.test.ts)、[回放与房间测试](../tests/workshop-room.test.ts)
- [入口关闭检查](../tests/workshop-visibility.test.ts)

包格式和字段以模型为准。`npm run workshop:pack -- 插件目录 输出.obgplugin` 使用同一模型校验配方。
