import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readReleaseSources,
  releaseChannel,
  releaseVersionMismatches,
} from "./lib/release-sources.mjs";

export async function releaseVersion() {
  const sources = await readReleaseSources();
  releaseChannel(sources.version, process.env.GITHUB_REF?.startsWith("refs/tags/")
    ? process.env.GITHUB_REF.slice("refs/tags/".length) : undefined);
  const mismatches = releaseVersionMismatches(sources);
  if (mismatches.length) throw Error(mismatches[0].message);
  return sources.version;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(await releaseVersion());
