import {
  readdir,
  readFile,
  copyFile,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { resolve, join, basename, sep } from "node:path";
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
    mac = unique(".dmg", "macOS 安装包"),
    updater = unique(".app.tar.gz", "macOS 更新包");
  const pairs = [
    [windows, `OnlineBGClient-${version}-Windows-x64.exe`],
    [mac, `OnlineBGClient-${version}-macOS-arm64.dmg`],
    [updater, `OnlineBGClient-${version}-macOS-arm64.app.tar.gz`],
  ];
  await mkdir(out, { recursive: true });
  const assets = [],
    checks = [],
    targets = {};
  for (const [source, name] of pairs) {
    const bytes = await readFile(source);
    if (
      name.endsWith(".exe") &&
      !bytes.subarray(0, 2).equals(Buffer.from("MZ"))
    )
      throw Error("Windows 安装包格式无效");
    if (
      name.endsWith(".dmg") &&
      (bytes.length < 512 ||
        bytes.subarray(bytes.length - 512, bytes.length - 508).toString() !==
          "koly")
    )
      throw Error("macOS 安装包格式无效");
    if (
      name.endsWith(".gz") &&
      !bytes.subarray(0, 2).equals(Buffer.from([31, 139]))
    )
      throw Error("macOS 更新包格式无效");
    const target = join(out, name);
    await copyFile(source, target);
    assets.push(target);
    checks.push(`${createHash("sha256").update(bytes).digest("hex")}  ${name}`);
    if (!name.endsWith(".dmg")) {
      const signature = (await readFile(source + ".sig", "utf8")).trim();
      if (!/^[A-Za-z0-9+/=]+$/.test(signature) || signature.length < 20)
        throw Error("更新签名无效");
      const signaturePath = target + ".sig";
      await writeFile(signaturePath, signature + "\n");
      assets.push(signaturePath);
      targets[name.endsWith(".exe") ? "windows-x86_64" : "darwin-aarch64"] = {
        signature,
        url: `https://github.com/${repo}/releases/download/${tag}/${name}`,
      };
    }
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
  return { assets, tag, version };
}
