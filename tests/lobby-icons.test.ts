import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("keeps every game icon style in the shared icon stylesheet", () => {
  const icons = readFileSync("src/client/ui/game-icons.css", "utf8");
  for (const kind of ["graphwar", "scmj"]) {
    expect(icons).toContain(`data-game-icon="${kind}"`);
    expect(
      readFileSync(
        `src/client/${kind === "scmj" ? "mahjong/mahjong" : "graphwar/graphwar"}.css`,
        "utf8",
      ),
    ).not.toContain(`game-symbol[data-game-icon="${kind}"]`);
  }
});
