import { readFileSync } from "node:fs";
import { parse } from "postcss";
import { expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function layerTokens() {
  const css = read("src/client/ui/design-tokens.css");
  return [...css.matchAll(/--layer-([a-z-]+):\s*(\d+);/g)].map(
    ([, name, value]) => [name, Number(value)] as const,
  );
}

it("orders layer tokens from in-flow surfaces to topmost overlays", () => {
  const tokens = layerTokens();
  expect(tokens.map(([name]) => name)).toEqual([
    "chat",
    "effects",
    "practice",
    "party",
    "drawer",
    "celebration",
    "dialog-overlay",
    "dialog",
    "popover",
    "notice",
  ]);
  const values = tokens.map(([, value]) => value);
  expect(values).toEqual([...values].sort((left, right) => left - right));
  expect(new Set(values).size).toBe(values.length);
});

it("assigns every shared stacking surface to its layer token", () => {
  const surfaces: [string, string, string][] = [
    ["src/styles.css", ".ui-overlay", "--layer-dialog-overlay"],
    ["src/styles.css", ".ui-panel", "--layer-dialog"],
    ["src/styles.css", ".ui-popover", "--layer-popover"],
    ["src/styles.css", ".notification-stack", "--layer-notice"],
    ["src/client/party/party.css", ".party-stage", "--layer-party"],
    ["src/client/achievements.css", ".achievement-toasts", "--layer-notice"],
    ["src/client/ui/FpsMeter.css", ".fps-meter", "--layer-notice"],
    [
      "src/client/expedition/table.css",
      ".exp-drawer-backdrop",
      "--layer-drawer",
    ],
    [
      "src/client/expedition/table.css",
      ".exp-relic-layer",
      "--layer-celebration",
    ],
  ];
  for (const [file, selector, token] of surfaces) {
    const values: string[] = [];
    parse(read(file)).walkRules((rule) => {
      const selectors = rule.selector.split(",").map((item) => item.trim());
      if (!selectors.includes(selector)) return;
      rule.walkDecls("z-index", (declaration) => {
        values.push(declaration.value);
      });
    });
    expect(values, `${selector} 应使用 ${token}`).toEqual([`var(${token})`]);
  }
});

it("keeps page-level chrome below drawers and dialogs", () => {
  const toolbar = /\.app-toolbar \{[\s\S]*?z-index:\s*(\d+);/.exec(
    read("src/styles.css"),
  );
  expect(toolbar).not.toBeNull();
  expect(Number(toolbar?.[1])).toBeLessThan(50);
  const token = (name: string) =>
    layerTokens().find(([key]) => key === name)?.[1] ?? 0;
  expect(token("drawer")).toBeLessThan(token("dialog-overlay"));
  expect(token("celebration")).toBeLessThan(token("dialog-overlay"));
  expect(token("dialog-overlay")).toBeLessThan(token("dialog"));
  expect(token("dialog")).toBeLessThan(token("popover"));
  expect(token("popover")).toBeLessThan(token("notice"));
});

it("routes safe areas and the on-screen keyboard through shared viewport tokens", () => {
  const tokens = read("src/client/ui/design-tokens.css");
  for (const name of [
    "--safe-top",
    "--safe-right",
    "--safe-bottom",
    "--safe-left",
    "--app-toolbar-total",
  ])
    expect(tokens).toContain(`${name}:`);
  const styles = read("src/styles.css");
  expect(styles).toMatch(
    /\.app-toolbar \{[\s\S]*?height: var\(--app-toolbar-total\);/,
  );
  expect(styles).toMatch(
    /\.room-sidebar \{[\s\S]*?--mobile-keyboard-bottom/,
  );
  expect(styles).not.toMatch(/\.mobile-shell \.chat-panel \{/);
});
