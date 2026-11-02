import React from "react";
import { act, create } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi, afterEach } from "vitest";
import { GameLibrary } from "../src/client/lobby/GameLibrary";
import { Button } from "../src/client/ui/Controls";
import { darkTheme, lightTheme, ThemeRegistry } from "../src/client/themes";
afterEach(() => vi.unstubAllGlobals());
it("游戏目录保留选择、收藏、筛选和空结果状态", () => {
  const select = vi.fn(),
    favorite = vi.fn();
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <GameLibrary
        selected="uno"
        favorites={[]}
        recent={[]}
        onSelect={select}
        onFavorite={favorite}
      />,
    );
  });
  const uno = tree.root
    .findAllByType("button")
    .find((button) => button.props["aria-label"] === "选择UNO")!;
  expect(uno.props["aria-pressed"]).toBe(true);
  act(() => uno.props.onClick());
  expect(select).toHaveBeenCalledWith("uno");
  act(() => tree.root.findByProps({ "aria-label": "收藏UNO" }).props.onClick());
  expect(favorite).toHaveBeenCalledWith("uno");
  act(() =>
    tree.root
      .findByProps({ "aria-label": "搜索游戏" })
      .props.onChange({ target: { value: "不存在的游戏" } }),
  );
  expect(
    tree.root
      .findByProps({ role: "status" })
      .findByType("strong")
      .children.join(""),
  ).toContain("没有找到");
  act(() => tree.unmount());
});
it("主操作和危险操作共享控件，完整保留禁用、忙碌及辅助语义", () => {
  const html = renderToStaticMarkup(
    <Button variant="primary" disabled aria-busy>
      准备中
    </Button>,
  );
  expect(html).toContain('data-button-variant="primary"');
  expect(html).toContain('disabled=""');
  expect(html).toContain('aria-busy="true"');
  expect(
    renderToStaticMarkup(<Button variant="danger">删除</Button>),
  ).toContain('data-button-variant="danger"');
});
it("新默认主题保留既有主题协议和自定义强调色", () => {
  const registry = new ThemeRegistry();
  registry.register({
    ...lightTheme,
    id: "custom",
    tokens: { ...lightTheme.tokens, accent: "#663399" },
  });
  expect(registry.get("custom").tokens.accent).toBe("#663399");
  for (const theme of [lightTheme, darkTheme]) expect(theme.apiVersion).toBe(1);
  expect(lightTheme.tokens.canvas).toBe("#f5f2ea");
});
it("浅深主题的正文与主要操作保持可读对比度", () => {
  const luminance = (hex: string) => {
    const channels = hex
      .slice(1)
      .match(/.{2}/g)!
      .map((part) => parseInt(part, 16) / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const theme of [lightTheme, darkTheme])
    for (const [foreground, background] of [
      [theme.tokens.text, theme.tokens.surface],
      [theme.tokens["accent-text"], theme.tokens.accent],
    ]) {
      const a = luminance(
          foreground.length === 4
            ? "#" +
                foreground
                  .slice(1)
                  .split("")
                  .map((c) => c + c)
                  .join("")
            : foreground,
        ),
        b = luminance(background);
      expect(
        (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
    }
});
