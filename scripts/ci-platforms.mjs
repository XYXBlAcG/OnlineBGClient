import { appendFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function selectPlatforms(event) {
  const platforms = [
    {
      runner: "windows-2022",
      name: "Windows-x64",
      args: "--bundles nsis",
      platform: "windows",
    },
    {
      runner: "macos-14",
      name: "macOS-arm64",
      args: "--bundles app",
      platform: "macos",
    },
  ];
  const requested = event.ref?.startsWith("refs/tags/")
    ? "all"
    : (event.inputs?.platform ??
      event.head_commit?.message?.match(
        /^CI-Platforms: (windows|macos|all)$/m,
      )?.[1] ??
      "all");
  if (!["all", "windows", "macos"].includes(requested))
    throw new Error(`Unknown CI platform: ${requested}`);
  return platforms.filter(
    (platform) => requested === "all" || requested === platform.platform,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const platforms = selectPlatforms(
    JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8")),
  );
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `matrix=${JSON.stringify({ include: platforms })}\nall-platforms=${platforms.length === 2}\n`,
  );
  console.log(
    `CI platforms: ${platforms.map((platform) => platform.name).join(", ")}`,
  );
}
