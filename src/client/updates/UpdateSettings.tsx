import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { Switch } from "../ui/Controls";
import { useUpdater, checkUpdate, downloadUpdate } from "./client";
import {
  downloadPercent,
  formatBytes,
  formatDuration,
  updateLabels,
  type UpdatePreferences,
  type UpdateStatus,
} from "./model";
import "./updates.css";
function downloadSpeed(status: UpdateStatus, speed: number): string {
  if (status.phase !== "downloading" || speed <= 0) return "准备下载";
  return `${formatBytes(speed)}/s`;
}
function downloadEta(status: UpdateStatus, speed: number): number | null {
  if (!status.total || speed <= 0) return null;
  return Math.max(0, (status.total - status.received) / speed);
}
function UpdateProgress({ status }: { status: UpdateStatus }) {
  const [speed, setSpeed] = useState(0);
  const sample = useRef<{ received: number; at: number } | null>(null);
  useEffect(() => {
    if (status.phase !== "downloading") {
      sample.current = null;
      setSpeed(0);
      return;
    }
    const at = performance.now();
    const previous = sample.current;
    if (!previous) {
      sample.current = { received: status.received, at };
      return;
    }
    const elapsed = (at - previous.at) / 1000;
    if (elapsed < 0.4) return;
    setSpeed(Math.max(0, (status.received - previous.received) / elapsed));
    sample.current = { received: status.received, at };
  }, [status.phase, status.received]);
  if (status.phase !== "downloading") return null;
  const percent = downloadPercent(status);
  const eta = downloadEta(status, speed);
  return (
    <div className="update-download">
      <div className="update-download-heading">
        <strong>
          {percent === null ? "正在下载" : `${Math.round(percent)}%`}
        </strong>
        <span>
          {formatBytes(status.received)}
          {status.total ? ` / ${formatBytes(status.total)}` : ""}
        </span>
      </div>
      <div
        className={`update-progress${percent === null ? " is-indeterminate" : ""}`}
        role="progressbar"
        aria-label="更新下载进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent === null ? undefined : Math.round(percent)}
      >
        <span style={percent === null ? undefined : { width: `${percent}%` }} />
      </div>
      <div className="update-download-meta">
        <span>{downloadSpeed(status, speed)}</span>
        {eta !== null && <span>剩余 {formatDuration(eta)}</span>}
        {status.total === null && <span>正在获取文件大小</span>}
      </div>
    </div>
  );
}
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
      <UpdateProgress status={status} />
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
