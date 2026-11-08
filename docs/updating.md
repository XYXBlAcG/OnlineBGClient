# 软件更新与正式发布

## 使用

从 [Release](https://github.com/XYXBlAcG/OnlineBGClient/releases) 获取安装包。0.2.0 之前的客户端没有更新器，需要手动安装一次。Windows 下载 `.exe`；macOS 下载 `.app.tar.gz`，解压后将应用移到 Applications。`.sig` 与 `latest.json` 供客户端更新器使用；macOS 更新器复用同一归档。

客户端默认启动检查并提醒。发现新版本或开始下载时自动打开「设置 → 软件更新」，同一版本只自动打开一次；下载页显示百分比、已下载量、速度、剩余时间、签名与安装状态。许可后下载、校验并在空闲时安装重启。在设置中可以手动检查、关闭启动检查或新版本提醒，也可预先允许自动安装。房间、托管服务或连麦仍在使用时等待安装；重启后按实际运行版本显示更新结果。手机浏览器使用房主服务提供的版本。

需要代理时勾选「使用代理检查和下载」，填写本机代理地址。默认地址仅是输入初值，不要求每位玩家都运行代理。检查失败不会阻止游戏，设置页显示失败结果并支持重试。

版本说明由 [版本记录](../src/client/releases.json) 同时用于关于页、Release 和更新清单。

## 实现索引

| 职责                                         | 入口                                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 原生检查、签名下载、安装、占用校验与重启结果 | [原生更新服务](../src-tauri/src/updater.rs)                                                           |
| 默认偏好、提醒与安装决策                     | [更新模型](../src/client/updates/model.ts)、[主窗口协调](../src/client/updates/UpdaterController.tsx) |
| 更新设置与进度                               | [设置组件](../src/client/updates/UpdateSettings.tsx)、[状态订阅](../src/client/updates/client.ts)     |
| 公钥与正式更新源                             | [Tauri 配置](../src-tauri/tauri.conf.json)                                                            |
| 版本一致性                                   | [版本校验](../scripts/release-version.mjs)                                                            |
| 双平台签名构建及发布门槛                     | [工作流](../.github/workflows/desktop.yml)                                                            |
| 更新清单、安装包和校验文件                   | [产物准备](../scripts/release-assets.mjs)、[正式发布](../scripts/publish-release.mjs)                 |
| 签名实包验证                                 | [验证入口](../scripts/verify-update-bundle.mjs)                                                       |

## 作者签名配置

本机 `.secrets/updater.key` 和 `.secrets/updater.password` 属于更新签名身份，已被 Git 忽略。保留备份，不纳入普通缓存清理；后续版本继续使用同一密钥。Actions 对应 Secret 名称见 [工作流](../.github/workflows/desktop.yml)，值仅在仓库设置与本机保管，源码只包含公钥。

本机 `npm run desktop:build -- --bundles app` 自动读取已有环境变量或本机签名文件。其他开发者自行构建分发版本时，应配置自己的更新源与签名身份。正式发布通过版本标签触发，普通分支提交不生成预览 Release。提交、标签与推送操作见 [审核与提交](review-and-submit.md)。

## 人工验收

1. 首次启动检查当前版本；在设置中关闭启动检查、关闭提醒、切换自动安装，重启后确认偏好保留。关于页显示版本和简短说明。
2. 将代理设为不可用地址，手动检查应显示失败，仍可游戏；恢复正确代理后可重试。未启用代理时不要求本机代理存在。
3. 真实后续版本可用时，启动提醒提供许可和稍后；拒绝后本次会话不重复提示。手动检查在设置内显示结果。
4. 同意下载后检查进度和签名失败反馈。下载完成时仍在房间或连麦，安装继续等待；退出后自动安装并重启。关闭预授权自动安装可暂停自动下载产生的待安装任务。
5. 更新后弹出成功提示，版本与实际安装一致。取消系统安装或安装失败不能报告成功。Windows 安装器和 macOS 权限提示由用户操作。

版本比较、占用与许可策略、官方签名验证及构建检查属于非界面证据；真实跨版本安装、系统权限和重启提示由用户手动验收，不自动运行安装器。

应用标识变更及旧数据审核见 [身份与迁移](identity.md)。可选表情属于独立附件，入口见 [表情资源](emoji.md)。

## Windows 安装位置

安装与更新沿用现有安装目录，桌面和开始菜单快捷方式指向实际安装的程序。不自动删除其他安装副本；存档、设置与语音凭据不属于安装器清理范围。若已经同时安装在两个位置，手动安装时确认目标目录，之后使用该目录的快捷方式。

目录选择与快捷方式的唯一实现：[NSIS 模板](../src-tauri/windows-install.nsi)。模板来自 [Tauri CLI 2.12.1](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.12.1/crates/tauri-bundler/src/bundle/windows/nsis/installer.nsi)，CLI 版本固定于 [依赖](../package.json)，[模板许可](../src-tauri/windows-install.LICENSE)。发布者身份位于 [桌面配置](../src-tauri/tauri.conf.json)。

人工审核：在带空格、中文的 D 盘目录分别测试从 0.2.0 和当前版升级，更新后从桌面及开始菜单启动，检查实际程序位置、存档、设置、连麦配置；已有其他安装副本应保持存在。
