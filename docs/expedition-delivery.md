# DeepSeek 秘塔远征交付指南

从当前 `main` 创建独立开发分支或工作树。开始前记录 `git rev-parse HEAD`，运行 `node scripts/release-version.mjs` 确认基线版本。按 [AGENTS.md](../AGENTS.md) 工作，从 [秘塔远征实现索引](expedition.md) 找到规则、界面、联机、存档和回放的对应入口。

1. 只交付本次确认的秘塔远征改动。共享规则仍由客户端和服务端共用，现有存档与回放按项目已有入口处理。提交前用 `git status --short` 和 `git diff --check` 审查范围。
2. 在干净检出运行 `npm ci`。按 [秘塔远征验证索引](expedition.md#非界面验证) 运行与改动有关的测试，再运行 `npm run desktop:prepare` 和 `node scripts/verify-release-scope.mjs`。改到章节流程时，先运行 `npm run server:build`，再运行 `npm run verify:expedition-chapter`。
3. 用户要求安装包时，按 [打包与发布流程](updating.md) 使用仓库现有构建命令。交付包与所报提交对应，附平台、架构、下载链接和 SHA-256。涉及自动更新时，把每个安装包、其签名和更新清单作为一套产物核对。同版本重打包时，新字节使用新的下载文件名，避免缓存造成签名不匹配。
4. 最终回复列出改动摘要、提交或 PR、实际运行的命令及结果。附可在桌面端手动复核的入口、操作步骤和预期结果，并区分自动化证据与尚待人工验收的界面、联机或存档场景。请先由用户确认验收结果，再按其明确要求推送或发布。

无需发布时，交付分支与可复现验证步骤即可。已有城市开发现场保存在仓库外，日常开发与打包使用当前主目录。
