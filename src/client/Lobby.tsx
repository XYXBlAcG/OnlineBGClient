import { ExpeditionJournalPanel } from "./expedition/ExpeditionJournalPanel";
import { useExpeditionJournal } from "./expedition/use-expedition-journal";
import { useSceneTransition } from "./scene-transition";
import { usePresentation } from "./motion";
import { GameLibrary } from "./lobby/GameLibrary";
import { LobbySetupTransition } from "./lobby/LobbySetupTransition";
import { GameCover } from "./lobby/GameCover";
import "./lobby/lobby.css";
import {
  ExpeditionOptionsControl,
  expeditionAiDifficultyNames,
} from "./expedition/ExpeditionOptionsControl";
import { expeditionOptionsSchema } from "../domain/expedition/adventure-types";
import { DominionOptionsControl } from "./dominion/DominionOptionsControl";
import { dominionOptionsSchema } from "../domain/dominion/types";
import { poolOptionsSchema } from "../domain/pool/types";
import { PoolOptionsControl } from "./pool/PoolOptionsControl";
import { balanceSeats } from "../domain/room-balance";
import { fitSeats } from "../domain/room-seats";
import { GraphwarOptionsControl } from "./graphwar/GraphwarOptionsControl";
import { graphwarOptionsSchema } from "../domain/graphwar/types";
import { FlightOptionsControl } from "./flight/FlightOptionsControl";
import { flightOptionsSchema } from "../domain/flight";
import { CheckersOptionsControl } from "./checkers/CheckersOptionsControl";
import { checkersOptionsSchema } from "../domain/checkers";
import { invitationLink } from "./invitation";
import { MahjongOptionsControl } from "./mahjong/MahjongOptionsControl";
import {
  mahjongModeNames,
  mahjongOptionsSchema,
} from "../domain/mahjong/types";
import { AvatarPicker } from "./AvatarPicker";
import type { Preferences } from "./preferences";
import { Button, Select, Slider, Switch, TextField } from "./ui/Controls";
import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { gameCatalogue, gameKinds, type GameKind } from "../domain/catalogue";
import { prefetchGameSurface } from "./OriginalGameLazy";
import { configSchema, type RoomConfig } from "../domain/protocol";
import type { Difficulty } from "../domain/types";
import { difficultyNames } from "./game-difficulty";
import { readRoomPreset, saveRoomPreset } from "./lobby/room-preset";
export function Lobby({
  service,
  initialRoom,
  busy,
  onCreate,
  onJoin,
  preferences,
  onPreferencesChange,
}: {
  preferences: Preferences;
  onPreferencesChange: (preferences: Preferences) => void;
  service: string;
  initialRoom: string;
  busy: boolean;
  onCreate: (
    config: RoomConfig,
    name: string,
    mode: "local" | "network",
    service: string,
    temporary: boolean,
    hostOnly: boolean,
    lan?: boolean,
  ) => void;
  onJoin: (name: string, invitation: string, spectator?: boolean) => void;
}) {
  const [initialPreset] = useState(() => readRoomPreset());
  const [kind, setKind] = useState<GameKind>(initialPreset?.kind ?? "uno");
  const [spectator, setSpectator] = useState(false);
  const [networkPage, setNetworkPage] = useState<"join" | "create">("join");
  const [mode, setMode] = useState<"local" | "network">(
    initialRoom ? "network" : "local",
  );
  const creating = mode === "local" || networkPage === "create";
  const scene = useSceneTransition<HTMLElement>(
    `${mode}:${networkPage}`,
    usePresentation().ui,
  );
  const [name, setName] = useState(localStorage.getItem("player-name") || "我");
  const [humans, setHumans] = useState(initialPreset?.humans ?? 1);
  const [ai, setAi] = useState<RoomConfig["ai"]>(
    initialPreset?.ai ?? [
      { difficulty: "normal", name: "" },
      { difficulty: "normal", name: "" },
    ],
  );
  const [aiDelayMs, setDelay] = useState(initialPreset?.aiDelayMs ?? 1500);
  const [graphwar, setGraphwar] = useState(graphwarOptionsSchema.parse({}));
  const [flight, setFlight] = useState(flightOptionsSchema.parse({}));
  const [checkers, setCheckers] = useState(checkersOptionsSchema.parse({}));
  const [expedition, setExpedition] = useState(
    expeditionOptionsSchema.parse({}),
  );
  const [dominion, setDominion] = useState(dominionOptionsSchema.parse({}));
  const [pool, setPool] = useState(poolOptionsSchema.parse({}));
  const [mahjong, setMahjong] = useState(mahjongOptionsSchema.parse({}));
  const expeditionJournal = useExpeditionJournal(kind === "expedition");
  const [catanTrades, setCatanTrades] = useState(true);
  const [team, setTeam] = useState(initialPreset?.team ?? false);
  const [liteMotion, setLiteMotion] = useState(false);
  useEffect(() => {
    if (!preferences.lobbySwitchMotion) {
      setLiteMotion(false);
      return;
    }
    if (typeof requestAnimationFrame === "undefined") return;
    let active = true;
    let frame = 0;
    let frames = 0;
    const start = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - start < 600) {
        if (active) frame = requestAnimationFrame(tick);
        return;
      }
      if (active) setLiteMotion((frames * 1000) / (now - start) < 48);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [preferences.lobbySwitchMotion]);

  const endpoint = preferences.network.service || service;
  const [invitation, setInvitation] = useState(
    initialRoom ? invitationLink(initialRoom, service) : "",
  );
  const [hostOnly, setHostOnly] = useState(false);
  const [lan, setLan] = useState(false);
  const localDebug = isTauri() && preferences.network.showLanDebug && lan;
  const temporary = isTauri() && preferences.network.temporary;
  const game = gameCatalogue[kind];
  const aiDifficultyNames =
    kind === "expedition" ? expeditionAiDifficultyNames : difficultyNames;
  const fitted = fitSeats({ kind, humans, ai, checkers });
  const displayHumans = fitted.humans;
  const displayAi = balanceSeats({
    kind,
    humans: displayHumans,
    ai: fitted.ai,
  }).ai;
  const total = displayHumans + displayAi.length;
  const seatCap =
    kind === "tq" && checkers.mode === "siege" ? 2 : game.maxPlayers;
  const humanFloor = ["tq", "scmj"].includes(kind)
    ? 0
    : game.ai
      ? 1
      : game.minPlayers;
  const frequentGames = gameKinds
    .filter((gameKind) => preferences.gameStats[gameKind])
    .sort(
      (a, b) =>
        preferences.gameStats[b].plays - preferences.gameStats[a].plays ||
        preferences.gameStats[b].lastPlayed -
          preferences.gameStats[a].lastPlayed ||
        gameKinds.indexOf(a) - gameKinds.indexOf(b),
    );
  const changeGame = (next: GameKind) => {
    const max = gameCatalogue[next].maxPlayers;
    prefetchGameSurface();
    setKind(next);
    setNetworkPage("create");
    setHumans(
      gameCatalogue[next].ai
        ? Math.min(Math.max(["tq", "scmj"].includes(next) ? 0 : 1, humans), max)
        : gameCatalogue[next].minPlayers,
    );
    const count = Math.min(
      Math.max(["tq", "scmj"].includes(next) ? 0 : 1, humans),
      max,
    );
    setAi(
      gameCatalogue[next].ai
        ? Array.from(
            {
              length: Math.max(
                gameCatalogue[next].minPlayers - count,
                Math.min(ai.length, max - count),
              ),
            },
            (_, i) => ai[i] || { difficulty: "normal", name: "" },
          )
        : [],
    );
    setTeam(false);
  };
  return (
    <main
      ref={scene}
      data-motion-scope="ui"
      className="lobby-shell"
      data-entry={creating ? "create" : "join"}
    >
      <GameLibrary
        selected={kind}
        disabled={busy || !creating}
        favorites={preferences.favorites}
        recent={frequentGames}
        onSelect={(next) => {
          changeGame(next);
        }}
        onFavorite={(key) =>
          onPreferencesChange({
            ...preferences,
            favorites: preferences.favorites.includes(key)
              ? preferences.favorites.filter((value) => value !== key)
              : [...preferences.favorites, key],
          })
        }
      />
      <section className="room-setup">
        <LobbySetupTransition
          panelKey={creating ? `heading:${kind}` : "heading:join"}
          reduced={liteMotion || !preferences.lobbySwitchMotion}
          variant="heading"
        >
          <div className="club-setup-heading">
            {creating && <GameCover kind={kind} />}
            <div>
              <h2>{creating ? game.name : "加入朋友的房间"}</h2>
              <p>
                {creating
                  ? kind === "scmj"
                    ? mahjongModeNames[mahjong.mode ?? "sichuan"]
                    : `${game.minPlayers}–${game.maxPlayers} 人`
                  : "粘贴邀请链接"}
              </p>
            </div>
            {creating && kind === "expedition" && (
              <ExpeditionJournalPanel
                journal={expeditionJournal.journal}
                error={expeditionJournal.error}
                loading={expeditionJournal.loading}
                onUpgrade={expeditionJournal.upgrade}
                onImport={expeditionJournal.importJournal}
                onRefresh={expeditionJournal.refresh}
              />
            )}
          </div>
        </LobbySetupTransition>
        <div className="segmented">
          <button
            className={mode === "local" ? "active" : ""}
            onClick={() => setMode("local")}
          >
            本地对局
          </button>
          <button
            className={mode === "network" ? "active" : ""}
            onClick={() => {
              setMode("network");
              setNetworkPage("join");
            }}
          >
            跨网络联机
          </button>
        </div>
        {mode === "network" && (
          <div className="segmented" role="tablist" aria-label="联机方式">
            <button
              role="tab"
              aria-selected={networkPage === "join"}
              className={networkPage === "join" ? "active" : ""}
              disabled={busy}
              onClick={() => setNetworkPage("join")}
            >
              加入
            </button>
            <button
              role="tab"
              aria-selected={networkPage === "create"}
              className={networkPage === "create" ? "active" : ""}
              disabled={busy}
              onClick={() => setNetworkPage("create")}
            >
              创建房间
            </button>
          </div>
        )}
        <TextField
          label="昵称"
          value={name}
          maxLength={24}
          onChange={(event) => setName(event.target.value)}
        />
        <details className="lobby-options club-avatar">
          <summary>我的头像 · {preferences.avatar}</summary>
          <AvatarPicker
            value={preferences.avatar}
            onChange={(avatar) =>
              onPreferencesChange({ ...preferences, avatar })
            }
          />
        </details>
        <div className="lobby-body" data-scene-enter>
          {mode === "network" && !creating && (
            <div className="invite-entry">
              <Switch
                label="只旁观，不占游戏席位"
                checked={spectator}
                onCheckedChange={setSpectator}
              />
              <TextField
                label="邀请链接"
                aria-label="邀请链接"
                value={invitation}
                onChange={(event) => setInvitation(event.target.value)}
              />
              <Button
                variant="primary"
                disabled={busy || !name.trim() || !invitation.trim()}
                onClick={() => onJoin(name, invitation, spectator)}
              >
                加入 / 恢复房间
              </Button>
            </div>
          )}
          {creating && (
            <>
              {kind === "tq" && preferences.benchmarkVisible && (
                <button
                  onClick={() => {
                    setHumans(0);
                    setAi(
                      Array.from({ length: 6 }, () => ({
                        difficulty: "hard",
                        name: "",
                      })),
                    );
                    setDelay(0);
                    setMode("local");
                  }}
                >
                  6 个困难 AI 性能测试
                </button>
              )}
              {mode === "network" && (
                <Switch
                  label="只旁观，不占游戏席位"
                  checked={hostOnly}
                  onCheckedChange={setHostOnly}
                />
              )}
              {mode === "network" &&
                isTauri() &&
                preferences.network.showLanDebug && (
                  <Switch
                    label="局域网调试（同一 Wi-Fi，无需公网入口）"
                    checked={lan}
                    onCheckedChange={setLan}
                  />
                )}
              <div className="setting-row">
                <span>真人玩家</span>
                <Select
                  disabled={game.minPlayers === game.maxPlayers && !game.ai}
                  aria-label="真人人数"
                  value={displayHumans}
                  onValueChange={(value) => {
                    const count = Number(value),
                      manual = ai.filter((entry) => !entry.balance);
                    setHumans(count);
                    setAi(
                      Array.from(
                        {
                          length: game.ai
                            ? Math.max(
                                game.minPlayers - count,
                                Math.min(manual.length, seatCap - count),
                              )
                            : 0,
                        },
                        (_, index) =>
                          manual[index]
                            ? { ...manual[index], balance: undefined }
                            : { difficulty: "normal", name: "" },
                      ),
                    );
                  }}
                >
                  {Array.from(
                    { length: seatCap - humanFloor + 1 },
                    (_, index) => (
                      <option key={index} value={index + humanFloor}>
                        {index + humanFloor} 人
                      </option>
                    ),
                  )}
                </Select>
              </div>
              <LobbySetupTransition
                panelKey={`options:${kind}`}
                reduced={liteMotion || !preferences.lobbySwitchMotion}
                variant="options"
              >
                {[
                  "graphwar",
                  "expedition",
                  "dominion",
                  "pool",
                  "scmj",
                  "fxq",
                  "tq",
                ].includes(kind) && (
                  <section
                    className="lobby-options lobby-options-open"
                    aria-label="玩法选项"
                  >
                    <div className="lobby-options-title">玩法选项</div>
                    {kind === "graphwar" && (
                      <>
                        <GraphwarOptionsControl
                          value={graphwar}
                          onChange={setGraphwar}
                        />
                        {total * graphwar.soldiers > 36 &&
                          graphwar.size === "standard" && (
                            <button
                              onClick={() =>
                                setGraphwar({ ...graphwar, size: "large" })
                              }
                            >
                              兵力较多，切换大型地图
                            </button>
                          )}
                      </>
                    )}
                    {kind === "expedition" && (
                      <ExpeditionOptionsControl
                        value={expedition}
                        onChange={setExpedition}
                        journal={
                          expeditionJournal.loading
                            ? undefined
                            : expeditionJournal.journal
                        }
                      />
                    )}
                    {kind === "dominion" && (
                      <DominionOptionsControl
                        value={dominion}
                        onChange={setDominion}
                      />
                    )}
                    {kind === "pool" && (
                      <PoolOptionsControl value={pool} onChange={setPool} />
                    )}
                    {kind === "scmj" && (
                      <MahjongOptionsControl
                        value={mahjong}
                        onChange={setMahjong}
                      />
                    )}
                    {kind === "fxq" && (
                      <FlightOptionsControl
                        value={flight}
                        onChange={setFlight}
                      />
                    )}
                    {kind === "tq" && (
                      <CheckersOptionsControl
                        value={checkers}
                        onChange={setCheckers}
                      />
                    )}
                  </section>
                )}
              </LobbySetupTransition>
              <div className="setting-row">
                <span>总席位</span>
                <Select
                  disabled={!game.ai}
                  aria-label="总席位"
                  value={total}
                  onValueChange={(value) =>
                    setAi(
                      Array.from(
                        { length: Number(value) - displayHumans },
                        (_, index) =>
                          ai[index]
                            ? { ...ai[index], balance: undefined }
                            : { difficulty: "normal", name: "" },
                      ),
                    )
                  }
                >
                  {Array.from(
                    {
                      length:
                        seatCap - Math.max(displayHumans, game.minPlayers) + 1,
                    },
                    (_, index) => (
                      <option
                        key={index}
                        value={Math.max(displayHumans, game.minPlayers) + index}
                      >
                        {Math.max(displayHumans, game.minPlayers) + index} 人
                      </option>
                    ),
                  )}
                </Select>
              </div>
              {!game.ai && (
                <p className="muted">{displayHumans} 名真人 · AI 尚未接入</p>
              )}
              {!!displayAi.length && (
                <details className="lobby-options">
                  <summary>AI 玩家 · {displayAi.length} 位</summary>
                  <div className="ai-settings">
                    {displayAi.map((entry, index) => (
                      <div className="ai-setting" key={index}>
                        <span className="ai-badge">
                          {entry.balance ? "平衡补位" : `AI ${index + 1}`}
                        </span>
                        <input
                          aria-label={`AI ${index + 1} 名称`}
                          placeholder={
                            kind === "sgs" ? "自动使用武将名" : "自动生成名称"
                          }
                          value={entry.name}
                          maxLength={24}
                          onChange={(event) =>
                            setAi(
                              displayAi.map((value, id) =>
                                id === index
                                  ? { ...value, name: event.target.value }
                                  : value,
                              ),
                            )
                          }
                        />
                        <Select
                          aria-label={`AI ${index + 1} 难度`}
                          value={entry.difficulty}
                          onValueChange={(difficulty) =>
                            setAi(
                              displayAi.map((value, id) =>
                                id === index
                                  ? {
                                      ...value,
                                      difficulty: difficulty as Difficulty,
                                    }
                                  : value,
                              ),
                            )
                          }
                        >
                          {Object.entries(aiDifficultyNames).map(
                            ([value, label]) => (
                              <option value={value} key={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </Select>
                      </div>
                    ))}
                  </div>
                  {!!displayAi.length && (
                    <label className="tempo-control">
                      AI 动作间隔{" "}
                      <output>{(aiDelayMs / 1000).toFixed(2)} 秒</output>
                      <Slider
                        aria-label="AI 动作间隔"
                        min={0}
                        max={5000}
                        step={1}
                        value={aiDelayMs}
                        onValueChange={setDelay}
                      />
                    </label>
                  )}
                </details>
              )}
              {kind === "ktd" && !!ai.length && (
                <Switch
                  label="允许 AI 主动提出交易"
                  checked={catanTrades}
                  onCheckedChange={setCatanTrades}
                />
              )}
              {game.team && (
                <Switch
                  label={
                    kind === "uno" && ![4, 6].includes(total)
                      ? "组队模式 · 需要 4 或 6 人"
                      : "组队模式"
                  }
                  checked={team}
                  disabled={kind === "uno" && ![4, 6].includes(total)}
                  onCheckedChange={setTeam}
                />
              )}
              <p className="club-seat-summary">
                {displayHumans} 名真人 · {displayAi.length} 名 AI
                {displayAi.some((entry) => entry.balance)
                  ? " · 已平衡两队"
                  : ""}
              </p>
              <Button
                variant="primary"
                className={busy ? "operation-working" : ""}
                aria-busy={busy}
                disabled={
                  busy ||
                  !name.trim() ||
                  total < game.minPlayers ||
                  (kind === "expedition" && expeditionJournal.loading)
                }
                onClick={() => {
                  saveRoomPreset({
                    kind,
                    humans: displayHumans,
                    ai: displayAi,
                    team,
                    aiDelayMs,
                  });
                  onCreate(
                    configSchema.parse({
                      kind,
                      humans: displayHumans,
                      ai: displayAi,
                      team,
                      training: false,
                      aiDelayMs,
                      auditEnabled: preferences.auditVisible,
                      catanTrades,
                      expedition: {
                        ...expedition,
                        legacy: expeditionJournal.journal.legacy,
                      },
                      dominion,
                      pool,
                      mahjong,
                      graphwar,
                      flight,
                      checkers,
                      performance: preferences.performance,
                    }),
                    name,
                    mode,
                    endpoint,
                    temporary,
                    mode === "network" && hostOnly,
                    mode === "network" && localDebug,
                  );
                }}
              >
                {busy
                  ? "正在准备房间…"
                  : mode === "network" && localDebug
                    ? "创建局域网调试房间"
                    : mode === "network" && temporary
                      ? "一键创建公网房间"
                      : "创建房间"}
              </Button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
