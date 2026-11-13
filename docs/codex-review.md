# Codex 交叉评审

可选开发工具，不进入质量门禁，不替代人类界面与真机审核。用途：用另一模型（默认 `gpt-6.1-sol`）对截图、未提交 diff 或方案做对抗性评审，作为实现者之外的第二次意见。

## 入口

[桥接脚本](../scripts/agent/codex.mjs)、`npm run agent:codex`。

| 任务 | 用途 | 输入 |
| --- | --- | --- |
| `ask` | 单轮提问 | `--prompt` |
| `ui-review` | 界面/交互评审 | `--images 截图...` |
| `diff-review` | 未提交改动评审 | 脚本自动收集 `git diff` 并内嵌提示词 |
| `plan-review` | 方案对抗性评审 | `--prompt-file 方案.md` |

输出默认写入 `.tmp/codex/<时间>-<任务>.md`，日志同目录；`--output` 可指定路径。

## 前提

- 本机已安装并登录 Codex CLI（`~/.codex/config.toml`、`~/.codex/auth.json`）。
- 可访问模型服务：优先读取 `HTTPS_PROXY/HTTP_PROXY/ALL_PROXY`，macOS 回退系统代理；直连不可用时需先启动本机代理。
- 首次运行将 `config.toml` 与 `auth.json` 复制到 `.tmp/codex-home`（权限 600，`.tmp/` 已忽略），不写仓库。

## 边界

- Codex 以只读沙箱运行；在 DSH 沙箱内无法读取仓库文件，因此 diff 与方案由脚本内嵌，截图通过 `-i` 传入，评审结论可能出现“证据不足”，需人工判断。
- 结论属于建议，不构成验收；额度消耗取决于 ChatGPT 计划。
