import { execFileSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const metadata = JSON.parse(
  execFileSync(
    "cargo",
    [
      "metadata",
      "--manifest-path",
      "src-tauri/Cargo.toml",
      "--format-version",
      "1",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  ),
);
const tauri = metadata.packages.find((pkg) => pkg.name === "tauri");
if (!tauri) throw new Error("找不到 tauri crate");
const source = resolve(dirname(tauri.manifest_path), "mobile/ios-api");
const target = resolve("src-tauri/gen/apple/.tauri/tauri-api");
await rm(target, { recursive: true, force: true });
await mkdir(dirname(target), { recursive: true });
await mkdir(resolve("src-tauri/gen/apple/Externals"), { recursive: true });
await cp(source, target, {
  recursive: true,
  filter: (path) =>
    !path.includes("/.build") && !path.endsWith("Package.resolved"),
});
