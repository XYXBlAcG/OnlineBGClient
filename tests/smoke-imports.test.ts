import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { parse } from "@babel/parser";
import { expect, it } from "vitest";

const imports = readdirSync("scripts")
  .filter((file) => file.endsWith(".mjs"))
  .flatMap((file) =>
    parse(readFileSync(resolve("scripts", file), "utf8"), {
      sourceType: "module",
    }).program.body.flatMap((node) =>
      node.type === "ImportDeclaration" &&
      node.source.value.startsWith("../src/")
        ? [{ file, source: node.source.value }]
        : [],
    ),
  );

it.each(imports)(
  "loads $file source import $source in the script's Node runtime",
  ({ source }) => {
    const url = pathToFileURL(resolve("scripts", source)).href;
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", `await import(${JSON.stringify(url)})`],
      {
        encoding: "utf8",
        timeout: 10000,
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
  },
);

it("loads the full catalogue through the project's TypeScript loader", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      'import { tsImport } from "tsx/esm/api"; const {gameKinds} = await tsImport("./src/domain/catalogue.ts", import.meta.url); if (!gameKinds.includes("ccbs") || !gameKinds.includes("scmj")) process.exit(1);',
    ],
    {
      encoding: "utf8",
      timeout: 10000,
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
});
