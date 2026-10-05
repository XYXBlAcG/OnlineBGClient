import {
  readdir,
  readFile,
  copyFile,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { resolve, join, extname, sep } from "node:path";
import { createHash } from "node:crypto";
export async function prepareRelease(input, output, version, tag) {
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version))
    throw new Error("应用版本无效");
  if (tag.startsWith("v") && tag !== `v${version}`)
    throw new Error("正式标签与应用版本不一致");
  if (!/^v[\w.-]+$|^preview-\d+-[a-f0-9]{7,40}$/.test(tag))
    throw new Error("发布标签无效");
  const root = resolve(input),
    out = resolve(output),
    names = await readdir(root, { recursive: true });
  const paths = names
    .map((name) => join(root, name))
    .filter((path) => !path.startsWith(out + sep));
  const windows = paths.filter((path) => extname(path) === ".exe"),
    mac = paths.filter((path) =>
      path.endsWith("OnlineBGClient-macOS-arm64.zip"),
    );
  if (windows.length !== 1) throw new Error("需要唯一 Windows 安装包");
  if (mac.length !== 1) throw new Error("需要唯一 macOS 安装包");
  const build = tag.startsWith("v") ? version : `${version}-${tag}`;
  const pairs = [
    [windows[0], `OnlineBGClient-${build}-Windows-x64.exe`, Buffer.from("MZ")],
    [mac[0], `OnlineBGClient-${build}-macOS-arm64.zip`, Buffer.from("PK")],
  ];
  const assets = [],
    checks = [];
  await mkdir(out, { recursive: true });
  for (const [source, name, magic] of pairs) {
    const data = await readFile(source);
    if (data.length < 4 || !data.subarray(0, 2).equals(magic))
      throw new Error(`安装包格式无效：${name}`);
    const target = join(out, name);
    await copyFile(source, target);
    assets.push(target);
    checks.push(`${createHash("sha256").update(data).digest("hex")}  ${name}`);
  }
  const sums = join(out, "SHA256SUMS.txt");
  await writeFile(sums, checks.join("\n") + "\n");
  assets.push(sums);
  return { assets, tag, version };
}
