import { releaseVersion } from "./release-version.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import { prepareRelease } from "./release-assets.mjs";
await releaseVersion();
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
if (!ref.startsWith("refs/tags/v")) throw new Error("仅正式版本标签可以发布");
const tag = ref.slice("refs/tags/".length);
const { assets } = await prepareRelease(
  "artifacts/release-input",
  "artifacts/release-output",
  pkg.version,
  tag,
  repo,
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
  const history = JSON.parse(
    await readFile("src/client/releases.json", "utf8"),
  );
  const release = history.find((item) => item.version === pkg.version);
  const notes = `${release.changes.map((change) => `- ${change}`).join("\n")}\n\nWindows：下载 .exe。macOS：下载 .dmg，打开后将应用拖到 Applications。\nlatest.json 和 .app.tar.gz 为客户端自动更新资源。\n`;
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
      `OnlineBGClient ${pkg.version}`,
      "--notes-file",
      "artifacts/release-output/notes.md",
      "--verify-tag",
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
    "--latest",
  ]);
  console.log(`Published ${tag}`);
}
