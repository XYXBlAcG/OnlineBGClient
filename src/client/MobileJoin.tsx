import { invitationLink, parseInvitation } from "./invitation";
import { ThemeControl } from "./ThemeControl";
import { MotionControls } from "./MotionControls";
import { AvatarPicker } from "./AvatarPicker";
import type { Preferences } from "./preferences";
import { useEffect, useState } from "react";
import { gameCatalogue, type GameKind } from "../domain/catalogue";
import { capabilities } from "./platform";
import { TextField } from "./ui/Controls";
export function MobileJoin({
  preferences,
  onPreferencesChange,
  room,
  service,
  busy,
  onJoin,
}: {
  preferences: Preferences;
  onPreferencesChange: (preferences: Preferences) => void;
  room: string;
  service: string;
  busy: boolean;
  onJoin: (name: string, invitation: string) => void;
}) {
  const [name, setName] = useState(localStorage.getItem("player-name") || ""),
    [invitation, setInvitation] = useState(room);
  const [info, setInfo] = useState<{
      kind: GameKind;
      players: number;
      seats: number;
    } | null>(null),
    [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scanInvitation = async () => {
    setError("");
    setScanning(true);
    try {
      const { Format, scan } =
        await import("@tauri-apps/plugin-barcode-scanner");
      const result = await scan({ formats: [Format.QRCode] });
      const value = result.content.trim();
      parseInvitation(value);
      if (!name.trim()) {
        setInvitation(value);
        setError("请填写昵称后加入");
        return;
      }
      onJoin(name.trim(), value);
    } catch (error) {
      if (!/取消|cancel/i.test(String(error))) setError(String(error));
    } finally {
      setScanning(false);
    }
  };
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
          onJoin(name.trim(), invitationLink(room, service));
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
          onJoin(
            name.trim(),
            room ? invitationLink(room, service) : invitation,
          );
        }}
      >
        {!room && (
          <TextField
            label="邀请链接"
            aria-label="邀请链接"
            value={invitation}
            onChange={(event) => setInvitation(event.target.value)}
          />
        )}
        <TextField
          label="你的昵称"
          aria-label="昵称"
          autoComplete="nickname"
          value={name}
          maxLength={24}
          onChange={(event) => setName(event.target.value)}
        />
        <AvatarPicker
          value={preferences.avatar}
          onChange={(avatar) => onPreferencesChange({ ...preferences, avatar })}
        />
        <ThemeControl
          value={preferences.theme}
          onChange={(theme) => onPreferencesChange({ ...preferences, theme })}
        />
        <details>
          <summary>动效偏好</summary>
          <MotionControls
            preferences={preferences}
            onChange={(motion) =>
              onPreferencesChange({ ...preferences, ...motion })
            }
          />
        </details>
        {!room && capabilities.qrScanner && (
          <button
            type="button"
            disabled={scanning}
            onClick={() => void scanInvitation()}
          >
            {scanning ? "正在打开相机…" : "扫描邀请二维码"}
          </button>
        )}
        <button
          className="primary-button"
          disabled={busy || scanning || !name.trim() || !invitation}
          type="submit"
        >
          {busy ? "连接中…" : "加入 / 恢复房间"}
        </button>
      </form>
    </main>
  );
}
