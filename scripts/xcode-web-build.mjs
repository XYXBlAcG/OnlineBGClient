import { execFileSync } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(
  process.env.REPO_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), ".."),
);
const ignored = new Set([".git", ".tmp", "dist", "node_modules", "artifacts"]);

async function newestMtime(directory) {
  let newest = 0;
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return newest;
  }
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) newest = Math.max(newest, await newestMtime(path));
    else if (
      /\.(?:ts|tsx|css|json|md|svg|png|webp|jpg|js|mjs|html)$/.test(entry.name)
    )
      newest = Math.max(newest, (await stat(path)).mtimeMs);
  }
  return newest;
}

export async function webBuildState(base = root) {
  let distTime = 0;
  try {
    distTime = (await stat(join(base, "dist", "index.html"))).mtimeMs;
  } catch {
    return { stale: true, reason: "dist 缺失" };
  }
  const sources = [
    await newestMtime(join(base, "src")),
    await newestMtime(join(base, "public")),
  ];
  for (const file of [
    "index.html",
    "package.json",
    "vite.config.ts",
    "tsconfig.json",
  ]) {
    try {
      sources.push((await stat(join(base, file))).mtimeMs);
    } catch {
      // 缺失的入口文件不参与比较
    }
  }
  const newest = Math.max(...sources);
  return newest > distTime
    ? { stale: true, reason: "源码比 dist 新" }
    : { stale: false, reason: "dist 已是最新" };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const generateCatalogue = () =>
    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        join(root, "scripts/native-catalogue.ts"),
        join(root, "dist/native-catalogue.json"),
      ],
      { cwd: root, stdio: "inherit" },
    );
  if (process.env.SKIP_XCODE_WEB_BUILD === "1") {
    generateCatalogue();
    console.log("跳过 Xcode Web 预构建（SKIP_XCODE_WEB_BUILD=1）");
    process.exit(0);
  }
  const state = await webBuildState();
  if (!state.stale) {
    generateCatalogue();
    console.log(`Xcode Web 预构建：${state.reason}，跳过`);
    process.exit(0);
  }
  console.log(`Xcode Web 预构建：${state.reason}，开始构建`);
  const run = (script) =>
    execFileSync(process.execPath, [join(root, script)], {
      cwd: root,
      stdio: "inherit",
    });
  run("scripts/build-upstream.mjs");
  execFileSync(
    process.execPath,
    [join(root, "node_modules/vite/bin/vite.js"), "build"],
    {
      cwd: root,
      stdio: "inherit",
    },
  );
  generateCatalogue();
  console.log("Xcode Web 预构建完成");
}
