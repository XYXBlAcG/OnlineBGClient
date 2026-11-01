import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
const run = promisify(execFile);
const source = ".tmp/asset-packs/apple-emoji";
try {
  await access(`${source}/index.json`);
} catch {
  if (process.platform !== "darwin")
    throw Error("Apple 表情包需要在 macOS 上生成");
  await run(
    "swift",
    [
      "-module-cache-path",
      ".tmp/swift-module-cache",
      "scripts/render-apple-emoji.swift",
    ],
    { maxBuffer: 1024 * 1024 },
  );
}
const output = "artifacts/emoji-pack";
await mkdir(output, { recursive: true });
const filename = "apple-emoji-v1.tar.gz";
const { codes } = JSON.parse(await readFile(`${source}/index.json`, "utf8"));
const files = ["index.json", ...codes.map((code) => `${code}.png`)];
await writeFile(".tmp/emoji-files.txt", files.join("\n") + "\n");
await run(
  "tar",
  [
    "--format=ustar",
    "-czf",
    `${output}/${filename}`,
    "-C",
    source,
    "-T",
    ".tmp/emoji-files.txt",
  ],
  { env: { ...process.env, COPYFILE_DISABLE: "1" } },
);
const bytes = await readFile(`${output}/${filename}`);
const { version } = JSON.parse(await readFile("package.json", "utf8"));
await writeFile(
  `${output}/emoji-pack.json`,
  JSON.stringify(
    {
      format: 1,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      url: `https://github.com/XYXBlAcG/OnlineBGClient/releases/download/v${version}/${filename}`,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Optional emoji pack: ${bytes.length} bytes`);
