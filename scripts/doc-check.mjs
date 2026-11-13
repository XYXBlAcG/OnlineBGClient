import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import {
  readReleaseSources,
  releaseVersionMismatches,
} from "./lib/release-sources.mjs";

const root = process.cwd();
const docsRoot = join(root, "docs");
const readmePath = join(docsRoot, "README.md");
const jsonOutput = process.argv.slice(2).includes("--json");
const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
const issues = [];

function addIssue(file, line, kind, message) {
  issues.push({ file: relative(root, file), line, kind, message });
}

async function exists(path) {
  return stat(path).then(
    () => true,
    () => false,
  );
}

function linksOf(source) {
  const links = [];
  let fenced = false;
  for (const [index, line] of source.split("\n").entries()) {
    if (/^\s*(?:```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    for (const match of line.matchAll(linkPattern)) {
      const target = match[1].trim();
      if (!target || /^(?:https?:|mailto:|#)/i.test(target)) continue;
      const [path] = target.split("#");
      if (!path) continue;
      links.push({ line: index + 1, target, path });
    }
  }
  return links;
}

const docFiles = (await readdir(docsRoot))
  .filter((name) => name.endsWith(".md"))
  .sort();
const docLinks = [];

for (const name of docFiles) {
  const file = join(docsRoot, name);
  const source = await readFile(file, "utf8");
  for (const link of linksOf(source)) {
    const resolved = resolve(dirname(file), link.path);
    if (!(await exists(resolved)))
      addIssue(file, link.line, "link", `链接目标不存在：${link.target}`);
    docLinks.push({ file, resolved, line: link.line });
  }
}

const indexed = new Map();
for (const link of docLinks) {
  if (link.file !== readmePath || !link.resolved.startsWith(docsRoot + sep))
    continue;
  if (!link.resolved.endsWith(".md")) continue;
  const firstLine = indexed.get(link.resolved);
  if (firstLine !== undefined)
    addIssue(
      readmePath,
      link.line,
      "index",
      `索引重复：${relative(root, link.resolved)}（首次见第 ${firstLine} 行）`,
    );
  else indexed.set(link.resolved, link.line);
}
for (const name of docFiles) {
  if (name === "README.md") continue;
  const file = join(docsRoot, name);
  if (!indexed.has(file))
    addIssue(readmePath, 1, "index", `缺少索引：${relative(root, file)}`);
}

const releaseSources = await readReleaseSources(root);
for (const mismatch of releaseVersionMismatches(releaseSources))
  addIssue(join(root, mismatch.source), 1, "version", mismatch.message);
const compare = (left, right) => {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (const index of [0, 1, 2])
    if (a[index] !== b[index]) return a[index] - b[index];
  return 0;
};
const latestVersion = releaseSources.releases.reduce(
  (latest, version) => (compare(version, latest) > 0 ? version : latest),
  releaseSources.releases[0],
);
if (latestVersion !== releaseSources.version)
  addIssue(
    join(root, "src/client/releases.json"),
    1,
    "version",
    `releases.json 最新版本 ${latestVersion} 与 package.json 的 ${releaseSources.version} 不一致`,
  );

const counts = { link: 0, index: 0, version: 0 };
for (const issue of issues) counts[issue.kind]++;
if (jsonOutput) {
  console.log(
    JSON.stringify(
      {
        ok: issues.length === 0,
        docs: docFiles.length,
        links: docLinks.length,
        counts,
        issues,
      },
      null,
      2,
    ),
  );
} else if (issues.length) {
  for (const issue of issues)
    console.error(`${issue.file}:${issue.line} ${issue.message}`);
  console.error(
    `文档检查未通过：死链 ${counts.link} 个，索引问题 ${counts.index} 个，版本问题 ${counts.version} 个`,
  );
} else {
  console.log(
    `文档检查通过（${docFiles.length} 篇文档，${docLinks.length} 个链接）`,
  );
}
if (issues.length) process.exit(1);
