import { isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export async function exportJson(value: unknown, name: string): Promise<void> {
  const content = JSON.stringify(value, null, 2);
  if (isTauri()) {
    const path = await save({
      defaultPath: name,
      filters: [{ name: "对局记录", extensions: ["json"] }],
    });
    if (path) await writeTextFile(path, content);
    return;
  }
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function importJson(): Promise<unknown | undefined> {
  if (isTauri()) {
    const path = await open({
      multiple: false,
      filters: [{ name: "对局记录", extensions: ["json"] }],
    });
    if (!path) return undefined;
    return JSON.parse(await readTextFile(path));
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.oncancel = () => resolve(undefined);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) resolve(undefined);
      else
        void file
          .text()
          .then((content) => resolve(JSON.parse(content)))
          .catch(reject);
    };
    input.click();
  });
}
