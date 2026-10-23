import { useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { ClientStore, subscribeRecords } from "./storage";
import { confirmation } from "./confirmation-controller";
export function CacheSettings({
  onError,
  onAuditCleared,
}: {
  onError: (message: string) => void;
  onAuditCleared: () => void;
}) {
  const [store] = useState(() => new ClientStore());
  const [usage, setUsage] = useState({
      images: 0,
      audit: 0,
      runtime: 0,
      records: 0,
      recordCount: 0,
    }),
    [selection, setSelection] = useState({
      images: true,
      audit: false,
      runtime: false,
      records: false,
    }),
    [saving, setSaving] = useState<boolean | null>(null),
    [busy, setBusy] = useState(false);
  const refresh = async () => {
    const local = await store.cacheUsage();
    const native = isTauri()
      ? await invoke<{ images: number; runtime: number }>("cache_usage")
      : { images: 0, runtime: 0 };
    setSaving(await store.recordSaving());
    setUsage({
      images: local.images + native.images,
      audit: local.audit,
      runtime: native.runtime,
      records: local.records,
      recordCount: local.recordCount,
    });
  };
  useEffect(() => {
    const update = () => {
      void refresh().catch((error) => onError(String(error)));
    };
    update();
    return subscribeRecords(update);
  }, []);
  const size = (bytes: number) =>
    bytes < 1024
      ? `${bytes} B`
      : bytes < 1024 ** 2
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  const clear = async (selected: typeof selection) => {
    if (
      !(await confirmation.request(
        selected.records
          ? "清理所选缓存及本机对局历史？记录清理后无法恢复，当前房间和其他玩家的数据会保留。"
          : "清理选中的缓存？策略记录清理后无法恢复，游戏回放会保留。",
        "清理缓存",
      ))
    )
      return;
    setBusy(true);
    try {
      if (isTauri() && (selected.runtime || selected.images))
        await invoke("clear_cache", {
          runtime: selected.runtime,
          images: selected.images,
        });
      if (selected.audit) onAuditCleared();
      await store.clearCache(selected);
      await refresh();
    } catch (error) {
      onError(String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="settings-section">
      <h3>对局记录</h3>
      <label className="setting-row">
        <span>自动保存对局记录</span>
        <input
          type="checkbox"
          aria-label="自动保存对局记录"
          disabled={saving === null || busy}
          checked={saving ?? true}
          onChange={(event) => {
            void store
              .setRecordSaving(event.target.checked)
              .catch((error) => onError(String(error)));
          }}
        />
      </label>
      <p className="muted">
        控制本机历史归档，手动导入和当前房间恢复不受影响。
      </p>
      <h3>缓存</h3>
      {(
        [
          "records",
          "images",
          "audit",
          ...(isTauri() ? ["runtime"] : []),
        ] as Array<keyof typeof selection>
      ).map((key) => (
        <label className="setting-row" key={key}>
          <span>
            {
              {
                records: `本机对局记录（${usage.recordCount} 局）`,
                images: "聊天图片缓存",
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
        保留当前房间恢复数据、身份和设置。联机组件清理后需重新下载。
      </p>
      <div className="cache-actions">
        <button
          disabled={busy || usage.recordCount === 0}
          onClick={() =>
            void clear({
              images: false,
              audit: false,
              runtime: false,
              records: true,
            })
          }
        >
          清理全部对局记录
        </button>
        <button
          disabled={busy || !Object.values(selection).some(Boolean)}
          onClick={() => void clear(selection)}
        >
          清理选中缓存
        </button>
      </div>
    </section>
  );
}
