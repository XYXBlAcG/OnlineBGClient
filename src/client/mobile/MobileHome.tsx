import { useState } from "react";
import type { Preferences } from "../preferences";
import {
  gameCatalogue,
  mobileGameKinds,
  type GameKind,
} from "../../domain/catalogue";
import type { RoomConfig } from "../../domain/protocol";
import { MobileJoin } from "../MobileJoin";
import { MobileLobby } from "./MobileLobby";
import { localRoomConfig } from "./local-room";
import { useExpeditionJournal } from "../expedition/use-expedition-journal";

function latestGame(preferences: Preferences): GameKind {
  const played = mobileGameKinds
    .filter((kind) => preferences.gameStats[kind])
    .sort(
      (a, b) =>
        preferences.gameStats[b].lastPlayed -
        preferences.gameStats[a].lastPlayed,
    );
  return played[0] ?? "uno";
}

export function MobileHome({
  preferences,
  onPreferencesChange,
  room,
  service,
  busy,
  name,
  onJoin,
  onStartLocal,
}: {
  preferences: Preferences;
  onPreferencesChange: (preferences: Preferences) => void;
  room: string;
  service: string;
  busy: boolean;
  name: string;
  onJoin: (name: string, invitation: string) => void;
  onStartLocal: (config: RoomConfig) => void;
}) {
  const [view, setView] = useState<"home" | "join" | "local">("home");
  const lastGame = latestGame(preferences);
  const expeditionJournal = useExpeditionJournal(lastGame === "expedition");
  const lastRoom = localStorage.getItem("onlinebg.last-room");
  if (room) {
    return (
      <MobileJoin
        preferences={preferences}
        onPreferencesChange={onPreferencesChange}
        room={room}
        service={service}
        busy={busy}
        onJoin={onJoin}
      />
    );
  }
  if (view === "join") {
    return (
      <div className="mobile-home-route">
        <button
          type="button"
          className="mobile-back"
          onClick={() => setView("home")}
        >
          ← 返回
        </button>
        <MobileJoin
          preferences={preferences}
          onPreferencesChange={onPreferencesChange}
          room=""
          service={service}
          busy={busy}
          onJoin={onJoin}
        />
      </div>
    );
  }
  if (view === "local") {
    return (
      <MobileLobby
        initialKind={lastGame}
        onBack={() => setView("home")}
        onStart={onStartLocal}
      />
    );
  }
  return (
    <main className="mobile-home">
      <header className="mobile-home-heading">
        <p className="mobile-home-eyebrow">OnlineBGClient</p>
        <h1>今晚玩什么？</h1>
        <p>和朋友开一桌，或者自己先玩一局。</p>
      </header>
      <section className="mobile-home-hero" aria-label="快速开始">
        <div>
          <small>上次玩的</small>
          <strong>{gameCatalogue[lastGame].name}</strong>
          <p>{gameCatalogue[lastGame].description}</p>
        </div>
        <button
          type="button"
          className="primary-button"
          disabled={lastGame === "expedition" && expeditionJournal.loading}
          onClick={() =>
            onStartLocal(
              localRoomConfig(lastGame, {
                expeditionLegacy:
                  lastGame === "expedition"
                    ? expeditionJournal.journal.legacy
                    : undefined,
              }),
            )
          }
        >
          {gameCatalogue[lastGame].ai ? "和 AI 玩" : "同屏开局"}
        </button>
      </section>
      <section className="mobile-home-actions" aria-label="更多入口">
        <button type="button" onClick={() => setView("local")}>
          <span>本地大厅</span>
          <small>选择游戏和 AI</small>
        </button>
        <button type="button" onClick={() => setView("join")}>
          <span>加入房间</span>
          <small>链接或二维码</small>
        </button>
      </section>
      {lastRoom && (
        <button
          type="button"
          className="mobile-home-recent"
          onClick={() => onJoin(name, lastRoom)}
        >
          继续上次房间
        </button>
      )}
      <p className="mobile-home-footnote">
        朋友发来的邀请链接可以直接在浏览器打开，也可以在这里扫码加入。
      </p>
    </main>
  );
}
