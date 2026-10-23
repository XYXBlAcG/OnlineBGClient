import { balanceSeats } from "../domain/room-balance";
import { GraphwarOptionsControl } from "./graphwar/GraphwarOptionsControl";
import { graphwarOptionsSchema } from "../domain/graphwar/types";
import { invitationLink } from "./invitation";
import { MahjongOptionsControl } from "./mahjong/MahjongOptionsControl";
import { mahjongOptionsSchema } from "../domain/mahjong/types";
import { AvatarPicker } from "./AvatarPicker";
import type { Preferences } from "./preferences";
import { Select, Slider } from "./ui/Controls";
import { useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { gameCatalogue, gameKinds, type GameKind } from "../domain/catalogue";
import { configSchema, type RoomConfig } from "../domain/protocol";
import type { Difficulty } from "../domain/types";

export const difficultyNames: Record<Difficulty, string> = {
  easy: "简单",
  normal: "普通",
  hard: "困难",
};
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
  ) => void;
  onJoin: (name: string, invitation: string) => void;
}) {
  const [kind, setKind] = useState<GameKind>("uno");
  const [mode, setMode] = useState<"local" | "network">(
    initialRoom ? "network" : "local",
  );
  const [name, setName] = useState(localStorage.getItem("player-name") || "我");
  const [humans, setHumans] = useState(1);
  const [ai, setAi] = useState<RoomConfig["ai"]>([
    { difficulty: "normal", name: "" },
    { difficulty: "normal", name: "" },
  ]);
  const [aiDelayMs, setDelay] = useState(1500);
  const [graphwar, setGraphwar] = useState(graphwarOptionsSchema.parse({}));
  const [mahjong, setMahjong] = useState(mahjongOptionsSchema.parse({}));
  const [catanTrades, setCatanTrades] = useState(true);
  const [team, setTeam] = useState(false);
  const [training, setTraining] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [endpoint, setEndpoint] = useState(service);
  const [invitation, setInvitation] = useState(
    initialRoom ? invitationLink(initialRoom, service) : "",
  );
  const [hostOnly, setHostOnly] = useState(false);
  const [temporary, setTemporary] = useState(isTauri());
  const game = gameCatalogue[kind];
  const displayAi = balanceSeats({ kind, humans, ai }).ai;
  const total = humans + displayAi.length;
  const changeGame = (next: GameKind) => {
    const max = gameCatalogue[next].maxPlayers;
    setKind(next);
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
    <main className="lobby-shell">
      <section className="game-library">
        <div className="library-heading">
          <div>
            <h1>一起玩一局</h1>
            <p>选个游戏，叫上朋友</p>
          </div>
          <input
            aria-label="搜索游戏"
            placeholder="搜索游戏"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="category-tabs">
          {[
            "全部",
            "收藏",
            "最近",
            ...new Set(gameKinds.map((key) => gameCatalogue[key].category)),
          ].map((value) => (
            <button
              key={value}
              className={category === value ? "active" : ""}
              onClick={() => setCategory(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="game-picker">
          {gameKinds
            .filter(
              (key) =>
                (category === "全部" ||
                  gameCatalogue[key].category === category ||
                  (category === "收藏" &&
                    preferences.favorites.includes(key)) ||
                  (category === "最近" &&
                    preferences.recentGames.includes(key))) &&
                gameCatalogue[key].name
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .map((key) => (
              <div
                key={key}
                className={`game-card ${kind === key ? "active" : ""}`}
              >
                <button
                  className="game-card-main"
                  onClick={() => changeGame(key)}
                  aria-pressed={kind === key}
                >
                  <span className="game-symbol" data-game-icon={key}>
                    {key === "uno" ? (
                      <svg viewBox="0 0 48 48" aria-hidden="true">
                        <rect
                          x="6"
                          y="8"
                          width="25"
                          height="33"
                          rx="5"
                          fill="#e5444e"
                          transform="rotate(-12 18 24)"
                        />
                        <rect
                          x="16"
                          y="6"
                          width="25"
                          height="34"
                          rx="5"
                          fill="#246bd2"
                          transform="rotate(10 28 24)"
                        />
                        <ellipse
                          cx="29"
                          cy="23"
                          rx="8"
                          ry="13"
                          fill="#fff"
                          transform="rotate(24 29 23)"
                        />
                        <text
                          x="29"
                          y="27"
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="bold"
                          fill="#c32636"
                        >
                          UNO
                        </text>
                      </svg>
                    ) : key === "dy" ? (
                      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                        <path
                          d="M12 3h8M14 3v10L5 26a2 2 0 0 0 2 3h18a2 2 0 0 0 2-3l-9-13V3M10 20h12"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="16" cy="24" r="1.5" fill="currentColor" />
                      </svg>
                    ) : (
                      gameCatalogue[key].symbol
                    )}
                  </span>
                  <strong>{gameCatalogue[key].name}</strong>
                  <span>{gameCatalogue[key].description}</span>
                  <small>
                    {gameCatalogue[key].minPlayers}–
                    {gameCatalogue[key].maxPlayers} 人
                  </small>
                </button>
                <button
                  className="game-favorite"
                  aria-label={`${preferences.favorites.includes(key) ? "取消收藏" : "收藏"}${gameCatalogue[key].name}`}
                  aria-pressed={preferences.favorites.includes(key)}
                  onClick={() =>
                    onPreferencesChange({
                      ...preferences,
                      favorites: preferences.favorites.includes(key)
                        ? preferences.favorites.filter((value) => value !== key)
                        : [...preferences.favorites, key],
                    })
                  }
                >
                  {preferences.favorites.includes(key) ? "★" : "☆"}
                </button>
              </div>
            ))}
        </div>
      </section>
      <section className="room-setup">
        <h2>{game.name}</h2>
        <div className="segmented">
          <button
            className={mode === "local" ? "active" : ""}
            onClick={() => setMode("local")}
          >
            本地对局
          </button>
          <button
            className={mode === "network" ? "active" : ""}
            onClick={() => setMode("network")}
          >
            跨网络联机
          </button>
        </div>
        <label>
          昵称
          <input
            value={name}
            maxLength={24}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <AvatarPicker
          value={preferences.avatar}
          onChange={(avatar) => onPreferencesChange({ ...preferences, avatar })}
        />
        {mode === "network" && (
          <div className="invite-entry">
            <input
              aria-label="邀请链接"
              placeholder="粘贴邀请链接"
              value={invitation}
              onChange={(event) => setInvitation(event.target.value)}
            />
            <button
              disabled={busy || !name.trim() || !invitation.trim()}
              onClick={() => onJoin(name, invitation)}
            >
              加入 / 恢复房间
            </button>
          </div>
        )}
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
          <label className="setting-row">
            <span>仅启动服务，不参与游戏</span>
            <input
              type="checkbox"
              checked={hostOnly}
              onChange={(event) => setHostOnly(event.target.checked)}
            />
          </label>
        )}
        <div className="setting-row">
          <span>真人玩家</span>
          <Select
            disabled={game.minPlayers === game.maxPlayers && !game.ai}
            aria-label="真人人数"
            value={humans}
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
                          Math.min(manual.length, game.maxPlayers - count),
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
              {
                length:
                  game.maxPlayers -
                  (["tq", "scmj"].includes(kind)
                    ? 0
                    : game.ai
                      ? 1
                      : game.minPlayers) +
                  1,
              },
              (_, index) => (
                <option
                  key={index}
                  value={
                    index +
                    (["tq", "scmj"].includes(kind)
                      ? 0
                      : game.ai
                        ? 1
                        : game.minPlayers)
                  }
                >
                  {index +
                    (["tq", "scmj"].includes(kind)
                      ? 0
                      : game.ai
                        ? 1
                        : game.minPlayers)}{" "}
                  人
                </option>
              ),
            )}
          </Select>
        </div>
        {kind === "graphwar" && (
          <>
            <GraphwarOptionsControl value={graphwar} onChange={setGraphwar} />
            {total * graphwar.soldiers > 36 && graphwar.size === "standard" && (
              <button
                onClick={() => setGraphwar({ ...graphwar, size: "large" })}
              >
                兵力较多，切换大型地图
              </button>
            )}
          </>
        )}
        {kind === "scmj" && (
          <MahjongOptionsControl value={mahjong} onChange={setMahjong} />
        )}
        <div className="setting-row">
          <span>总席位</span>
          <Select
            disabled={!game.ai}
            aria-label="总席位"
            value={total}
            onValueChange={(value) =>
              setAi(
                Array.from({ length: Number(value) - humans }, (_, index) =>
                  ai[index]
                    ? { ...ai[index], balance: undefined }
                    : { difficulty: "normal", name: "" },
                ),
              )
            }
          >
            {Array.from(
              {
                length: game.maxPlayers - Math.max(humans, game.minPlayers) + 1,
              },
              (_, index) => (
                <option
                  key={index}
                  value={Math.max(humans, game.minPlayers) + index}
                >
                  {Math.max(humans, game.minPlayers) + index} 人
                </option>
              ),
            )}
          </Select>
        </div>
        {!game.ai && <p className="muted">{humans} 名真人 · AI 尚未接入</p>}
        <div className="ai-settings">
          {displayAi.map((entry, index) => (
            <div className="ai-setting" key={index}>
              <span className="ai-badge">
                {entry.balance ? "平衡补位" : `AI ${index + 1}`}
              </span>
              <input
                aria-label={`AI ${index + 1} 名称`}
                placeholder={kind === "sgs" ? "自动使用武将名" : "自动生成名称"}
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
                        ? { ...value, difficulty: difficulty as Difficulty }
                        : value,
                    ),
                  )
                }
              >
                {Object.entries(difficultyNames).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
        {!!displayAi.length && (
          <label className="tempo-control">
            AI 动作间隔 <output>{(aiDelayMs / 1000).toFixed(1)} 秒</output>
            <Slider
              aria-label="AI 动作间隔"
              min={0}
              max={5000}
              step={250}
              value={aiDelayMs}
              onValueChange={setDelay}
            />
          </label>
        )}
        {kind === "ktd" && !!ai.length && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={catanTrades}
              onChange={(event) => setCatanTrades(event.target.checked)}
            />
            允许 AI 主动提出交易
          </label>
        )}
        <details className="advanced">
          <summary>更多设置</summary>
          {game.team && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={team}
                onChange={(event) => setTeam(event.target.checked)}
              />
              组队模式
            </label>
          )}
          {game.ai && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={training}
                onChange={(event) => setTraining(event.target.checked)}
              />
              训练房间：即时查看 AI 完整决策
            </label>
          )}
          {mode === "network" && (
            <>
              {isTauri() && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={temporary}
                    onChange={(event) => setTemporary(event.target.checked)}
                  />
                  自动创建临时公网入口
                </label>
              )}
              <label>
                房间服务地址
                <input
                  value={endpoint}
                  onChange={(event) => setEndpoint(event.target.value)}
                />
              </label>
            </>
          )}
        </details>
        <button
          className="primary-button"
          disabled={busy || !name.trim() || total < game.minPlayers}
          onClick={() =>
            onCreate(
              configSchema.parse({
                kind,
                humans,
                ai: displayAi,
                team,
                training,
                aiDelayMs,
                auditEnabled: preferences.auditVisible,
                catanTrades,
                mahjong,
                graphwar,
                performance: preferences.performance,
              }),
              name,
              mode,
              endpoint,
              temporary,
              mode === "network" && hostOnly,
            )
          }
        >
          {busy
            ? "正在准备房间…"
            : mode === "network" && temporary
              ? "一键创建公网房间"
              : "创建房间"}
        </button>
      </section>
    </main>
  );
}
