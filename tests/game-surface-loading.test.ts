import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { prefetchGameSurface } from "../src/client/OriginalGameLazy";

it("keeps the game surface out of the eager application entry", () => {
  const main = readFileSync("src/main.tsx", "utf8");
  expect(main).not.toContain('from "./client/OriginalGame"');
  expect(main).toContain('from "./client/OriginalGameLazy"');
  const surface = readFileSync("src/client/OriginalGameLazy.tsx", "utf8");
  expect(surface).toContain('import("./OriginalGame")');
});

it("prefetches the game surface without throwing", () => {
  expect(() => prefetchGameSurface()).not.toThrow();
});
