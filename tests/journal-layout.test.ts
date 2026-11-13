import { readFileSync } from "node:fs";
import { parse } from "postcss";
import { expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function declarations(selector: string) {
  const values = new Map<string, string>();
  parse(read("src/client/expedition/journal.css")).walkRules((rule) => {
    if (rule.selector.trim() !== selector) return;
    rule.walkDecls((declaration) => {
      values.set(declaration.prop, declaration.value);
    });
  });
  return values;
}

it("keeps the journal header and tabs from shrinking into the scroll area", () => {
  for (const selector of [".exp-journal-header", ".exp-journal-tabs"]) {
    expect(declarations(selector).get("flex"), selector).toBe("none");
  }
});

it("gives every journal body a bounded, scrollable flex track", () => {
  for (const selector of [
    ".exp-journal-overview",
    ".exp-journal-legacy",
    ".exp-journal-catalog",
  ]) {
    const body = declarations(selector);
    expect(body.get("flex"), selector).toBe("1");
    expect(body.get("min-height"), selector).toBe("0");
  }
});

it("keeps the journal modal itself as a bounded flex column", () => {
  const journal = declarations(".exp-journal");
  expect(journal.get("display")).toBe("flex");
  expect(journal.get("flex-direction")).toBe("column");
  expect(journal.get("min-height")).toBe("0");
});
