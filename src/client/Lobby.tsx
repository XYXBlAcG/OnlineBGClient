import { GolfDifficultyControl } from "./golf/GolfDifficultyControl";
import { DrawModeControl } from "./drawguess/DrawModeControl";
import type { DrawMode } from "../domain/drawguess/types";
import {
  arcadeGameKinds,
  type ArcadeSettings,
} from "../domain/arcade/campaign";
import { ExpeditionJournalPanel } from "./expedition/ExpeditionJournalPanel";
import { useExpeditionJournal } from "./expedition/use-expedition-journal";
import { useSceneTransition } from "./scene-transition";
import { usePresentation } from "./motion";
import { GameLibrary } from "./lobby/GameLibrary";
import { SceneSurface } from "./SceneSurface";
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
import { MinerOptionsControl } from "./miner/MinerOptionsControl";
import { minerOptionsSchema } from "../domain/miner/types";
import { invitationLink } from "./invitation";
import { MahjongOptionsControl } from "./mahjong/MahjongOptionsControl";
import {
  mahjongModeNames,
  mahjongOptionsSchema,
} from "../domain/mahjong/types";
import { AvatarPicker } from "./AvatarPicker";
import type { Preferences } from "./preferences";
import {
  Button,
  Select,
  Slider,
  Stepper,
  Switch,
  TextField,
} from "./ui/Controls";
import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { gameSeatMinimum, gameCatalogue, gameKinds, type GameKind } from "../domain/catalogue";
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
  const [arcade, setArcade] = useState(false);
  const [arcadeSettings, setArcadeSettings] = useState<ArcadeSettings>({
    countdown: false,
    actionLimit: false,
  });
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
  const [miner, setMiner] = useState(minerOptionsSchema.parse({}));
  const [expedition, setExpedition] = useState(
    expeditionOptionsSchema.parse({}),
  );
  const [dominion, setDominion] = useState(dominionOptionsSchema.parse({}));
  const [drawMode, setDrawMode] = useState<DrawMode>("classic");
  const [drawSeconds, setDrawSeconds] = useState(75);
  const [drawWordSource, setDrawWordSource] = useState<"all" | "custom">("all");
  const [golfDifficulty, setGolfDifficulty] = useState<Parameters<typeof GolfDifficultyControl>[0]["value"]>("standard");
  const [pool, setPool] = useState(poolOptionsSchema.parse({}));
  const [mahjong, setMahjong] = useState(mahjongOptionsSchema.parse({}));
  const expeditionJournal = useExpeditionJournal(kind === "expedition");
  const [catanTrades, setCatanTrades] = useState(true);
  const [team, setTeam] = useState(initialPreset?.team ?? false);
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
  const fitted = fitSeats({ kind, humans, ai, checkers, pool });
  const displayHumans = fitted.humans;
  const displayAi = balanceSeats({
    kind,
    humans: displayHumans,
    ai: fitted.ai,
  }).ai;
  const minSeats = arcade ? 2 : gameSeatMinimum(kind, drawMode);
  const total = displayHumans + displayAi.length;
  useEffect(() => {
    if (team && (kind === "uno" || kind === "miner") && ![4, 6].includes(total))
      setTeam(false);
  }, [team, kind, total]);
  const seatCap = arcade
    ? 4
    : kind === "tq" && checkers.mode === "siege"
      ? 2
      : kind === "pool"
        ? pool.mode === "party"
          ? 4
          : 2
        : game.maxPlayers;
  const humanFloor = ["tq", "scmj"].includes(kind)
    ? 0
    : game.ai
      ? 1
      : minSeats;
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
    setArcade(false);
    setNetworkPage("create");
    setHumans(
      gameCatalogue[next].ai
        ? Math.min(Math.max(["tq", "scmj"].includes(next) ? 0 : 1, humans), max)
        : gameSeatMinimum(next, drawMode),
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
        selected={arcade ? "arcade" : kind}
        disabled={busy || !creating}
        favorites={preferences.favorites}
        recent={frequentGames}
        onSelect={(next) => {
          if (next !== "arcade") {
            changeGame(next);
            return;
          }
          const people = Math.min(4, Math.max(1, humans));
          setArcade(true);
          setKind("miner");
          setHostOnly(false);
          setHumans(people);
          setAi(people === 1 ? [{ difficulty: "normal", name: "" }] : []);
          setTeam(false);
          setNetworkPage("create");
          prefetchGameSurface();
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
        <SceneSurface
          scene={
            creating ? `heading:${arcade ? "arcade" : kind}` : "heading:join"
          }
          enabled={preferences.lobbySwitchMotion}
          profile="panel" resize className="lobby-setup-transition"
        >
          <div className="club-setup-heading">
            {creating && <GameCover kind={arcade ? "arcade" : kind} />}
            <div>
              <h2>
                {creating
                  ? arcade
                    ? "多游戏远征"
                    : game.name
                  : "加入朋友的房间"}
              </h2>
              <p>
                {creating
                  ? arcade
                    ? "2–4 席"
                    : kind === "scmj"
                      ? mahjongModeNames[mahjong.mode ?? "sichuan"]
                      : `${minSeats}–${game.maxPlayers} 人`
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
        </SceneSurface>
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
              {mode === "network" && !arcade && (
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
                <Stepper
                  label="真人人数"
                  value={displayHumans}
                  min={humanFloor}
                  max={seatCap}
                  disabled={game.minPlayers === game.maxPlayers && !game.ai}
                  onValueChange={(count) => {
                    const manual = ai.filter((entry) => !entry.balance);
                    setHumans(count);
                    setAi(
                      Array.from(
                        {
                          length: game.ai
                            ? Math.max(
                                minSeats - count,
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
                />
              </div>
              <SceneSurface
                scene={`options:${arcade ? "arcade" : kind}`}
                enabled={preferences.lobbySwitchMotion}
                profile="panel" resize className="lobby-setup-transition"
              >
                {arcade && (
                  <section
                    className="lobby-options lobby-options-open"
                    aria-label="远征规则"
                  >
                    <Switch
                      label="启用倒计时"
                      checked={arcadeSettings.countdown}
                      onCheckedChange={(countdown) =>
                        setArcadeSettings({ ...arcadeSettings, countdown })
                      }
                    />
                    <Switch
                      label="限制行动次数"
                      checked={arcadeSettings.actionLimit}
                      onCheckedChange={(actionLimit) =>
                        setArcadeSettings({ ...arcadeSettings, actionLimit })
                      }
                    />
                    <label className="setting-row">
                      <span>优先出现的游戏</span>
                      <Select
                        aria-label="优先出现的游戏"
                        value={arcadeSettings.preferred ?? "random"}
                        onValueChange={(kind) =>
                          setArcadeSettings({
                            ...arcadeSettings,
                            preferred: arcadeGameKinds.find(
                              (game) => game === kind,
                            ),
                          })
                        }
                      >
                        <option value="random">随机路线</option>
                        {arcadeGameKinds
                          .filter((game) => game !== "miner")
                          .map((game) => (
                            <option
                              key={game}
                              value={game}
                              disabled={game === "ddz" && total > 3}
                            >
                              {gameCatalogue[game].name}
                            </option>
                          ))}
                      </Select>
                    </label>
                  </section>
                )}
                {!arcade &&
                  [
                    "graphwar",
                    "expedition",
                    "dominion",
                    "pool",
                    "scmj",
                    "fxq",
                    "tq",
                    "miner",
                    "drawguess",
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
                      {kind === "drawguess" && (
                        <DrawModeControl
                          value={drawMode}
                          drawingSeconds={drawSeconds}
                          wordSource={drawWordSource}
                          onChange={(mode) => {
                            setHumans(Math.max(gameSeatMinimum(kind, mode), displayHumans === minSeats ? 0 : displayHumans));
                            setDrawMode(mode);
                          }}
                          onDrawingSecondsChange={setDrawSeconds}
                          onWordSourceChange={setDrawWordSource}
                        />
                      )}
                      {kind === "golf" && <GolfDifficultyControl value={golfDifficulty} onChange={setGolfDifficulty} />}
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
                      {kind === "miner" && (
                        <MinerOptionsControl
                          value={miner}
                          onChange={setMiner}
                        />
                      )}
                    </section>
                  )}
              </SceneSurface>
              <div className="setting-row">
                <span>总席位</span>
                <Stepper
                  label="总席位"
                  value={total}
                  min={Math.max(displayHumans, minSeats)}
                  max={seatCap}
                  disabled={!game.ai}
                  onValueChange={(value) =>
                    setAi(
                      Array.from(
                        { length: value - displayHumans },
                        (_, index) =>
                          ai[index]
                            ? { ...ai[index], balance: undefined }
                            : { difficulty: "normal", name: "" },
                      ),
                    )
                  }
                />
              </div>
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
              {!arcade && game.team && (
                <Switch
                  label={
                    (kind === "uno" || kind === "miner") &&
                    ![4, 6].includes(total)
                      ? "组队模式 · 需要 4 或 6 人"
                      : "组队模式"
                  }
                  checked={team}
                  disabled={
                    (kind === "uno" || kind === "miner") &&
                    ![4, 6].includes(total)
                  }
                  onCheckedChange={setTeam}
                />
              )}
              <Button
                variant="primary"
                className={busy ? "operation-working" : ""}
                aria-busy={busy}
                disabled={
                  busy ||
                  !name.trim() ||
                  total < minSeats ||
                  (kind === "expedition" && expeditionJournal.loading)
                }
                onClick={() => {
                  if (!arcade)
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
                      ...(arcade ? { arcade: true, arcadeSettings } : {}),
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
                      drawguess: {
                        mode: drawMode,
                        drawingSeconds: drawSeconds,
                        wordSource: drawWordSource,
                      },
                      golf: { difficulty: golfDifficulty },
                      pool,
                      mahjong,
                      graphwar,
                      flight,
                      checkers,
                      miner,
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
