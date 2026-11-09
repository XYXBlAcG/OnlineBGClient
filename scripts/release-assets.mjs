import {
  readdir,
  readFile,
  copyFile,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { createHash } from "node:crypto";
export async function prepareRelease(input, output, version, tag, repo) {
  if (!/^\d+\.\d+\.\d+$/.test(version) || tag !== `v${version}`)
    throw Error("正式标签与应用版本不一致");
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || "")) throw Error("发布仓库无效");
  const history = JSON.parse(
      await readFile("src/client/releases.json", "utf8"),
    ),
    release = history.find((item) => item.version === version);
  if (!release) throw Error("缺少版本记录");
  const root = resolve(input),
    out = resolve(output),
    paths = (await readdir(root, { recursive: true }))
      .map((name) => join(root, name))
      .filter((path) => !path.startsWith(out + sep));
  const unique = (suffix, label) => {
    const matches = paths.filter((path) => path.endsWith(suffix));
    if (matches.length !== 1) throw Error(`需要唯一 ${label}`);
    return matches[0];
  };
  const windows = unique(".exe", "Windows 安装包"),
    updater = unique(".app.tar.gz", "macOS 更新包"),
    ipa = unique(".ipa", "iOS 安装包");
  const pairs = [
    {
      source: windows,
      name: `OnlineBGClient-${version}-Windows-x64.exe`,
      format: "Windows 安装包",
      valid: (bytes) => bytes.subarray(0, 2).equals(Buffer.from("MZ")),
      platform: "windows-x86_64",
      label: "Windows",
      install: "运行安装程序",
    },
    {
      source: updater,
      name: `OnlineBGClient-${version}-macOS-arm64.app.tar.gz`,
      format: "macOS 更新包",
      valid: (bytes) => bytes.subarray(0, 2).equals(Buffer.from([31, 139])),
      platform: "darwin-aarch64",
      label: "macOS",
      install: "解压后移到「应用程序」",
    },
    {
      source: ipa,
      name: `OnlineBGClient-${version}-iOS-arm64-unsigned.ipa`,
      format: "iOS 安装包",
      valid: (bytes) =>
        bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
      label: "iOS（未签名）",
      install:
        "使用 Sideloadly、AltStore 或自有 Apple Developer 证书签名安装；最低 iOS 17，仅 iPhone",
    },
  ];
  await mkdir(out, { recursive: true });
  const assets = [],
    checks = [],
    downloads = [],
    targets = {};
  for (const item of pairs) {
    const bytes = await readFile(item.source);
    if (!item.valid(bytes)) throw Error(`${item.format}格式无效`);
    const target = join(out, item.name);
    await copyFile(item.source, target);
    assets.push(target);
    checks.push(
      `${createHash("sha256").update(bytes).digest("hex")}  ${item.name}`,
    );
    downloads.push(`| ${item.label} | \`${item.name}\` | ${item.install} |`);
    if (!item.platform) continue;
    const signature = (await readFile(item.source + ".sig", "utf8")).trim();
    if (!/^[A-Za-z0-9+/=]+$/.test(signature) || signature.length < 20)
      throw Error("更新签名无效");
    const signaturePath = target + ".sig";
    await writeFile(signaturePath, signature + "\n");
    assets.push(signaturePath);
    targets[item.platform] = {
      signature,
      url: `https://github.com/${repo}/releases/download/${tag}/${item.name}`,
    };
  }
  if (version === "0.4.1") {
    const name = "OnlineBGClient-fonts-0.4.1.zip";
    const source = resolve("artifacts/fonts", name);
    const bytes = await readFile(source);
    if (bytes.length < 1024 * 1024) throw Error("字体包内容不完整");
    const target = join(out, name);
    await copyFile(source, target);
    assets.push(target);
    checks.push(`${createHash("sha256").update(bytes).digest("hex")}  ${name}`);
    downloads.push(`| 共享字体（可选） | \`${name}\` | 按需下载 |`);
  }
  const latest = join(out, "latest.json");
  await writeFile(
    latest,
    JSON.stringify(
      {
        version,
        notes: release.changes.join("\n"),
        pub_date: `${release.date}T00:00:00Z`,
        platforms: targets,
      },
      null,
      2,
    ) + "\n",
  );
  assets.push(latest);
  const sums = join(out, "SHA256SUMS.txt");
  await writeFile(sums, checks.join("\n") + "\n");
  assets.push(sums);
  const notes = `## 更新内容\n\n${release.changes
    .map((change) => `- ${change}`)
    .join(
      "\n",
    )}\n\n## 下载\n\n| 平台 | 文件 | 安装 |\n| --- | --- | --- |\n${downloads.join(
    "\n",
  )}\n\n\`latest.json\`、\`.sig\` 和 \`SHA256SUMS.txt\` 用于自动更新与完整性校验，无需手动下载。\n`;
  return { assets, notes, tag, version };
}
