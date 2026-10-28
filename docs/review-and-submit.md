# 审核与提交

在项目目录打开终端。审核与提交流程如下。

## 本地 macOS 审核应用

客户端安装见 [软件更新](updating.md)。本机审核保留 `.app`；公开分发使用安装镜像和签名更新资源。

GitHub Release 的手动安装和自动更新资源见 [软件更新](updating.md)。

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
git add src src-tauri scripts tests docs .github package.json package-lock.json README.md .gitignore .gitattributes
git diff --cached --stat
git diff --cached
```

提交后通过已配置的 GitHub CLI 别名推送：

```sh
git commit -m "Release v0.2.0"
git tag v0.2.0
gh push origin main v0.2.0
gh run list --workflow desktop.yml --limit 3
```

正式版本通过版本标签触发双平台构建，普通分支提交不发布预览包。发布条件与版本来源见 [发布入口](game-ai-release-plan.md)。查看构建与下载产物：

```sh
gh run watch RUN_ID
gh run download RUN_ID --dir artifacts/review
gh release list --limit 3
gh release download RELEASE_TAG --dir artifacts/releases
```

将 `RUN_ID` 和 `RELEASE_TAG` 替换为列表中的构建编号与发布标签。平台、产物名称和检查步骤以 [工作流](../.github/workflows/desktop.yml) 为准。
