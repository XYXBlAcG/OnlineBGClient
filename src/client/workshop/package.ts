import { Unzip, UnzipInflate, strFromU8, strToU8, zipSync } from "fflate";
import {
  workshopPackSchema,
  type WorkshopPack,
} from "../../domain/workshop/model";
const packageBytes = 128 * 1024;
export async function readWorkshopPackage(
  bytes: Uint8Array,
): Promise<WorkshopPack> {
  if (bytes.byteLength > packageBytes) throw Error("插件包超过 128 KiB");
  if (bytes[0] !== 80)
    return workshopPackSchema.parse(JSON.parse(strFromU8(bytes)));
  return new Promise((resolve, reject) => {
    const files = new Map<string, Uint8Array[]>();
    let total = 0;
    const unzip = new Unzip((file) => {
      if (file.name === "effects/" && file.originalSize === 0) return;
      if (
        !/^(manifest\.json|effects\/[a-z][a-z0-9.-]{2,63}\.json)$/.test(
          file.name,
        ) ||
        files.has(file.name)
      ) {
        reject(Error("插件包包含不支持或重复的文件"));
        return;
      }
      if (file.originalSize === undefined || file.originalSize > packageBytes) {
        reject(Error("插件条目未声明大小或解压内容过大"));
        return;
      }
      const chunks: Uint8Array[] = [];
      files.set(file.name, chunks);
      file.ondata = (error, chunk) => {
        if (error) {
          reject(error);
          return;
        }
        total += chunk.length;
        if (total > packageBytes) {
          file.terminate();
          reject(Error("插件解压内容超过限制"));
          return;
        }
        chunks.push(chunk);
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    try {
      unzip.push(bytes, true);
      const decode = (name: string) => {
        const chunks = files.get(name);
        if (!chunks) throw Error(`插件缺少 ${name}`);
        const size = chunks.reduce((s, c) => s + c.length, 0),
          data = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          data.set(chunk, offset);
          offset += chunk.length;
        }
        return JSON.parse(strFromU8(data)) as unknown;
      };
      const manifest = decode("manifest.json");
      if (
        !manifest ||
        typeof manifest !== "object" ||
        !("effects" in manifest) ||
        !Array.isArray(manifest.effects)
      )
        throw Error("插件清单无效");
      const effects = manifest.effects.map((path) => {
        if (
          typeof path !== "string" ||
          !/^effects\/[a-z][a-z0-9.-]{2,63}\.json$/.test(path)
        )
          throw Error("特效路径无效");
        return decode(path);
      });
      if (files.size !== effects.length + 1)
        throw Error("插件包包含未声明文件");
      resolve(workshopPackSchema.parse({ ...manifest, effects }));
    } catch (error) {
      reject(error);
    }
  });
}
export function writeWorkshopPackage(input: WorkshopPack): Uint8Array {
  const pack = workshopPackSchema.parse(input),
    files: Record<string, Uint8Array> = {};
  for (const effect of pack.effects)
    files[`effects/${effect.id}.json`] = strToU8(
      JSON.stringify(effect, null, 2),
    );
  files["manifest.json"] = strToU8(
    JSON.stringify(
      { ...pack, effects: pack.effects.map((e) => `effects/${e.id}.json`) },
      null,
      2,
    ),
  );
  return zipSync(files, { level: 6 });
}
