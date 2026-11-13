# 提交、推送与发布构建规范

## 提交前

1. 先完成代码审查，确认没有职责分叉、历史包袱、过度兜底和无复用价值的临时 helper。
2. 运行 `git diff --check`。
3. 至少运行与改动直接相关的测试。
4. 运行 `npx tsc --noEmit`。
5. 准备正式发布时再运行全量测试和 `npm run build`。
6. 不把 `.tmp/`、构建产物、日志、缓存或本机密钥之外的临时文件加入提交。

## Commit

- 一个 commit 只做一件可回滚的事。
- 按领域拆分，例如 `fix(commands)`、`feat(settings)`、`perf(lobby)`、`fix(graphwar)`、`docs(release)`。
- 提交信息描述结果，不写过程流水账。
- 每个 commit 独立通过类型检查；正式发布前所有 commit 的最终树通过全量测试和构建。
- 不提交只有修改说明的临时文档。

## 版本

版本以以下文件为唯一来源：

- [package.json](../package.json)
- [package-lock.json](../package-lock.json)
- [Cargo.toml](../src-tauri/Cargo.toml)
- [Cargo.lock](../src-tauri/Cargo.lock)
- [版本记录](../src/client/releases.json)

流程：

```sh
node scripts/release-version.mjs
```

该脚本会校验版本源一致且 `releases.json` 存在对应版本记录。版本记录只维护面向用户的变化，不复述代码实现。

## 推送与构建

GitHub 操作统一使用 `gh` 和已配置别名，不直接运行 `git push`。

```sh
gh push origin main
git tag -a vX.Y.Z -m "OnlineBGClient X.Y.Z"
gh push origin vX.Y.Z
```

标签 `v*` 触发 [Desktop packages](../.github/workflows/desktop.yml) 的统一发布构建：只构建 macOS 与 Windows，由 release job 汇总到同一个 GitHub Release。iOS 不在发布构建范围内，不产出 IPA，也不进入 Release 资产。

## Release 格式

每个版本只有一个 Release：标签 `vX.Y.Z`，标题 `OnlineBGClient X.Y.Z`。资产命名、说明、`latest.json` 和 `SHA256SUMS.txt` 由 [发布资产脚本](../scripts/release-assets.mjs) 生成，草稿、上传和发布由 [发布脚本](../scripts/publish-release.mjs) 执行。

- 资产统一为 `OnlineBGClient-X.Y.Z-<平台>-<架构>[-unsigned].<扩展名>`。
- 说明固定包含「更新内容」和「下载」，下载表覆盖 Windows、macOS 与可选共享资源。
- 发布资产只有 Windows 与 macOS；iOS 构建与 IPA 不参与发布。
- 不在 GitHub 手工维护第二套资产名或说明格式。

## 共享字体包

字体文件不进入应用安装包。macOS 直接使用系统字体，其他平台缺少字体时从固定的 0.4.1 Release 资源下载并缓存。

发布工作流仅在 0.4.1 标签下构建并附加字体包，后续版本不重复附带。需要补传时：

```sh
npm run fonts:pack
gh release upload v0.4.1 artifacts/fonts/OnlineBGClient-fonts-0.4.1.zip --clobber
```

下载地址和文件校验入口见[原生字体服务](../src-tauri/src/fonts.rs)、[前端字体加载](../src/client/fonts.tsx)。

## 后台等待规则

推送并触发构建后，默认留一个后台 shell 等待，不阻塞对话：

```sh
RUN_ID=$(gh run list --workflow desktop.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status --interval 30
```

- 该命令放到后台运行。
- 可以结束对话，等待 shell 完成。
- 返回码不为 0 时必须继续处理，不得当作成功。
- 返回码为 0 时确认 Release 与附件已生成。
- 用户明确要求“不等待构建完成”时，只触发并返回运行链接。

## 构建失败处理

先读取失败日志：

```sh
gh run view "$RUN_ID" --log-failed
```

修复后：

1. 重新运行相关测试、`npx tsc --noEmit` 和 `npm run build`。
2. 提交修复并推送 `main`。
3. 若 Release 尚未发布，可移动失败标签重新触发同一版本构建：

```sh
git tag -f vX.Y.Z -m "OnlineBGClient X.Y.Z"
gh push --force origin vX.Y.Z
```

4. 若 Release 已发布，禁止移动标签；必须发布新的 patch 版本。
5. 构建日志中的 Node.js action 弃用警告不是失败条件，除非工作流实际返回非 0。

## 发布后检查

```sh
gh release view vX.Y.Z --json tagName,name,isDraft,isPrerelease,publishedAt,url,assets
gh run list --workflow desktop.yml --limit 3
```

确认：

- Release 不是 draft，标题和标签符合 `OnlineBGClient X.Y.Z` / `vX.Y.Z`。
- Windows `.exe`、macOS `.app.tar.gz`、签名、`latest.json`、`SHA256SUMS.txt` 均存在；Release 中不应出现 `.ipa`。
- 所有 job 完成且 release job 成功。
- 客户端自动更新所需的签名和版本号一致。
- 不存在独立的 `ios-*` Release。

## 禁止

- 禁止直接运行 `git push` 访问 GitHub，统一使用 `gh push` 或已配置的 `gh` 别名。
- 禁止把未验证的构建标记为正式发布。
- 禁止在 Release 已发布后强制移动标签。
- 禁止用局部测试代替正式发布前的全量测试和构建。
- 禁止把失败构建当作成功，或者只凭“已触发”宣布发布完成。
