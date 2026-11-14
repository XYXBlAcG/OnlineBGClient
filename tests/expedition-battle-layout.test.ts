import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

it("bounds battle figures to their target so status rows stay visible", () => {
  const expedition = read("src/client/expedition/expedition.css");
  const table = read("src/client/expedition/table.css");
  expect(expedition).toMatch(
    /\.exp-hero \.exp-figure \{\s*height: clamp\(100px, 17dvh, 170px\);/,
  );
  const bounded = table.match(
    /\.expedition-table \.exp-unit \.exp-figure \{([^}]*)\}/,
  );
  expect(bounded).not.toBeNull();
  expect(bounded![1]).toContain("height: 100%");
  expect(bounded![1]).toContain("max-height: 100%");
  const target = table.match(
    /\.expedition-table \.exp-target \{([^}]*)\}/,
  );
  expect(target![1]).toContain("height: clamp(48px, 10dvh, 120px)");
});
