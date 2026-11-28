import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exposeSwiftEntryPoints } from "../scripts/ios-swift-exports.mjs";
it("exports only C entry points from vendored Swift sources and is idempotent", async () => {
  const root = await mkdtemp(join(tmpdir(), "swift-entry-"));
  try {
    await mkdir(join(root, "Sources"));
    const file = join(root, "Sources", "Plugin.swift");
    const source =
      '@_cdecl("plugin_init")\nfunc initialize() {}\nfunc internalWork() {}\n';
    await writeFile(file, source);
    await exposeSwiftEntryPoints(root);
    await exposeSwiftEntryPoints(root);
    expect(await readFile(file, "utf8")).toBe(
      source.replace("func initialize", "public func initialize"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
