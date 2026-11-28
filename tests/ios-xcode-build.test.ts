import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

it("reruns the Rust build when the embedded web bundle changes", () => {
  const build = read("src-tauri/build.rs");
  expect(build).toContain("cargo:rerun-if-changed");
  expect(build).toContain('../dist');
});

it("rebuilds the web bundle before both Xcode projects embed it", () => {
  for (const project of [
    "src-tauri/gen/apple/project.yml",
    "ios-native/project.yml",
  ]) {
    const source = read(project);
    expect(source).toContain("xcode-web-build.sh");
    expect(source).toContain("basedOnDependencyAnalysis: false");
  }
  expect(read("ios-native/project.yml")).toContain("name: Build Web");
  expect(read("src-tauri/gen/apple/project.yml")).toContain(
    "name: Build Web Assets",
  );
});

it("detects stale or missing web builds before Xcode bundles them", async () => {
  const root = await mkdtemp(join(tmpdir(), "xcode-web-build-"));
  try {
    const script = new URL(
      `../scripts/xcode-web-build.mjs`,
      import.meta.url,
    ).pathname;
    const state = async () =>
      JSON.parse(
        execFileSync(
          process.execPath,
          ["--input-type=module", "-e", `
            import { webBuildState } from ${JSON.stringify(script)};
            console.log(JSON.stringify(await webBuildState(${JSON.stringify(root)})));
          `],
          { encoding: "utf8" },
        ),
      );
    expect((await state()).stale).toBe(true);

    await mkdir(join(root, "dist"), { recursive: true });
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "entry.ts"), "export {};\n");
    await writeFile(join(root, "dist", "index.html"), "<!doctype html>\n");
    const future = new Date(Date.now() + 10_000);
    await utimes(join(root, "dist", "index.html"), future, future);
    const fresh = await state();
    expect(fresh.stale).toBe(false);

    const newer = new Date(Date.now() + 20_000);
    await utimes(join(root, "src", "entry.ts"), newer, newer);
    const stale = await state();
    expect(stale.stale).toBe(true);
    expect(stale.reason).toContain("源码");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("selects a project-compatible Node from the Xcode environment", () => {
  const script = read("scripts/xcode-web-build.sh");
  expect(script).toContain(".node-version");
  expect(script).toContain("${BEST_VERSION}");
  expect(script).toContain("/opt/homebrew/bin/node");
  expect(script).toContain("-ge \"$REQUIRED_MAJOR\"");
});

it("exposes explicit Xcode entry points", () => {
  const scripts = JSON.parse(read("package.json")).scripts;
  expect(scripts["ios:shell"]).toContain("xcodegen generate");
  expect(scripts["ios:xcode"]).toContain("ios:shell");
  expect(scripts["ios:build"]).toContain("tauri ios build");
});
