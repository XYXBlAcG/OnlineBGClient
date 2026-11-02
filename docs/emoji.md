# 表情资源

默认显示系统原生 emoji。macOS、iOS 和网页不下载表情图片；仅 Windows 客户端在「设置 → 外观 → 表情外观」提供 Apple 风格图片的下载、启用、停用和删除。下载可以使用「联机」中的 HTTP 代理地址。下载或资源读取失败时保留原生表情。

图片独立存放在本机可选资源目录，不包含在应用安装包、开房网页及聊天消息中；房间里的每个客户端自行选择外观。

## 唯一入口

- [解析与显示](../src/client/Emoji.tsx)、[共享资源状态](../src/client/emoji/client.ts)、[Windows 设置](../src/client/emoji/EmojiSettings.tsx)
- [下载、校验、安装、停用、删除与本机协议](../src-tauri/src/emoji.rs)
- [字符清单](../src/client/emoji-codes.json)、[macOS 离屏生成器](../scripts/render-apple-emoji.swift)、[独立资源打包](../scripts/build-emoji-pack.mjs)
- [0.2.1 独立表情资源](https://github.com/XYXBlAcG/OnlineBGClient/releases/tag/v0.2.1)
- [平台策略与回退测试](../tests/emoji-policy.test.tsx)

下载源固定为 0.2.1 的独立附件；之后的软件 Release 不重复生成或附带表情包。下载协议、资源目录和校验规则以原生入口为准。

`@twemoji/api` 只负责 Unicode 分词，不提供图形；[解析器声明](../public/licenses/twemoji.txt)。
