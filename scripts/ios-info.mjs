import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

export async function configureIosInfo(target, extension, version) {
  const generated = JSON.parse(
    execFileSync("plutil", ["-convert", "json", "-o", "-", target], {
      encoding: "utf8",
    }),
  );
  const platform = JSON.parse(
    execFileSync("plutil", ["-convert", "json", "-o", "-", extension], {
      encoding: "utf8",
    }),
  );
  await writeFile(
    target,
    JSON.stringify({
      ...generated,
      ...platform,
      CFBundleShortVersionString: version,
      CFBundleVersion: version,
    }),
  );
  execFileSync("plutil", ["-convert", "xml1", target]);
}
