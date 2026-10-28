import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { Switch } from "../ui/Controls";
import { useUpdater, checkUpdate, downloadUpdate } from "./client";
import { updateLabels, type UpdatePreferences } from "./model";
export function UpdateSettings({
  preferences,
  onChange,
}: {
  preferences: UpdatePreferences;
  onChange: (value: UpdatePreferences) => void;
}) {
  const status = useUpdater(),
    [error, setError] = useState("");
  const checking = ["checking", "downloading", "installing"].includes(
    status.phase,
  );
  return (
    <section className="settings-section">
      <h3>软件更新</h3>
      <p>当前版本 {status.currentVersion}</p>
      <Switch
        label="启动时检查更新"
        checked={preferences.checkOnLaunch}
        onCheckedChange={(checkOnLaunch) =>
          onChange({
            ...preferences,
            checkOnLaunch,
            automatic: checkOnLaunch && preferences.automatic,
          })
        }
      />
      <Switch
        label="发现新版本时提醒"
        checked={preferences.notify}
        onCheckedChange={(notify) => onChange({ ...preferences, notify })}
      />
      <Switch
        label="空闲时自动下载安装并重启"
        checked={preferences.automatic}
        onCheckedChange={(automatic) =>
          onChange({
            ...preferences,
            automatic,
            checkOnLaunch: automatic || preferences.checkOnLaunch,
          })
        }
      />
      <Switch
        label="使用代理检查和下载"
        checked={preferences.useProxy}
        onCheckedChange={(useProxy) => onChange({ ...preferences, useProxy })}
      />
      {preferences.useProxy && (
        <label className="setting-row">
          代理地址
          <input
            aria-label="更新代理地址"
            value={preferences.proxy}
            onChange={(event) =>
              onChange({ ...preferences, proxy: event.target.value })
            }
          />
        </label>
      )}
      <p role="status">
        {status.phase === "downloaded" &&
        status.automatic &&
        !preferences.automatic
          ? "已下载，自动安装已暂停"
          : updateLabels[status.phase]}
        {status.version && status.phase !== "current"
          ? ` · ${status.version}`
          : ""}
      </p>
      {status.phase === "downloading" && (
        <>
          <progress
            aria-label="更新下载进度"
            value={status.total ? status.received : undefined}
            max={status.total ?? undefined}
          />
          <small>
            {(status.received / 1048576).toFixed(1)} MB
            {status.total ? ` / ${(status.total / 1048576).toFixed(1)} MB` : ""}
          </small>
        </>
      )}
      {status.notes && (
        <p data-copyable tabIndex={0} className="update-notes">
          {status.notes}
        </p>
      )}
      {(status.error || error) && <p role="alert">{status.error || error}</p>}
      <button
        disabled={checking}
        onClick={() => {
          setError("");
          void checkUpdate(preferences).catch((error) =>
            setError(String(error)),
          );
        }}
      >
        检查更新
      </button>
      {status.phase === "downloaded" && (
        <button
          onClick={() => {
            setError("");
            void (async () => {
              if (
                await confirm("将在退出房间和连麦后安装并重启。", {
                  title: "软件更新",
                  okLabel: "安装并重启",
                  cancelLabel: "取消",
                })
              )
                await invoke("updater_authorize");
            })().catch((error) => setError(String(error)));
          }}
        >
          安装已下载更新
        </button>
      )}
      {(status.phase === "available" ||
        (status.phase === "error" && status.version)) && (
        <button
          disabled={checking}
          className="primary-button"
          onClick={() => {
            setError("");
            void (async () => {
              if (
                await confirm("下载完成后将在空闲时安装并重启。", {
                  title: "软件更新",
                  okLabel: "下载并安装",
                  cancelLabel: "取消",
                })
              )
                await downloadUpdate(preferences);
            })().catch((error) => setError(String(error)));
          }}
        >
          下载并安装
        </button>
      )}
    </section>
  );
}
