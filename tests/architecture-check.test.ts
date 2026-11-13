import { expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const script = resolve("scripts/architecture-check.mjs");

async function runWith(files: Record<string, string>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "architecture-check-"));
  try {
    for (const [path, source] of Object.entries(files)) {
      await mkdir(join(root, path, ".."), { recursive: true });
      await writeFile(join(root, path), source);
    }
    execFileSync(process.execPath, [script], { cwd: root, stdio: "pipe" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

it("permits cross-layer imports that respect the architecture rules", async () => {
  await expect(
    runWith({
      "src/client/entry.ts": 'import { value } from "../domain/value";\nexport const entry = value;\n',
      "src/domain/value.ts": "export const value = 1;\n",
    }),
  ).resolves.toBeUndefined();
});

it("rejects a multi-line import from a forbidden layer", async () => {
  await expect(
    runWith({
      "src/client/entry.ts": 'import type {\n  Room,\n} from "../server/main";\nexport const entry = (room: Room) => room;\n',
      "src/server/main.ts": "export type Room = { id: string };\n",
    }),
  ).rejects.toThrow();
});

it("rejects a re-export from a forbidden layer", async () => {
  await expect(
    runWith({
      "src/client/entry.ts": 'export { room } from "../server/main";\n',
      "src/server/main.ts": "export const room = 1;\n",
    }),
  ).rejects.toThrow();
});

it("rejects a dynamic import from a forbidden layer", async () => {
  await expect(
    runWith({
      "src/client/entry.ts": 'export const load = () => import("../server/main");\n',
      "src/server/main.ts": "export const room = 1;\n",
    }),
  ).rejects.toThrow();
});

it("rejects a domain file importing the client layer", async () => {
  await expect(
    runWith({
      "src/domain/value.ts": 'import { entry } from "../client/entry";\nexport const value = entry;\n',
      "src/client/entry.ts": "export const entry = 1;\n",
    }),
  ).rejects.toThrow();
});
