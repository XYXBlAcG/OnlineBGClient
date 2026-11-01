import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";
export function DiagnosticsSettings() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      const raw = await invoke<string>("application_logs", { full: false });
      setText(
        raw
          .split("\n")
          .map((line) => {
            try {
              const entry = JSON.parse(line);
              return `${new Date(entry.atMs).toLocaleString()} [${entry.level}] ${entry.source}\n${entry.message}`;
            } catch {
              return line;
            }
          })
          .join("\n\n"),
      );
    } catch (value) {
      setError(String(value));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  const exportLogs = async () => {
    setBusy(true);
    setError("");
    try {
      const path = await save({
        defaultPath: `OnlineBGClient-${new Date().toISOString().slice(0, 10)}.log`,
        filters: [{ name: "日志", extensions: ["log"] }],
      });
      if (path)
        await writeTextFile(
          path,
          await invoke<string>("application_logs", { full: true }),
        );
    } catch (value) {
      setError(String(value));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="settings-section">
      <h3>软件日志</h3>
      <div className="section-toolbar">
        <button disabled={busy} onClick={() => void refresh()}>
          刷新
        </button>
        <button disabled={busy} onClick={() => void exportLogs()}>
          导出日志
        </button>
      </div>
      <p className="muted">显示最近 300 条，导出包含当前保留的完整日志。</p>
      <textarea
        className="application-logs"
        aria-label="软件日志"
        readOnly
        value={text || "暂无日志"}
      />
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
