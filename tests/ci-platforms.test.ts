import { expect, it } from "vitest";
import { selectPlatforms } from "../scripts/ci-platforms.mjs";
import { readFileSync } from "node:fs";

it("selects Windows alone for an explicit push trailer", () => {
  expect(
    selectPlatforms({
      head_commit: { message: "Fix startup\n\nCI-Platforms: windows" },
    }).map((p) => p.runner),
  ).toEqual(["windows-2022"]);
});
it("keeps both platforms for normal pushes and selects manual runs", () => {
  expect(
    selectPlatforms({ head_commit: { message: "Fix startup" } }),
  ).toHaveLength(2);
  expect(
    selectPlatforms({ inputs: { platform: "windows" } }).map((p) => p.name),
  ).toEqual(["Windows-x64"]);
  expect(
    selectPlatforms({ inputs: { platform: "macos" } }).map((p) => p.name),
  ).toEqual(["macOS-arm64"]);
});
it("cannot omit a platform from a tagged release", () => {
  expect(
    selectPlatforms({
      ref: "refs/tags/v0.1.0",
      head_commit: { message: "CI-Platforms: windows" },
    }),
  ).toHaveLength(2);
});
it("gates native packaging on browser checks and omits Windows AI smoke", () => {
  const workflow = readFileSync(".github/workflows/desktop.yml", "utf8");
  const smoke = workflow.indexOf("run: npm run verify:smoke");
  expect(smoke).toBeGreaterThan(workflow.indexOf("run: npm run hosting:build"));
  expect(workflow.indexOf("- uses: tauri-apps/tauri-action@")).toBeGreaterThan(
    smoke,
  );
  expect(workflow).not.toContain("run: node scripts/native-smoke-runner.mjs");
  expect(workflow).toContain("cache-workspace-crates: true");
});
