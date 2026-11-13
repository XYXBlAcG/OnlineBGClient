import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Button } from "../src/client/ui/Controls";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

it("renders the primary button through the single data variant contract", () => {
  const html = renderToStaticMarkup(<Button variant="primary">创建房间</Button>);
  expect(html).toContain('data-button-variant="primary"');
  expect(html).not.toContain("primary-button");
});

it("keeps one visual source for legacy primary buttons", () => {
  const styles = read("src/styles.css");
  expect(styles).toContain("button.primary-button");
  const legacyBlock = /button\.primary-button[^{]*\{[\s\S]*?\}/.exec(styles)?.[0];
  expect(legacyBlock).toBeDefined();
  expect(legacyBlock).toContain("background: var(--action-primary)");
  expect(legacyBlock).toContain("padding: 10px 18px");
  const variantBlock =
    /button\[data-button-variant="primary"\][^{]*\{[\s\S]*?\}/.exec(
      read("src/client/ui/design-tokens.css"),
    )?.[0];
  expect(variantBlock).toContain("background: var(--action-primary)");
  expect(variantBlock).toContain("color: var(--action-foreground)");
  expect(variantBlock).toContain("padding: 10px 18px");
});
