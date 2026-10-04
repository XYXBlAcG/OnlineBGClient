import { useEffect, useState } from "react";
import { gameCatalogue, type GameKind } from "../domain/catalogue";
export function MobileJoin({
  room,
  service,
  busy,
  onJoin,
}: {
  room: string;
  service: string;
  busy: boolean;
  onJoin: (name: string, room: string, service: string) => void;
}) {
  const [name, setName] = useState(localStorage.getItem("player-name") || ""),
    [invitation, setInvitation] = useState(room);
  const [info, setInfo] = useState<{
      kind: GameKind;
      players: number;
      seats: number;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!room) return;
    const controller = new AbortController();
    const url = new URL("/room-info", service);
    url.searchParams.set("room", room);
    void fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("房间不存在或已关闭");
        return response.json();
      })
      .then((info) => {
        setInfo(info);
        if (
          localStorage.getItem(`room:${new URL(service).origin}:${room}`) &&
          name.trim()
        )
          onJoin(name.trim(), room, service);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(String(error));
      });
    return () => controller.abort();
  }, [room, service]);
  return (
    <main className="mobile-join">
      <h1>加入牌桌</h1>
      {info && (
        <p>
          {gameCatalogue[info.kind].name} · {info.players}/{info.seats} 人
        </p>
      )}
      {error && <p role="status">{error}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onJoin(name.trim(), invitation, service);
        }}
      >
        {!room && (
          <input
            aria-label="邀请链接"
            placeholder="粘贴邀请链接"
            value={invitation}
            onChange={(event) => setInvitation(event.target.value)}
          />
        )}
        <input
          aria-label="昵称"
          autoComplete="nickname"
          placeholder="你的昵称"
          value={name}
          maxLength={24}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          className="primary-button"
          disabled={busy || !name.trim() || !invitation}
          type="submit"
        >
          {busy ? "连接中…" : "加入 / 恢复房间"}
        </button>
      </form>
    </main>
  );
}
