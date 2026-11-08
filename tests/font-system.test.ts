import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("uses system fonts and downloads the shared font pack only when needed", () => {
  expect(existsSync("src/client/fonts")).toBe(false);
  expect(existsSync("src-tauri/resources/fonts")).toBe(false);
  expect(existsSync("fonts/SFNS.woff2")).toBe(true);
  expect(existsSync("fonts/PingFangSC-Regular.woff2")).toBe(true);
  const main = readFileSync("src/main.tsx", "utf8");
  expect(main).toContain('import { FontAssets } from "./client/fonts"');
  expect(main).toContain("<FontAssets />");
  expect(main).not.toContain("./client/fonts.css");
  const client = readFileSync("src/client/fonts.tsx", "utf8");
  expect(client).toContain("systemFonts");
  expect(client).toContain('invoke<string[]>("ensure_fonts")');
  expect(client).toContain('convertFileSrc("SFNS.woff2", "fonts")');
  const rust = readFileSync("src-tauri/src/fonts.rs", "utf8");
  expect(rust).toContain("OnlineBGClient-fonts-0.4.1.zip");
  expect(rust).toContain("ensure_fonts");
  expect(readFileSync("src-tauri/tauri.conf.json", "utf8")).not.toContain(
    '"resources/fonts/"',
  );
  expect(readFileSync("package.json", "utf8")).toContain('"fonts:pack"');
});
