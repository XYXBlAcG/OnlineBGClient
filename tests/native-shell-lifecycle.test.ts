import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it.skipIf(process.platform !== "darwin")(
  "restores local pages and exits failed native Web sessions",
  async () => {
    const root = await mkdtemp(join(tmpdir(), "native-shell-lifecycle-"));
    try {
      const binary = join(root, "lifecycle");
      execFileSync(
        "xcrun",
        [
          "swiftc",
          "-module-cache-path",
          join(root, "cache"),
          "ios-native/OnlineBGShell/ShellWebState.swift",
          "ios-native/OnlineBGShell/LocalWebServer.swift",
          "tests/swift/native-shell-lifecycle.swift",
          "-o",
          binary,
        ],
        { stdio: "pipe", timeout: 120000 },
      );
      expect(
        execFileSync(binary, [], { encoding: "utf8", timeout: 15000 }),
      ).toContain("real local HTTP passed");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  150000,
);
