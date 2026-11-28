import { expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { configureIosInfo } from "../scripts/ios-info.mjs";

it.skipIf(process.platform !== "darwin")(
  "merges real iOS permissions after project generation and derives both versions",
  async () => {
    const root = await mkdtemp(join(tmpdir(), "ios-info-"));
    const plist = join(root, "Info.plist");
    try {
      await writeFile(
        plist,
        '<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleShortVersionString</key><string>0.4.1</string><key>CFBundleIdentifier</key><string>xyx.blacg.onlinebgclient</string></dict></plist>',
      );
      await configureIosInfo(plist, "src-tauri/Info.ios.plist", "0.6.1");
      await configureIosInfo(plist, "src-tauri/Info.ios.plist", "0.6.1");
      const info = JSON.parse(
        execFileSync("plutil", ["-convert", "json", "-o", "-", plist], {
          encoding: "utf8",
        }),
      );
      expect(info).toMatchObject({
        CFBundleShortVersionString: "0.6.1",
        CFBundleVersion: "0.6.1",
        CFBundleIdentifier: "xyx.blacg.onlinebgclient",
        NSMicrophoneUsageDescription: expect.any(String),
        NSCameraUsageDescription: expect.any(String),
        UIBackgroundModes: ["audio"],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
