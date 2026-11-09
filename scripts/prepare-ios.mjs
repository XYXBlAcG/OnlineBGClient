import { execFileSync } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function retry(label, task, attempts = 6) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      console.warn(`${label} 第 ${attempt} 次失败，准备重试`);
      await sleep(attempt * 5000);
    }
  }
  throw lastError;
}

async function clone(tag, url, target) {
  if (await exists(`${target}/Package.swift`)) return;
  await rm(target, { recursive: true, force: true });
  await retry(`克隆 ${url}`, async () => {
    await mkdir(dirname(target), { recursive: true });
    execFileSync(
      "git",
      ["clone", "--depth", "1", "--branch", tag, url, target],
      { stdio: "inherit" },
    );
  });
}

async function download(tag, repo, asset, target) {
  if (await exists(target)) return;
  await mkdir(dirname(target), { recursive: true });
  await retry(`下载 ${asset}`, async () => {
    execFileSync(
      "gh",
      [
        "release",
        "download",
        tag,
        "--repo",
        repo,
        "--pattern",
        asset,
        "--dir",
        dirname(target),
        "--clobber",
      ],
      { stdio: "inherit" },
    );
  });
}

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
await cp(source, target, {
  recursive: true,
  filter: (path) =>
    !path.includes("/.build") && !path.endsWith("Package.resolved"),
});
await mkdir(resolve("src-tauri/gen/apple/Externals"), { recursive: true });

const livekitRoot = resolve("src-tauri/gen/apple/.livekit");
const livekit = resolve(livekitRoot, "client-sdk-swift");
const webrtc = resolve(livekitRoot, "webrtc-xcframework");
await mkdir(livekitRoot, { recursive: true });

await clone(
  "2.9.0",
  "https://github.com/livekit/client-sdk-swift.git",
  livekit,
);
await clone(
  "137.7151.10",
  "https://github.com/livekit/webrtc-xcframework.git",
  webrtc,
);

const webrtcZip = resolve(webrtc, "LiveKitWebRTC.xcframework.zip");
await download(
  "137.7151.10",
  "livekit/webrtc-xcframework",
  "LiveKitWebRTC.xcframework.zip",
  webrtcZip,
);
if (!(await exists(resolve(webrtc, "LiveKitWebRTC.xcframework"))))
  execFileSync("unzip", ["-q", "-o", webrtcZip, "-d", webrtc], {
    stdio: "inherit",
  });
await writeFile(
  resolve(webrtc, "Package.swift"),
  `// swift-tools-version:5.9
import PackageDescription
let package = Package(
  name: "LiveKitWebRTC",
  platforms: [.iOS(.v13), .macOS(.v10_15), .macCatalyst(.v14)],
  products: [.library(name: "LiveKitWebRTC", targets: ["LiveKitWebRTC"])],
  targets: [.binaryTarget(name: "LiveKitWebRTC", path: "LiveKitWebRTC.xcframework")]
)
`,
);

const livekitPackage = resolve(livekit, "Package.swift");
let manifest = await readFile(livekitPackage, "utf8");
manifest = manifest
  .replace(
    '.package(url: "https://github.com/livekit/webrtc-xcframework.git", exact: "137.7151.10"),',
    '.package(path: "../webrtc-xcframework"),',
  );
if (!manifest.includes('path: "../webrtc-xcframework"'))
  throw new Error("LiveKit Package.swift 依赖替换失败");
await writeFile(livekitPackage, manifest);
