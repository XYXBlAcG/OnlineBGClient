import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import stylelint from "stylelint";

const root = process.cwd();
const scriptRoot = dirname(fileURLToPath(import.meta.url));
const baselinePath = join(scriptRoot, "style-lint.baseline.json");
const update = process.argv.includes("--update-baseline");

const result = await stylelint.lint({
  files: "src/**/*.css",
  allowEmptyInput: true,
  formatter: "json",
});
const report = JSON.parse(result.report);
if (!report.length) {
  console.error("样式检查未匹配到任何 CSS 文件");
  process.exit(1);
}

const counts = {};
let invalidOptions = 0;
for (const file of report) {
  const path = relative(root, file.source);
  invalidOptions += file.invalidOptionWarnings?.length ?? 0;
  for (const warning of file.warnings) {
    counts[path] ??= {};
    counts[path][warning.rule] = (counts[path][warning.rule] ?? 0) + 1;
  }
}

if (invalidOptions) {
  console.error(`Stylelint 配置有 ${invalidOptions} 条无效选项`);
  process.exit(1);
}

if (update) {
  await writeFile(baselinePath, JSON.stringify(counts, null, 2) + "\n");
  console.log(`样式检查基线已更新：${relative(root, baselinePath)}`);
  process.exit(0);
}

const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
const regressions = [];
for (const [path, rules] of Object.entries(counts))
  for (const [rule, count] of Object.entries(rules)) {
    const previous = baseline[path]?.[rule] ?? 0;
    if (count > previous)
      regressions.push({ path, rule, previous, count });
  }

if (regressions.length) {
  for (const item of regressions)
    console.error(`${item.path} ${item.rule}：${item.previous} → ${item.count}`);
  console.error(
    "新增样式违规。修复后重跑；确属不可避免时运行 node scripts/style-lint-gate.mjs --update-baseline 并在评审中说明原因",
  );
  process.exit(1);
}

const reductions = [];
for (const [path, rules] of Object.entries(baseline))
  for (const [rule, previous] of Object.entries(rules)) {
    const count = counts[path]?.[rule] ?? 0;
    if (count < previous) reductions.push({ path, rule, previous, count });
  }
if (reductions.length)
  console.log(
    `样式违规低于基线（${reductions.length} 项），可运行 node scripts/style-lint-gate.mjs --update-baseline 收窄基线`,
  );
console.log(`样式检查通过：${report.length} 个文件`);
