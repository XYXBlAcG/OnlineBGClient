import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { StyleGallery } from "../src/client/dev/StyleGallery";
import { sidebarBreakpoint } from "../src/client/sidebar-layout";
import {
  applyTheme,
  darkTheme,
  lightTheme,
  themeSchema,
} from "../src/client/themes";
import { breakpoints } from "../src/client/ui/breakpoints";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

it("keeps every theme token in the schema, both built-in schemes, and the document contract", () => {
  const tokens = Object.keys(themeSchema.shape.tokens.shape).sort();
  expect(Object.keys(lightTheme.tokens).sort()).toEqual(tokens);
  expect(Object.keys(darkTheme.tokens).sort()).toEqual(tokens);
  expect(tokens).toEqual(
    expect.arrayContaining(["info", "success", "warning", "danger"]),
  );
});

it("publishes semantic status tokens through the theme application", () => {
  const setProperty = vi.fn();
  vi.stubGlobal("document", {
    documentElement: {
      dataset: {} as Record<string, string>,
      style: { colorScheme: "", setProperty },
    },
  });
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  try {
    applyTheme("light");
    for (const name of ["info", "success", "warning", "danger"] as const)
      expect(setProperty).toHaveBeenCalledWith(
        `--${name}`,
        lightTheme.tokens[name],
      );
    applyTheme("dark");
    expect(setProperty).toHaveBeenCalledWith(
      "--danger",
      darkTheme.tokens.danger,
    );
  } finally {
    vi.unstubAllGlobals();
  }
});

it("declares structural and layer tokens once in the design token source", () => {
  const tokens = read("src/client/ui/design-tokens.css");
  const structural = [
    "--touch-target",
    "--overlay",
    "--overlay-hover",
    "--overlay-pressed",
    "--skeleton",
    "--divider",
    "--shadow-low",
    "--shadow-med",
    "--shadow-high",
    "--radius-pill",
  ];
  for (const token of structural) expect(tokens).toContain(`${token}:`);
  const layers = [...tokens.matchAll(/--layer-([a-z-]+):/g)].map(
    (match) => match[1],
  );
  expect(layers).toHaveLength(10);
  expect(new Set(layers).size).toBe(layers.length);
  expect(read("src/styles.css")).not.toMatch(/--layer-[a-z-]+\s*:/);
});

it("publishes the cascade order before global styles", () => {
  expect(read("src/client/ui/layers.css").trim()).toBe(
    "@layer reset, tokens, base, primitives, app, games, mobile, utilities;",
  );
  expect(read("src/main.tsx")).toMatch(
    /import "\.\/client\/ui\/layers\.css";\s*import "\.\/styles\.css";/,
  );
});

it("derives the sidebar breakpoint from the shared breakpoint source", () => {
  expect(sidebarBreakpoint).toBe(breakpoints.sidebar);
  expect(Object.values(breakpoints)).toEqual([640, 760, 900, 1100]);
});

it("renders the development gallery with semantic status and responsive panels", () => {
  const html = renderToStaticMarkup(<StyleGallery />);
  expect(html).toContain("app-shell");
  for (const marker of [
    "样式陈列室",
    "颜色 token",
    "桌面面板",
    "手机面板",
    "控件状态",
    "--info",
    "--success",
    "--warning",
    "--danger",
  ])
    expect(html).toContain(marker);
  for (const tone of ["info", "success", "warning", "danger"])
    expect(html).toContain(`data-tone="${tone}"`);
});

it("keeps the gallery inside the approved token and breakpoint boundary", () => {
  const gallery = read("src/client/dev/StyleGallery.module.css");
  expect(gallery).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  const widths = [...gallery.matchAll(/@media[^{]*max-width:\s*(\d+px)/g)].map(
    (match) => match[1],
  );
  expect(widths.length).toBeGreaterThan(0);
  const approved = Object.values(breakpoints).map((value) => `${value}px`);
  for (const width of widths) expect(approved).toContain(width);
});
