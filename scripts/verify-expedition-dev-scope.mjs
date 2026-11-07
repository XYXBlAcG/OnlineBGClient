import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const assets = join("dist", "assets");
const files = (await readdir(assets)).filter((file) => file.endsWith(".js"));
const markers = ["远征开发调试", "裂隙回溯", "自动运行到断点"];
for (const file of files) {
  const source = await readFile(join(assets, file), "utf8");
  for (const marker of markers)
    if (source.includes(marker))
      throw new Error(`正式构建仍包含远征调试标记：${marker} (${file})`);
}
process.stdout.write("Expedition developer controls are absent from production.\n");
