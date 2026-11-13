import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

it("scopes replay tables under the shared playing-room layout", () => {
  const records = read("src/client/Records.tsx");
  expect(records).toMatch(
    /className="playing-room replay-stage"[\s\S]{0,80}<OriginalGameLazy/,
  );
  const styles = read("src/styles.css");
  expect(styles).toMatch(/\.replay-panel \.replay-stage \{[\s\S]*?display: flex;/);
  expect(styles).toMatch(
    /\.replay-panel \.replay-stage \.original-game \{[\s\S]*?flex: 1;/,
  );
});
