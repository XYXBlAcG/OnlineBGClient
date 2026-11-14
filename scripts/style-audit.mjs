import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { parse } from "postcss";

const root = process.cwd();
const portablePath = (value) => value.split(sep).join("/");
const sourceRoot = join(root, "src");
const outputRoot = join(root, "artifacts/style-audit");
const tokenFile = "src/client/ui/design-tokens.css";
const hexPattern = /#[0-9a-f]{3,8}\b/gi;
const colorFunctionPattern = /\b(?:rgb|hsl)a?\(/i;
const pxPattern = /\b\d+(?:\.\d+)?px\b/g;

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(path) : [path];
    }),
  );
  return nested.flat();
}

const allFiles = await filesUnder(sourceRoot);
const cssFiles = allFiles
  .filter((file) => file.endsWith(".css"))
  .map((file) => portablePath(relative(root, file)))
  .sort();
const tsxFiles = allFiles
  .filter((file) => file.endsWith(".tsx"))
  .map((file) => portablePath(relative(root, file)));

const totals = {
  cssFiles: cssFiles.length,
  cssLines: 0,
  selectors: 0,
  variables: 0,
  rawColors: 0,
  colorFunctions: 0,
  pxValues: 0,
  important: 0,
  mediaQueries: 0,
  layeredFiles: 0,
  inlineStyles: 0,
};
const violations = {
  rawColors: [],
  colorFunctions: [],
  pxValues: [],
  important: [],
  breakpoints: [],
  inlineStyles: [],
};
const files = [];
const breakpoints = new Map();

for (const file of cssFiles) {
  const css = await readFile(join(root, file), "utf8");
  const ast = parse(css, { from: file });
  const stats = {
    file,
    lines: css.split("\n").length,
    selectors: 0,
    variables: 0,
    rawColors: 0,
    colorFunctions: 0,
    pxValues: 0,
    important: 0,
    mediaQueries: 0,
    layered: false,
  };
  ast.walkRules(() => stats.selectors++);
  ast.walkAtRules("layer", () => {
    stats.layered = true;
  });
  ast.walkAtRules("media", (rule) => {
    stats.mediaQueries++;
    breakpoints.set(rule.params.trim(), (breakpoints.get(rule.params.trim()) ?? 0) + 1);
  });
  ast.walkDecls((decl) => {
    const value = decl.value;
    const start = decl.source?.start;
    stats.variables += (value.match(/var\(--/g) ?? []).length;
    const hexes = value.match(hexPattern) ?? [];
    if (hexes.length) {
      stats.rawColors += hexes.length;
      violations.rawColors.push({
        file,
        line: start?.line ?? 0,
        property: decl.prop,
        value,
        token: file === tokenFile,
      });
    }
    if (colorFunctionPattern.test(value)) {
      stats.colorFunctions++;
      violations.colorFunctions.push({
        file,
        line: start?.line ?? 0,
        property: decl.prop,
        value,
      });
    }
    const pxValues = value.match(pxPattern) ?? [];
    if (pxValues.length) {
      stats.pxValues += pxValues.length;
      violations.pxValues.push({
        file,
        line: start?.line ?? 0,
        property: decl.prop,
        value,
      });
    }
    if (decl.important) {
      stats.important++;
      violations.important.push({
        file,
        line: start?.line ?? 0,
        property: decl.prop,
        value,
      });
    }
  });
  totals.cssLines += stats.lines;
  totals.selectors += stats.selectors;
  totals.variables += stats.variables;
  totals.rawColors += stats.rawColors;
  totals.colorFunctions += stats.colorFunctions;
  totals.pxValues += stats.pxValues;
  totals.important += stats.important;
  totals.mediaQueries += stats.mediaQueries;
  if (stats.layered) totals.layeredFiles++;
  files.push(stats);
}

for (const file of tsxFiles) {
  const source = await readFile(join(root, file), "utf8");
  const count = source.match(/style=\{\{/g)?.length ?? 0;
  if (!count) continue;
  totals.inlineStyles += count;
  violations.inlineStyles.push({ file, count });
}

violations.breakpoints = [...breakpoints.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([condition, count]) => ({ condition, count }));

await mkdir(outputRoot, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  root: "src",
  totals,
  violations,
  files: files.sort((a, b) => b.lines - a.lines),
};
await writeFile(
  join(outputRoot, "report.json"),
  JSON.stringify(report, null, 2) + "\n",
);

const lines = [
  "# 样式审计报告",
  "",
  `生成时间：${report.generatedAt}`,
  "",
  "## 总量",
  "",
  "| 指标 | 数量 |",
  "| --- | ---: |",
  `| CSS 文件 | ${totals.cssFiles} |`,
  `| CSS 行数 | ${totals.cssLines} |`,
  `| 选择器 | ${totals.selectors} |`,
  `| CSS 变量引用 | ${totals.variables} |`,
  `| 十六进制颜色 | ${totals.rawColors} |`,
  `| rgb()/hsl() | ${totals.colorFunctions} |`,
  `| px 数值 | ${totals.pxValues} |`,
  `| !important | ${totals.important} |`,
  `| @media | ${totals.mediaQueries} |`,
  `| 已使用 @layer 的文件 | ${totals.layeredFiles} |`,
  `| 内联样式 | ${totals.inlineStyles} |`,
  "",
  "## 断点条件",
  "",
  "| 条件 | 次数 |",
  "| --- | ---: |",
  ...violations.breakpoints.map((item) => `| ${item.condition} | ${item.count} |`),
  "",
  "## 文件",
  "",
  "| 文件 | 行数 | 选择器 | 颜色 | px | !important | @media | @layer |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ...report.files.map(
    (file) =>
      `| ${file.file} | ${file.lines} | ${file.selectors} | ${file.rawColors} | ${file.pxValues} | ${file.important} | ${file.mediaQueries} | ${file.layered ? "是" : "否"} |`,
  ),
  "",
  "详细声明级数据见 `artifacts/style-audit/report.json`。",
];
await writeFile(join(outputRoot, "report.md"), lines.join("\n") + "\n");

console.log(
  `样式审计：${totals.cssFiles} 个文件 / ${totals.cssLines} 行 / ${totals.rawColors} 个十六进制颜色 / ${totals.important} 个 !important / ${totals.mediaQueries} 个 @media`,
);
console.log(
  `报告：${portablePath(relative(root, join(outputRoot, "report.md")))}`,
);
