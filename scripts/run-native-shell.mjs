import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const shellPath = join(root, "ios-native");
process.chdir(root);

const runtimeVersion = "27.0";
const deviceType = "com.apple.CoreSimulator.SimDeviceType.iPhone-18-Pro";
const deviceName = "iPhone 18 Pro";
const bundleID = "xyx.blacg.onlinebgclient.shell";

const run = (command, args, cwd = root) =>
  execFileSync(command, args, { cwd, stdio: "inherit" });
const capture = (command, args) =>
  execFileSync(command, args, { cwd: root, encoding: "utf8" });

run("npm", ["run", "build"], root);
run("xcodegen", ["generate"], shellPath);

const runtimes = JSON.parse(
  capture("xcrun", ["simctl", "list", "runtimes", "-j"]),
);
const runtimeList = Array.isArray(runtimes)
  ? runtimes
  : (runtimes.runtimes ??
    Object.entries(runtimes).map(([identifier, value]) => ({
      ...value,
      identifier: value.identifier ?? identifier,
      runtimeIdentifier:
        value.runtimeIdentifier ?? value.identifier ?? identifier,
    })));
const runtime = runtimeList.find(
  (item) => item.version === runtimeVersion && item.isAvailable !== false,
);
if (!runtime) {
  throw new Error(
    `缺少 iOS ${runtimeVersion} Simulator runtime。先运行: xcodebuild -downloadPlatform iOS -buildVersion ${runtimeVersion}`,
  );
}

const devices = JSON.parse(
  capture("xcrun", ["simctl", "list", "devices", "-j"]),
);
const runtimeIdentifier = runtime.runtimeIdentifier ?? runtime.identifier;
const available = devices.devices[runtimeIdentifier] ?? [];
let device = available.find(
  (item) =>
    item.deviceTypeIdentifier === deviceType && item.isAvailable !== false,
);
if (!device) {
  const udid = capture("xcrun", [
    "simctl",
    "create",
    deviceName,
    deviceType,
    runtimeIdentifier,
  ]).trim();
  device = { udid };
}

try {
  run("xcrun", ["simctl", "boot", device.udid]);
} catch {}
run("xcrun", ["simctl", "bootstatus", device.udid, "-b"]);
run("open", ["/Applications/Xcode.app/Contents/Applications/DeviceHub.app"]);

run(
  "xcodebuild",
  [
    "-project",
    "OnlineBGShell.xcodeproj",
    "-scheme",
    "OnlineBGShell",
    "-configuration",
    "Debug",
    "-sdk",
    "iphonesimulator",
    "-destination",
    `platform=iOS Simulator,id=${device.udid}`,
    "-derivedDataPath",
    ".build",
    "build",
    "CODE_SIGNING_ALLOWED=NO",
  ],
  shellPath,
);

run("xcrun", [
  "simctl",
  "install",
  device.udid,
  join(
    shellPath,
    ".build/Build/Products/Debug-iphonesimulator/OnlineBGShell.app",
  ),
]);
run("xcrun", ["simctl", "launch", device.udid, bundleID]);
console.log(`Native shell running on ${deviceName} (iOS ${runtimeVersion})`);
