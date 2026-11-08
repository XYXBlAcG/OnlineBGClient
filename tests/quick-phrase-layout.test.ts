import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("keeps long quick phrases inside their buttons", () => {
  const css = readFileSync("src/styles.css", "utf8");
  const button =
    css.match(/\.quick-phrases button \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const text =
    css.match(/\.quick-phrases button > span \{([\s\S]*?)\n\}/)?.[1] ?? "";
  expect(button).toContain("display: block");
  expect(button).toContain("height: auto");
  expect(button).toContain("width: 100%");
  expect(text).toContain("overflow-wrap: anywhere");
  expect(text).toContain("white-space: normal");
  expect(text).toContain("line-height: 1.5");
  expect(css).toContain(".ui-popover *");
  expect(css).toContain("scrollbar-gutter: stable");
  expect(readFileSync("src/client/PhraseMenu.tsx", "utf8")).toContain(
    "<span>{text}</span>",
  );
});
