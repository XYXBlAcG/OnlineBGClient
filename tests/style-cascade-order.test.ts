import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const cssImportsOf = (source: string) =>
  [...source.matchAll(/^import "(\.[^"]+\.css)";$/gm)].map(
    (match) => match[1],
  );

it("loads the global style entry in the approved order", () => {
  expect(cssImportsOf(read("src/main.tsx"))).toEqual([
    "./client/ui/art-experience.css",
    "./client/ui/focus.css",
    "./client/ui/layers.css",
    "./styles.css",
    "./client/ui/experience.css",
    "./client/ui/social-experience.css",
    "./client/ui/mobile-landscape.css",
    "./client/ui/platform-controls.css",
    "./client/ui/mobile-usability.css",
    "./client/ui/mobile-home.css",
    "./client/ui/native-table.css",
  ]);
});

it("keeps the cascade order declaration before every rule", () => {
  expect(read("src/client/ui/layers.css").trim()).toBe(
    "@layer reset, tokens, base, primitives, app, games, mobile, utilities;",
  );
  expect(read("src/main.tsx")).toMatch(
    /import "\.\/client\/ui\/layers\.css";\s*import "\.\/styles\.css";/,
  );
});

it("keeps every @import ahead of the first rule in the global stylesheet", () => {
  const source = read("src/styles.css");
  const lines = source.split("\n");
  const firstRule = lines.findIndex(
    (line) => line.trim() && !line.trimStart().startsWith("@import"),
  );
  const lastImport = lines.reduce(
    (latest, line, index) =>
      line.trimStart().startsWith("@import") ? index : latest,
    -1,
  );
  expect(firstRule).toBeGreaterThan(-1);
  expect(lastImport).toBeLessThan(firstRule);
  expect(lines[0].trim()).toBe(
    '@import url("./client/ui/design-tokens.css");',
  );
});
