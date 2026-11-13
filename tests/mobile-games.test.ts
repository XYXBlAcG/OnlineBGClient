import { expect, it } from "vitest";
import {
  gameCatalogue,
  gameKinds,
  mobileGameKinds,
} from "../src/domain/catalogue";

it("每个游戏显式声明手机可用性", () => {
  for (const kind of gameKinds)
    expect(typeof gameCatalogue[kind].mobile).toBe("boolean");
});

it("手机大厅包含秘塔远征并排除 Graphwar", () => {
  expect(mobileGameKinds).toContain("expedition");
  expect(mobileGameKinds).not.toContain("graphwar");
  expect(gameCatalogue.graphwar.mobile).toBe(false);
});
