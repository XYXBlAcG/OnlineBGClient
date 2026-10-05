import { useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { ClientStore } from "./storage";
import { confirmation } from "./confirmation-controller";
export function CacheSettings({
  onError,
  onAuditCleared,
}: {
  onError: (message: string) => void;
  onAuditCleared: () => void;
}) {
  const [store] = useState(() => new ClientStore());
  const [usage, setUsage] = useState({ images: 0, audit: 0, runtime: 0 }),
    [selection, setSelection] = useState({
      images: true,
      audit: false,
      runtime: false,
    }),
    [busy, setBusy] = useState(false);
  const refresh = async () => {
    const local = await store.cacheUsage();
    const native = isTauri()
      ? await invoke<{ images: number; runtime: number }>("cache_usage")
      : { images: 0, runtime: 0 };
    setUsage({
      images: local.images + native.images,
      audit: local.audit,
      runtime: native.runtime,
    });
  };
  useEffect(() => {
    void refresh().catch((error) => onError(String(error)));
  }, []);
  const size = (bytes: number) =>
    bytes < 1024
      ? `${bytes} B`
      : bytes < 1024 ** 2
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return (
    <section className="settings-section">
      <h3>缓存</h3>
      {(
        ["images", "audit", ...(isTauri() ? ["runtime"] : [])] as Array<
          keyof typeof selection
        >
      ).map((key) => (
        <label className="setting-row" key={key}>
          <span>
            {
              {
                images: "旧表情缓存",
                audit: "本地策略记录",
                runtime: "联机组件",
              }[key]
            }{" "}
            · {size(usage[key])}
          </span>
          <input
            type="checkbox"
            checked={selection[key]}
            onChange={(event) =>
              setSelection({ ...selection, [key]: event.target.checked })
            }
          />
        </label>
      ))}
      <p className="muted">
        保留回放、房间身份和设置。联机组件清理后需重新下载。
      </p>
      <button
        disabled={busy || !Object.values(selection).some(Boolean)}
        onClick={async () => {
          if (
            !(await confirmation.request(
              "清理选中的缓存？策略记录清理后无法恢复，游戏回放会保留。",
              "清理缓存",
            ))
          )
            return;
          setBusy(true);
          try {
            if (isTauri())
              await invoke("clear_cache", {
                runtime: selection.runtime,
                images: selection.images,
              });
            if (selection.audit) onAuditCleared();
            await store.clearCache(selection);
            await refresh();
          } catch (error) {
            onError(String(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        清理选中缓存
      </button>
    </section>
  );
}
