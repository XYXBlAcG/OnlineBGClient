import { useEffect, useState } from "react";
import { mediaRequest, type MediaSession } from "./media";
import { confirmation } from "../confirmation-controller";
export function MediaCacheControls({
  session,
  onError,
}: {
  session: MediaSession;
  onError: (message: string) => void;
}) {
  const [usage, setUsage] = useState<{ bytes: number; count: number } | null>(
      null,
    ),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setUsage(null);
    void mediaRequest(session, { signal: controller.signal })
      .then((response) => response.json())
      .then((value) => setUsage(value))
      .catch((error) => {
        if (!controller.signal.aborted) onError(String(error));
      });
    return () => controller.abort();
  }, [session.room, session.token, session.endpoint]);
  return (
    <section className="settings-section">
      <h3>当前联机房间图片</h3>
      <span className="muted">
        {usage
          ? `${usage.count} 张 · ${(usage.bytes / 1024 / 1024).toFixed(1)} MB`
          : "正在读取…"}
      </span>
      <button
        disabled={busy || !usage?.count}
        onClick={async () => {
          if (
            !(await confirmation.request(
              "清理当前房间的所有聊天图片？所有玩家的历史消息将显示图片已清理。",
              "清理房间图片",
            ))
          )
            return;
          setBusy(true);
          try {
            await mediaRequest(session, { clear: true });
            setUsage({ bytes: 0, count: 0 });
          } catch (error) {
            onError(String(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        清理房间图片
      </button>
    </section>
  );
}
