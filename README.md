# OnlineBGClient

轻量多游戏桌面客户端，复用 Hullqin 游戏界面与规则。游戏能力由 [游戏目录](src/domain/catalogue.ts) 定义；软件实现入口见 [架构](docs/architecture.md)。

## 开发运行

Node.js 版本见 [.node-version](.node-version)；桌面开发还需 Rust 和对应平台 Tauri 工具链。

```sh
npm ci
npm run dev
```

浏览器打开 http://127.0.0.1:1420；桌面运行 `npm run desktop`。桌面开发测试公网开房前，执行 `npm run build && npm run hosting:build`。

## 房间服务与桌面包

```sh
npm run build
npm run server
npm run desktop:build
```

服务入口 http://127.0.0.1:8787。桌面开房与窗口行为见 [临时公网房间](docs/hosting.md)，自建服务见 [联机运行](docs/network.md)。

[私有仓库](https://github.com/XYXBlAcG/OnlineBGClient) 的 [构建工作流](.github/workflows/desktop.yml) 生成安装文件，可在 Actions 对应运行的 Artifacts 下载；更新渠道尚未配置。

## 索引

- [文档入口](docs/README.md)
- [验证入口与实际覆盖](docs/verification.md)
- [后续规划](docs/roadmap.md)
