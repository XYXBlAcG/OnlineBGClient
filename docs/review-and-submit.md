# 审核与提交

在项目目录打开终端。审核与提交流程如下。

## 本地 macOS 审核应用

[当前客户端审核包](expedition.md#手动审核)。退出旧客户端后直接打开，无需解压。审核交付使用 `.app`，不生成 ZIP；应用采用本地临时签名，未公证。公网服务重新启动，手机刷新邀请页面。

GitHub Release 的附件需要单个文件，不能直接上传 `.app` 目录；线上产物仍以工作流为准，非 ZIP 的分发形式另行确认。

## 审核

```sh
cd /Users/xiexie/Documents/ChatGPT/gamehullqinAI
git status --short
git diff --stat
git diff
git diff --check
```

`git diff` 不显示未跟踪文件；新增文件从 `git status` 列表打开检查。功能与验证入口见 [架构](architecture.md)、[验证](verification.md)。

## 提交

确认工作区内容后暂存，并检查暂存结果：

```sh
git add -A
git diff --cached --stat
git diff --cached
```

提交后通过已配置的 GitHub CLI 别名推送：

```sh
git commit -m "Restore complete tables and native auxiliary windows"
gh push origin main
gh run list --workflow desktop.yml --limit 3
```

推送会触发私有仓库的桌面构建。发布条件与版本来源见 [发布入口](game-ai-release-plan.md)。查看构建与下载产物：

```sh
gh run watch RUN_ID
gh run download RUN_ID --dir artifacts/review
gh release list --limit 3
gh release download RELEASE_TAG --dir artifacts/releases
```

将 `RUN_ID` 和 `RELEASE_TAG` 替换为列表中的构建编号与发布标签。平台、产物名称和检查步骤以 [工作流](../.github/workflows/desktop.yml) 为准。
