import { expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runNativeSmoke } from "../scripts/native-smoke-runner.mjs";

it("passes the output path and profile to a real child and captures both streams", async () => {
  const directory = await mkdtemp(join(tmpdir(), "native-runner-"));
  const output = join(directory, "result.txt");
  try {
    await runNativeSmoke({
      command: process.execPath,
      args: [
        "-e",
        'require("node:fs").writeFileSync(process.env.COMPANION_SMOKE_OUTPUT, "PASS: " + process.env.COMPANION_SMOKE_PROFILE); console.log("started"); console.error("diagnostic")',
      ],
      output,
      profile: "ai",
      timeoutMs: 5000,
    });
    expect(await readFile(output, "utf8")).toBe("PASS: ai");
    expect(await readFile(output + ".process.log", "utf8")).toContain(
      "diagnostic",
    );
    expect(await readFile(output + ".process.log", "utf8")).toContain(
      "started",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it.each([
  ['console.error("loader failed"); process.exit(7)', "code=7", 5000],
  ["setInterval(() => {}, 1000)", "timed out", 100],
  ['console.log("no report")', "did not report", 5000],
])(
  "rejects a real child failure without accepting an absent report",
  async (script, error, timeoutMs) => {
    const directory = await mkdtemp(join(tmpdir(), "native-runner-"));
    try {
      await expect(
        runNativeSmoke({
          command: process.execPath,
          args: ["-e", script],
          output: join(directory, "result.txt"),
          profile: "ai",
          timeoutMs,
        }),
      ).rejects.toThrow(error);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
