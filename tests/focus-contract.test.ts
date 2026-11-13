import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

it("routes game-surface focus rings through the theme focus token", () => {
  const experience = read("src/client/ui/experience.css");
  expect(experience).not.toMatch(/#2379d2|#2478c9/i);
  expect(experience).toMatch(
    /\.original-game button:focus-visible[\s\S]*?outline: 2px solid var\(--focus\);/,
  );
  const graphwar = read("src/client/graphwar/graphwar.css");
  expect(graphwar).not.toMatch(/#2379d2/i);
  expect(graphwar).toMatch(
    /\.game-avatar:focus-visible[\s\S]*?outline: 2px solid var\(--focus\);/,
  );
});
