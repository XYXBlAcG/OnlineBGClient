import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Switch } from "../ui/Controls";
import { confirmation } from "../confirmation-controller";
import { gameCatalogue } from "../../domain/catalogue";
interface UsageSnapshot {
  data: {
    enabled: boolean;
    since: number;
    totalMs: number;
    games: Record<string, number>;
  };
  currentMs: number;
  sessions: Record<string, { game: string; elapsedMs: number }>;
  error: string | null;
}
export function duration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分 ${Math.floor(ms / 1000) % 60} 秒`;
}
const gameName = (kind: string) =>
  gameCatalogue[kind as keyof typeof gameCatalogue]?.name ?? kind;
export function UsageSettings() {
  const [snapshot, setSnapshot] = useState<UsageSnapshot>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () =>
      void invoke<UsageSnapshot>("usage_snapshot")
        .then((value) => {
          if (active) setSnapshot(value);
        })
        .catch((error) => {
          if (active) setError(String(error));
        });
    load();
    const timer = setInterval(load, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const change = async (command: string, args?: Record<string, unknown>) => {
    setBusy(true);
    try {
      setSnapshot(await invoke<UsageSnapshot>(command, args));
      setError("");
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="usage-settings">
      <h2>使用统计</h2>
      {snapshot && (
        <>
          <Switch
            label="记录本机使用时长"
            checked={snapshot.data.enabled}
            onCheckedChange={(enabled) => {
              if (!busy) void change("usage_enabled", { enabled });
            }}
          />
          <div className="usage-totals">
            <article>
              <small>累计使用</small>
              <strong>{duration(snapshot.data.totalMs)}</strong>
            </article>
            <article>
              <small>本次启动</small>
              <strong>{duration(snapshot.currentMs)}</strong>
            </article>
          </div>
          <table>
            <thead>
              <tr>
                <th>游戏</th>
                <th>累计游玩</th>
                <th>本次启动内游玩</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(snapshot.data.games).map(([game, ms]) => (
                <tr key={game}>
                  <td>{gameName(game)}</td>
                  <td>{duration(ms)}</td>
                  <td>
                    {duration(
                      Object.values(snapshot.sessions)
                        .filter((session) => session.game === game)
                        .reduce((sum, session) => sum + session.elapsedMs, 0),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!Object.keys(snapshot.data.games).length && (
            <p className="muted">开始游玩后显示各游戏时长</p>
          )}
          <details>
            <summary>本次启动的场次</summary>
            {Object.entries(snapshot.sessions).map(([id, session], index) => (
              <p key={id}>
                第 {index + 1} 场 · {gameName(session.game)} ·{" "}
                {duration(session.elapsedMs)}
              </p>
            ))}
          </details>
          <p className="muted">
            从 {new Date(snapshot.data.since).toLocaleDateString()}{" "}
            开始记录。锁屏、休眠和全部窗口隐藏时暂停；等待室、回放及只运行服务器不计入游玩。
          </p>
          {snapshot.error && <p role="alert">{snapshot.error}</p>}
          <button
            disabled={busy}
            onClick={() =>
              void confirmation
                .request(
                  "重置本机使用统计？现有统计文件将保留备份，不影响存档、设置与连麦配置。",
                  "重置统计",
                )
                .then((ok) => {
                  if (ok) void change("usage_reset");
                })
            }
          >
            重置使用统计
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
