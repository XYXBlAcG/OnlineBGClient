import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GameIcon } from "../src/client/GameIcon";
import { gameCatalogue, gameKinds } from "../src/domain/catalogue";

describe("game icons", () => {
  for (const kind of gameKinds)
    it(`为 ${gameCatalogue[kind].name} 渲染 SVG 图标`, () => {
      const html = renderToStaticMarkup(<GameIcon kind={kind} />);
      expect(html).toContain("<svg");
    });
});
