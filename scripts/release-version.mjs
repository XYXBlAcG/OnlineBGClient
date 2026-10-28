import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export async function releaseVersion() {
  const pkg = JSON.parse(await readFile("package.json", "utf8")),
    config = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8")),
    cargo = await readFile("src-tauri/Cargo.toml", "utf8"),
    history = JSON.parse(await readFile("src/client/releases.json", "utf8"));
  if (
    !/^\d+\.\d+\.\d+$/.test(pkg.version) ||
    config.version !== "../package.json" ||
    cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1] !== pkg.version
  )
    throw Error("版本源不一致");
  if (!history.some((release) => release.version === pkg.version))
    throw Error("当前版本缺少更新记录");
  return pkg.version;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(await releaseVersion());
