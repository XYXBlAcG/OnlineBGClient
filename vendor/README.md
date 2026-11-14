# vendor

`companion-core-0.1.0.tgz` 是共享内核的固定版本构建产物，来源：

- 仓库：https://github.com/XYXBlAcG/companion-core
- tag：`v0.1.0`
- Release：https://github.com/XYXBlAcG/companion-core/releases/download/v0.1.0/companion-core-0.1.0.tgz
- SHA-256：`4ebfa05001f6049b2c017cb74a71ac9ea1404f419ed4f629bbbb2253f638cf2c`

游戏仓库的 npm 策略不允许 git/remote 依赖，因此这里固定 Release 产物；升级时替换文件、更新 `package.json` 与 `package-lock.json`，并校验上面的来源哈希。
