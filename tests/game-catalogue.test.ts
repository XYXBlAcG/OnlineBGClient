import { expect, it } from "vitest";
import { gameCatalogue, gameKinds } from "../src/domain/catalogue";
import { gameRules } from "../src/domain/rule-catalogue";

it("keeps rule plugins out of the client-facing catalogue", () => {
  for (const kind of gameKinds)
    expect("rules" in gameCatalogue[kind]).toBe(false);
  expect(Object.keys(gameRules).sort()).toEqual([...gameKinds].sort());
});
