import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const shellPath = join(root, "ios-native");
const bundleID = "xyx.blacg.onlinebgclient.shell";

const run = (command, args, cwd = root, env = process.env) =>
  execFileSync(command, args, { cwd, env, stdio: "inherit" });
const capture = (command, args) =>
  execFileSync(command, args, { cwd: root, encoding: "utf8" });

const devices = capture("idevice_id", ["-l"])
  .trim()
  .split("\n")
  .filter(Boolean);
const udid = process.env.DEVICE_UDID ?? devices[0];
if (!udid)
  throw new Error("没有连接手机。解锁手机、信任此电脑并重新连接 USB。");

const team = process.env.DEVELOPMENT_TEAM ?? "DBV9QXGHLB";
const lan =
  process.env.SHELL_BASE_URL ??
  `http://${capture("ipconfig", ["getifaddr", "en0"]).trim()}:1420`;

run("xcodegen", ["generate"], shellPath);
run(
  "xcodebuild",
  [
    "-project",
    "OnlineBGShell.xcodeproj",
    "-scheme",
    "OnlineBGShell",
    "-configuration",
    "Debug",
    "-destination",
    "generic/platform=iOS",
    "-derivedDataPath",
    ".build-device",
    "-allowProvisioningUpdates",
    `DEVELOPMENT_TEAM=${team}`,
    `SHELL_BASE_URL=${lan}`,
    "build",
  ],
  shellPath,
);

const app = join(
  shellPath,
  ".build-device/Build/Products/Debug-iphoneos/OnlineBGShell.app",
);
run("ideviceinstaller", ["-u", udid, "install", app]);

try {
  run("idevicedebug", ["-u", udid, "--detach", "run", bundleID]);
} catch {
  console.log(
    "安装完成。命令行启动需要匹配的 Developer Disk Image，请直接在手机上打开 OnlineBG Shell。",
  );
}
console.log(`Installed on ${udid}; WebView base ${lan}`);
