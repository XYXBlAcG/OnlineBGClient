import { useEffect, useMemo, useState } from "react";
import { ClientStore } from "../storage";
import { featuredWorkshopPacks } from "../../domain/workshop/featured";
import {
  type WorkshopInstallation,
  type WorkshopPack,
  type WorkshopEffect,
} from "../../domain/workshop/model";
import { workshopVisualSchema } from "../../domain/workshop/model";
import { readWorkshopPackage, writeWorkshopPackage } from "./package";
import { SearchField, Switch } from "../ui/Controls";
import { Emoji } from "../Emoji";
import { PartyRuntime, type PartyPresentation } from "../party/PartyRuntime";
import type { Preferences } from "../preferences";
import "./workshop.css";
export function Workshop({ preferences }: { preferences: Preferences }) {
  const [store] = useState(() => new ClientStore()),
    [installed, setInstalled] = useState<WorkshopInstallation[]>([]),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<PartyPresentation>();
  useEffect(() => {
    void store
      .plugins()
      .then(setInstalled)
      .catch((e) => setStatus(String(e)));
  }, [store]);
  const perform = async (action: () => Promise<void>, message: string) => {
    setBusy(true);
    try {
      await action();
      setInstalled(await store.plugins());
      setStatus(message);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };
  const show = (pack: WorkshopPack, effect: WorkshopEffect) => {
    const time = Date.now();
    setPreview({
      actor: 0,
      serverTime: time,
      seats: [
        {
          id: "preview",
          name: "预览",
          difficulty: null,
          online: true,
          ready: true,
        },
      ],
      party: {
        events: [
          {
            id: `preview:${pack.id}:${effect.id}:${time}`,
            item: "comic",
            from: "preview",
            target: "preview",
            time,
            createdAt: time,
            duration: effect.duration,
            seed: time >>> 0,
            caption: effect.caption,
            density: 1,
            visual: workshopVisualSchema.strip().parse(effect),
          },
        ],
        minigames: [],
      },
    });
  };
  const download = (pack: WorkshopPack) => {
    const bytes = writeWorkshopPackage(pack),
      url = URL.createObjectURL(
        new Blob([bytes as BlobPart], { type: "application/octet-stream" }),
      ),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${pack.id}-${pack.version}.obgplugin`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const packs = useMemo(() => {
    const list = new Map(featuredWorkshopPacks.map((pack) => [pack.id, pack]));
    for (const entry of installed) list.set(entry.pack.id, entry.pack);
    return [...list.values()].filter((p) =>
      `${p.name} ${p.description} ${p.author}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  }, [installed, query]);
  return (
    <div className="workshop">
      <header className="workshop-tools">
        <SearchField
          label="搜索插件"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="workshop-import">
          导入 .obgplugin
          <input
            aria-label="导入插件包"
            type="file"
            accept=".obgplugin,.json"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file)
                void perform(async () => {
                  if (file.size > 128 * 1024) throw Error("插件包超过 128 KiB");
                  await store.installPlugin(
                    await readWorkshopPackage(
                      new Uint8Array(await file.arrayBuffer()),
                    ),
                  );
                }, "插件已安装；下局可启用");
            }}
          />
        </label>
      </header>
      <p role="status">
        {status ||
          "特效配方在本机保存；房主启用后，房间成员自动获得相同的演出。"}
      </p>
      <div className="workshop-catalogue">
        {packs.map((pack) => {
          const local = installed.find((p) => p.pack.id === pack.id);
          return (
            <article key={pack.id}>
              <header>
                <span className="workshop-cover">
                  <Emoji text={pack.effects[0].emoji} />
                </span>
                <div>
                  <h4>{pack.name}</h4>
                  <small>
                    {pack.author} · {pack.version} · {pack.license}
                  </small>
                </div>
              </header>
              <p>{pack.description}</p>
              <div className="workshop-effects">
                {pack.effects.map((effect) => (
                  <button key={effect.id} onClick={() => show(pack, effect)}>
                    <Emoji text={effect.emoji} /> {effect.name} · 预览
                  </button>
                ))}
              </div>
              <footer>
                {local ? (
                  <>
                    <Switch
                      label="新房间启用"
                      checked={local.enabled}
                      onCheckedChange={(enabled) =>
                        void perform(
                          () => store.enablePlugin(pack.id, enabled),
                          enabled
                            ? "已启用；下局应用"
                            : "已停用；当前对局保持原配置",
                        )
                      }
                    />
                    <button
                      disabled={busy}
                      onClick={() =>
                        void perform(
                          () => store.removePlugin(pack.id),
                          "已从本机卸载；当前房间保持本局版本",
                        )
                      }
                    >
                      卸载
                    </button>
                  </>
                ) : (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      void perform(
                        () => store.installPlugin(pack),
                        "插件已安装并启用",
                      )
                    }
                  >
                    安装
                  </button>
                )}
                <button onClick={() => download(pack)}>导出配方模板</button>
              </footer>
            </article>
          );
        })}
      </div>
      <details>
        <summary>自己制作特效</summary>
        <p>
          导出模板后，使用解压工具打开，修改 effects 内的 JSON 配方，再将
          manifest.json 和 effects 文件夹打包为 ZIP 并改名为
          .obgplugin。支持的字段与示例见项目文档中的插件工坊。
        </p>
      </details>
      {preview && (
        <PartyRuntime
          preview
          snapshot={preview}
          mobile={false}
          preferences={{ ...preferences, interactions: true }}
        />
      )}
    </div>
  );
}
