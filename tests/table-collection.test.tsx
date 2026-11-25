import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
const device = vi.hoisted(() => ({ mobile: false }));
vi.mock("../src/client/use-mobile", () => ({ useMobile: () => device.mobile }));
import { TableCollection } from "../src/client/ui/TableCollection";
afterEach(() => {
  device.mobile = false;
});
it("keeps desktop collections expanded", () => {
  const html = renderToStaticMarkup(
    <TableCollection title="玩家与收藏">
      <p>玩家资源</p>
    </TableCollection>,
  );
  expect(html).toContain("<details");
  expect(html).toContain("open=");
  expect(html).toContain("玩家资源");
});
it("opens mobile collections on demand instead of reserving a clipped player region", () => {
  device.mobile = true;
  const html = renderToStaticMarkup(
    <TableCollection title="玩家与收藏">
      <p>玩家资源</p>
    </TableCollection>,
  );
  expect(html).toContain("玩家与收藏");
  expect(html).toContain('aria-expanded="false"');
  expect(html).not.toContain("玩家资源");
});
