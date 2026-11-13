import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readReleaseSources,
  releaseVersionMismatches,
} from "./lib/release-sources.mjs";

export async function releaseVersion() {
  const sources = await readReleaseSources();
  if (!/^\d+\.\d+\.\d+$/.test(sources.version))
    throw Error("package.json 版本格式不正确");
  const mismatches = releaseVersionMismatches(sources);
  if (mismatches.length) throw Error(mismatches[0].message);
  return sources.version;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(await releaseVersion());
