# 表情资源

默认显示系统原生 emoji。macOS、iOS 和网页不下载表情图片；仅 Windows 客户端在「设置 → 外观 → 表情外观」提供 Apple 风格图片的下载、启用、停用和删除。下载可以使用「联机」中的 HTTP 代理地址。下载或资源读取失败时保留原生表情。

图片独立存放在本机可选资源目录，不包含在应用安装包、开房网页及聊天消息中；房间里的每个客户端自行选择外观。

## 唯一入口

- [解析与显示](../src/client/Emoji.tsx)、[共享资源状态](../src/client/emoji/client.ts)、[Windows 设置](../src/client/emoji/EmojiSettings.tsx)
- [下载、校验、安装、停用、删除与本机协议](../src-tauri/src/emoji.rs)
- [字符清单](../src/client/emoji-codes.json)、[macOS 离屏生成器](../scripts/render-apple-emoji.swift)、[独立资源打包](../scripts/build-emoji-pack.mjs)
- [Release 附件与清单](../scripts/release-assets.mjs)、[构建工作流](../.github/workflows/desktop.yml)
- [平台策略与回退测试](../tests/emoji-policy.test.tsx)

维护者在 macOS 运行 `node scripts/build-emoji-pack.mjs`，生成独立资源包和下载清单。正式发布时工作流把它们附在同仓库 Release；没有正式上传附件前，在线下载会提示资源尚未提供。Windows 发布包直接使用附件，不运行 Apple 字体生成器。

`@twemoji/api` 只负责 Unicode 分词，不提供图形；[解析器声明](../public/licenses/twemoji.txt)。
