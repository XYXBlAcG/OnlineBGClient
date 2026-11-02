# 跨平台外观、局域网调试与日志

## 使用

- 桌面「设置 → 联机」开启「显示局域网调试开房」，回到跨网络联机的创建页面勾选局域网调试。同一 Wi-Fi 的手机扫描邀请二维码或打开邀请链接；系统防火墙提示时允许局域网访问。首次需要准备 Node 运行组件，准备完成后局域网开房不经过 Cloudflare。
- 公网开房先直连，失败后按设置的 HTTP 代理继续尝试，总尝试次数保持现有策略。默认代理地址是本机常用混合代理端口；这里配置的是已有代理，不提供代理节点或系统 VPN。软件更新的代理设置独立管理。
- 「设置 → 软件日志」查看最近记录或导出保留的完整日志。包含启动、连接状态、客户端异常、Node 服务及 cloudflared 输出；凭据字段与链接参数在写入前处理，日志滚动保留。
- 头像、聊天和牌桌互动默认使用系统表情；Windows 客户端可以下载 Apple 风格表情包，复选框使用共享样式。没有收录或读取失败的表情保留原生文字。系统文件选择器、标题栏等仍使用所在平台的原生界面。

## 实现索引

| 内容 | 唯一入口 |
| --- | --- |
| 表情解析、资源及显示 | [共享表情](../src/client/Emoji.tsx)、[控件样式](../src/client/ui/platform-controls.css)、[表情资源](emoji.md) |
| 局域网地址与真实端口 | [网卡策略](../src/server/lan-addresses.ts)、[服务](../src/server/main.ts) |
| 开房与组件生命周期 | [原生服务](../src-tauri/src/hosting.rs)、[重试](../src-tauri/src/hosting_retry.rs) |
| 入口申请的显式 HTTP 代理 | [API 转发](../src-tauri/src/quick_api.rs) |
| 隧道 TCP 经 HTTP CONNECT 传输 | [中继](../src-tauri/src/network_proxy.rs) |
| 本机连接与对外邀请 | [开房桥接](../src/client/start-hosting.ts)、[应用](../src/main.tsx) |
| HTTP 环境中的 UUID | [UUID 依赖](../package.json)、[房间](../src/domain/room.ts)、[客户端操作](../src/main.tsx) |
| 日志留存、轮转与读取 | [日志](../src-tauri/src/diagnostics.rs) |
| 日志界面与导出 | [日志设置](../src/client/DiagnosticsSettings.tsx)、[异常采集](../src/client/diagnostics.ts) |
| 设置与默认隐藏入口 | [偏好](../src/client/preferences.ts)、[设置](../src/client/Settings.tsx)、[大厅](../src/client/Lobby.tsx) |

HTTP 代理用于入口申请、隧道连接和公网健康探测。cloudflared 的边缘连接经过本机中继，TLS 仍由 cloudflared 验证；不通过关闭证书校验解决连接问题。房主通过本机地址连接服务，对外分享地址单独保留。真实公网可达性取决于当前网络、代理和 Cloudflare 服务。

## 人工审核

1. Windows 与 macOS 比较头像、聊天表情、投掷效果、复选框选中／禁用／键盘聚焦；汉字头像保持文字。
2. 开启隐藏入口，电脑创建局域网房间，两台手机加入；检查开局、聊天图片、横竖屏、断线重连与关闭房间。局域网 HTTP 不提供客户端专属连麦。
3. 配置可用 HTTP 代理，在直连失败环境创建公网入口；检查阶段提示、邀请二维码、两端游戏和关闭清理。不可用代理应给出明确错误并出现在日志中。
4. 查看并导出日志，检查失败原因和时间可读；导出文件包含留存历史，普通游戏和更新操作不因日志页面打开而中断。

非界面验证：[控件](../tests/platform-controls.test.tsx)、[地址](../tests/lan-addresses.test.ts)、[HTTP 身份](../tests/lan-identities.test.ts)、[开房桥接](../tests/hosting-client.test.ts)。原生代理、日志与重试的定向测试位于对应实现模块。

日志查看、导出与清空的唯一入口：[设置界面](../src/client/DiagnosticsSettings.tsx)、[原生日志服务](../src-tauri/src/diagnostics.rs)。清空只涉及当前及轮转日志；临时文件测试覆盖清空后继续写入。
