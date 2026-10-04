import type { Preferences } from "./preferences";
import { Select, Slider } from "./ui/Controls";
import { useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { gameCatalogue, gameKinds, type GameKind } from "../domain/catalogue";
import type { RoomConfig } from "../domain/protocol";
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
  ) => void;
  onJoin: (name: string, invitation: string, service: string) => void;
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
  const [team, setTeam] = useState(false);
  const [training, setTraining] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [endpoint, setEndpoint] = useState(service);
  const [invitation, setInvitation] = useState(initialRoom);
  const [temporary, setTemporary] = useState(isTauri());
  const game = gameCatalogue[kind];
  const total = humans + ai.length;
  const changeGame = (next: GameKind) => {
    const max = gameCatalogue[next].maxPlayers;
    setKind(next);
    setHumans(
      gameCatalogue[next].ai
        ? Math.min(humans, max)
        : gameCatalogue[next].minPlayers,
    );
    setAi(
      gameCatalogue[next].ai
        ? ai.slice(0, Math.max(0, max - Math.min(humans, max)))
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
                  <span className={`game-symbol ${key}`}>
                    {gameCatalogue[key].symbol}
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
        {mode === "network" && (
          <div className="invite-entry">
            <input
              aria-label="邀请链接或房间号"
              placeholder="粘贴邀请链接或房间号"
              value={invitation}
              onChange={(event) => setInvitation(event.target.value)}
            />
            <button
              disabled={busy || !name.trim() || !invitation.trim()}
              onClick={() => onJoin(name, invitation, endpoint)}
            >
              加入 / 恢复房间
            </button>
          </div>
        )}
        <div className="setting-row">
          <span>真人玩家</span>
          <Select
            disabled={!game.ai}
            aria-label="真人人数"
            value={humans}
            onValueChange={(value) => {
              const count = Number(value);
              setHumans(count);
              setAi(
                Array.from(
                  {
                    length: Math.max(
                      game.minPlayers - count,
                      Math.min(ai.length, game.maxPlayers - count),
                    ),
                  },
                  (_, index) => ai[index] || { difficulty: "normal", name: "" },
                ),
              );
            }}
          >
            {Array.from({ length: game.maxPlayers }, (_, index) => (
              <option key={index} value={index + 1}>
                {index + 1} 人
              </option>
            ))}
          </Select>
        </div>
        <div className="setting-row">
          <span>总席位</span>
          <Select
            aria-label="总席位"
            value={total}
            onValueChange={(value) =>
              setAi(
                Array.from(
                  { length: Number(value) - humans },
                  (_, index) => ai[index] || { difficulty: "normal", name: "" },
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
        {!game.ai && <p className="muted">三名真人对局 · AI 尚未接入</p>}
        <div className="ai-settings">
          {ai.map((entry, index) => (
            <div className="ai-setting" key={index}>
              <span className="ai-badge">AI {index + 1}</span>
              <input
                aria-label={`AI ${index + 1} 名称`}
                placeholder={kind === "sgs" ? "自动使用武将名" : "自动生成名称"}
                value={entry.name}
                maxLength={24}
                onChange={(event) =>
                  setAi(
                    ai.map((value, id) =>
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
                    ai.map((value, id) =>
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
        {!!ai.length && (
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
              { kind, humans, ai, team, training, aiDelayMs },
              name,
              mode,
              endpoint,
              temporary,
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
