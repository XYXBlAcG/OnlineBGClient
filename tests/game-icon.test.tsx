import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { GameIcon } from "../src/client/GameIcon";

it("renders the billiards icon for the pool game card", () => {
  const html = renderToStaticMarkup(<GameIcon kind="pool" />);
  expect(html).toContain('data-game-icon="pool"');
  expect(html).toContain('r="15"');
  expect(html).not.toContain("M6 26 41 9 28 40l-6-10-9-4Z");
});
