# OnlineBGClient

和朋友一起玩的桌游客户端：电脑开房，朋友通过邀请链接加入，AI 补足席位。支持 macOS、Windows 客户端和手机浏览器牌桌；客户端还提供房间连麦。

[下载版本](https://github.com/XYXBlAcG/OnlineBGClient/releases) · [快速上手](docs/getting-started.md) · [连麦配置](docs/client-voice.md#配置与实际连麦) · [文档索引](docs/README.md)

私有仓库的下载需要仓库访问权限。GitHub Actions 构建完成后会发布安装包；尚未完成的构建可在 Actions 中查看进度。客户端自动更新暂未接入。

## 第一次玩

1. 房主打开客户端，选游戏。自己玩选「本地对局」；和朋友玩选「跨网络联机」，启用临时公网入口并创建房间。
2. 把完整邀请链接发给朋友。电脑在加入入口粘贴链接，手机直接用浏览器打开。房主电脑在游玩期间保持运行和联网。
3. 玩家准备后，房主开始对局。游戏内可按需打开新手引导；专注模式隐藏顶栏，保留游戏和聊天入口。

同一房间可以继续下一局、调整席位或切换游戏。秘塔远征的继续入口在大厅；对局记录与远征存档分别管理。更多操作见[使用指南](docs/getting-started.md)。

## 想和朋友连麦

双方使用客户端。大厅点击「连麦设置」，或打开「设置 → 声音与语音」。**只有房主配置 LiveKit 项目，加入者不用配置。** 保存配置后新建联机房间，在聊天底部加入房间语音，再主动开启麦克风。

配置步骤、已有房间如何生效、权限与常见问题见[房间语音指南](docs/client-voice.md#配置与实际连麦)。手机浏览器本轮支持游戏、图片和文字聊天，不提供连麦。

## 开发

Node.js 版本以 [.node-version](.node-version) 为准；桌面开发需要 Rust 和对应平台的 Tauri 工具链。

```sh
npm ci
npm run desktop
```

浏览器开发使用 `npm run dev`，地址为 `http://127.0.0.1:1420`。游戏资源和内置服务的准备入口是 `npm run desktop:prepare`；桌面开发和打包会自动调用。

```sh
npm run desktop:build
```

独立服务使用 `npm run build` 后运行 `npm run server`，默认地址 `http://127.0.0.1:8787`。网络配置见[联机运行](docs/network.md)，桌面托管见[临时公网房间](docs/hosting.md)。

游戏能力以[游戏目录](src/domain/catalogue.ts)为准。实现入口见[架构](docs/architecture.md)，测试范围与设备验收边界见[验证](docs/verification.md)，发布流程见[构建工作流](.github/workflows/desktop.yml)。

感谢 [Hullqin 桌游](https://game.hullqin.cn/)；复用资源与自研牌桌的边界见[原站资源](upstream/README.md)。
