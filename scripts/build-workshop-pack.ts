import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { workshopPackSchema } from "../src/domain/workshop/model";
import { writeWorkshopPackage } from "../src/client/workshop/package";
const [directory, output] = process.argv.slice(2);
if (!directory || !output)
  throw Error("用法：npm run workshop:pack -- 插件目录 输出.obgplugin");
const manifest = JSON.parse(
  await readFile(resolve(directory, "manifest.json"), "utf8"),
) as { effects: unknown[] };
if (!Array.isArray(manifest.effects))
  throw Error("清单需要 effects 文件路径列表");
const effects = await Promise.all(
  manifest.effects.map(async (path) => {
    if (
      typeof path !== "string" ||
      !/^effects\/[a-z][a-z0-9.-]{2,63}\.json$/.test(path)
    )
      throw Error("特效路径无效");
    return JSON.parse(
      await readFile(resolve(directory, path), "utf8"),
    ) as unknown;
  }),
);
const pack = workshopPackSchema.parse({ ...manifest, effects });
await writeFile(output, writeWorkshopPackage(pack));
process.stdout.write(`${pack.name} ${pack.version} → ${output}\n`);
