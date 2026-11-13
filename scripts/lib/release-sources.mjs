import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function readReleaseSources(root = process.cwd()) {
  const read = (path) => readFile(join(root, path), "utf8");
  const [packageSource, tauriSource, cargoSource, iosSource, historySource] =
    await Promise.all([
      read("package.json"),
      read("src-tauri/tauri.conf.json"),
      read("src-tauri/Cargo.toml"),
      read("ios-native/project.yml"),
      read("src/client/releases.json"),
    ]);
  return {
    version: JSON.parse(packageSource).version,
    tauri: { version: JSON.parse(tauriSource).version },
    cargo: { version: cargoSource.match(/^version\s*=\s*"([^"]+)"/m)?.[1] },
    ios: {
      version: iosSource.match(/CFBundleShortVersionString:\s*"([^"]+)"/)?.[1],
    },
    releases: JSON.parse(historySource).map((entry) => entry.version),
  };
}

export function releaseVersionMismatches(sources) {
  const mismatches = [];
  if (sources.tauri.version !== "../package.json")
    mismatches.push({
      source: "src-tauri/tauri.conf.json",
      message: "tauri.conf.json 的 version 应指向 ../package.json",
    });
  if (sources.cargo.version !== sources.version)
    mismatches.push({
      source: "src-tauri/Cargo.toml",
      message: `Cargo 版本 ${sources.cargo.version ?? "缺失"} 与 package.json 的 ${sources.version} 不一致`,
    });
  if (sources.ios.version !== sources.version)
    mismatches.push({
      source: "ios-native/project.yml",
      message: `iOS 短版本 ${sources.ios.version ?? "缺失"} 与 package.json 的 ${sources.version} 不一致`,
    });
  if (!sources.releases.includes(sources.version))
    mismatches.push({
      source: "src/client/releases.json",
      message: `缺少 package.json 版本 ${sources.version} 的更新记录`,
    });
  return mismatches;
}
