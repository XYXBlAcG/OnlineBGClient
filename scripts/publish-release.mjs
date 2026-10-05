import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import { prepareRelease } from "./release-assets.mjs";
const execute = promisify(execFile);
const {
  GITHUB_REPOSITORY: repo,
  GITHUB_SHA: sha,
  GITHUB_REF: ref,
  GITHUB_RUN_NUMBER: run,
} = process.env;
if (!repo || !/^[a-f0-9]{40}$/.test(sha || "") || !/^\d+$/.test(run || ""))
  throw new Error("缺少 GitHub 构建身份");
const pkg = JSON.parse(await readFile("package.json", "utf8")),
  tauri = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8"));
if (tauri.version !== "../package.json")
  throw new Error("桌面版本必须引用 package.json");
const stable = ref.startsWith("refs/tags/v"),
  tag = stable
    ? ref.slice("refs/tags/".length)
    : `preview-${run}-${sha.slice(0, 12)}`;
const { assets } = await prepareRelease(
  "artifacts/release-input",
  "artifacts/release-output",
  pkg.version,
  tag,
);
let existing;
try {
  existing = JSON.parse(
    (await execute("gh", ["api", `repos/${repo}/releases/tags/${tag}`])).stdout,
  );
} catch (error) {
  if (!String(error.stderr).includes("HTTP 404")) throw error;
}
if (existing && existing.target_commitish !== sha)
  throw new Error("发布标签对应其他构建提交");
if (existing && !existing.draft) {
  const directory = await mkdtemp(join(tmpdir(), "onlinebg-release-"));
  try {
    await execute("gh", [
      "release",
      "download",
      tag,
      "--repo",
      repo,
      "--dir",
      directory,
    ]);
    for (const asset of assets) {
      const local = await readFile(asset),
        remote = await readFile(join(directory, basename(asset)));
      if (
        createHash("sha256").update(local).digest("hex") !==
        createHash("sha256").update(remote).digest("hex")
      )
        throw new Error("已发布文件与本次构建不同，拒绝覆盖");
    }
    console.log(`Release ${tag} 已发布且文件一致`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
} else {
  const notes = `${stable ? "正式版" : "预览版"} ${pkg.version}\n\n构建提交：${sha}\n\nWindows x64：下载 .exe 安装包。\nmacOS Apple Silicon：下载 .zip 并解压应用。\n\nSHA256SUMS.txt 提供安装包校验值。私有仓库下载需要仓库访问权限。\n`;
  await writeFile("artifacts/release-output/notes.md", notes);
  if (!existing)
    await execute("gh", [
      "release",
      "create",
      tag,
      "--repo",
      repo,
      "--target",
      sha,
      "--draft",
      "--title",
      stable
        ? `OnlineBGClient ${pkg.version}`
        : `OnlineBGClient ${pkg.version} · 预览 ${run}`,
      "--notes-file",
      "artifacts/release-output/notes.md",
      ...(stable ? ["--verify-tag"] : ["--prerelease", "--latest=false"]),
    ]);
  await execute("gh", [
    "release",
    "upload",
    tag,
    ...assets,
    "--repo",
    repo,
    "--clobber",
  ]);
  const uploaded = JSON.parse(
    (
      await execute("gh", [
        "release",
        "view",
        tag,
        "--repo",
        repo,
        "--json",
        "assets",
      ])
    ).stdout,
  );
  for (const asset of assets)
    if (!uploaded.assets.some((remote) => remote.name === basename(asset)))
      throw new Error("Release 文件未上传完整");
  await execute("gh", [
    "release",
    "edit",
    tag,
    "--repo",
    repo,
    "--draft=false",
    ...(stable ? ["--latest"] : ["--latest=false"]),
  ]);
  console.log(`Published ${tag}`);
}
