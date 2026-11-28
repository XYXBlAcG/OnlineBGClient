import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
export async function exposeSwiftEntryPoints(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) await exposeSwiftEntryPoints(path);
    else if (entry.name.endsWith(".swift")) {
      const source = await readFile(path, "utf8");
      const next = source.replace(
        /(@_cdecl\([^\n]+\)\s*\n)(func\s)/g,
        "$1public $2",
      );
      if (next !== source) await writeFile(path, next);
    }
  }
}
