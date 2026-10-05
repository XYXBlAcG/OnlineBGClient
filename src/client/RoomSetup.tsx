import { useState } from "react";
import { gameCatalogue, gameKinds, type GameKind } from "../domain/catalogue";
import {
  configSchema,
  type RoomSetup as Setup,
  type Snapshot,
} from "../domain/protocol";
import { Panel, Select } from "./ui/Controls";
import { confirmation } from "./confirmation-controller";
import { difficultyNames } from "./Lobby";
export function RoomSetup({
  snapshot,
  onApply,
  onError,
}: {
  snapshot: Snapshot;
  onApply: (setup: Setup) => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [config, setConfig] = useState(snapshot.config),
    [retain, setRetain] = useState<string[]>([]),
    [members, setMembers] = useState<string[]>([]);
  const game = gameCatalogue[config.kind];
  return (
    <>
      <button
        onClick={() => {
          setConfig(structuredClone(snapshot.config));
          const ids = snapshot.seats
            .filter((s) => !s.difficulty && s.name)
            .map((s) => s.id);
          setRetain(ids);
          setMembers(ids);
          setOpen(true);
        }}
      >
        游戏与人数
      </button>
      <Panel open={open} onOpenChange={setOpen} title="下一局">
        <label className="setting-row">
          游戏
          <Select
            aria-label="下一局游戏"
            value={config.kind}
            onValueChange={(value) => {
              const kind = value as GameKind,
                g = gameCatalogue[kind],
                total = Math.max(
                  g.minPlayers,
                  Math.min(config.humans + config.ai.length, g.maxPlayers),
                ),
                humans = g.ai
                  ? Math.max(
                      kind === "tq" ? 0 : 1,
                      Math.min(config.humans, total),
                    )
                  : total;
              setConfig({
                ...config,
                kind,
                humans,
                ai: g.ai
                  ? Array.from(
                      { length: total - humans },
                      (_, i) =>
                        config.ai[i] || { difficulty: "normal", name: "" },
                    )
                  : [],
                team: g.team && config.team,
              });
            }}
          >
            {gameKinds.map((kind) => (
              <option key={kind} value={kind}>
                {gameCatalogue[kind].name}
              </option>
            ))}
          </Select>
        </label>
        <label className="setting-row">
          真人席位
          <Select
            aria-label="下一局真人席位"
            value={config.humans}
            onValueChange={(value) => {
              const humans = Number(value);
              setConfig({
                ...config,
                humans,
                ai: config.ai.slice(0, game.maxPlayers - humans),
              });
            }}
          >
            {Array.from(
              {
                length:
                  game.maxPlayers -
                  (config.kind === "tq" ? 0 : game.ai ? 1 : game.minPlayers) +
                  1,
              },
              (_, i) => (
                <option
                  key={i}
                  value={
                    i +
                    (config.kind === "tq" ? 0 : game.ai ? 1 : game.minPlayers)
                  }
                >
                  {i +
                    (config.kind === "tq" ? 0 : game.ai ? 1 : game.minPlayers)}
                </option>
              ),
            )}
          </Select>
        </label>
        {game.ai && (
          <label className="setting-row">
            AI 席位
            <Select
              aria-label="下一局AI席位"
              value={config.ai.length}
              onValueChange={(value) =>
                setConfig({
                  ...config,
                  ai: Array.from(
                    { length: Number(value) },
                    (_, i) =>
                      config.ai[i] || { difficulty: "normal", name: "" },
                  ),
                })
              }
            >
              {Array.from(
                { length: game.maxPlayers - config.humans + 1 },
                (_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ),
              )}
            </Select>
          </label>
        )}
        {config.ai.map((ai, i) => (
          <div className="setting-row" key={i}>
            <input
              aria-label={`AI ${i + 1} 名称`}
              placeholder="自动命名"
              maxLength={24}
              value={ai.name}
              onChange={(event) =>
                setConfig({
                  ...config,
                  ai: config.ai.map((entry, index) =>
                    index === i
                      ? { ...entry, name: event.target.value }
                      : entry,
                  ),
                })
              }
            />
            <Select
              aria-label={`AI ${i + 1} 难度`}
              value={ai.difficulty}
              onValueChange={(value) =>
                setConfig({
                  ...config,
                  ai: config.ai.map((entry, index) =>
                    index === i
                      ? { ...entry, difficulty: value as typeof ai.difficulty }
                      : entry,
                  ),
                })
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
        {config.kind === "ktd" && (
          <label className="setting-row">
            <span>AI 主动交易</span>
            <input
              type="checkbox"
              checked={config.catanTrades}
              onChange={(event) =>
                setConfig({ ...config, catanTrades: event.target.checked })
              }
            />
          </label>
        )}
        <h3>保留玩家</h3>
        {snapshot.seats
          .filter((seat) => members.includes(seat.id))
          .map((seat) => (
            <label key={seat.id} className="setting-row">
              <span>{seat.name}</span>
              <input
                type="checkbox"
                checked={retain.includes(seat.id)}
                disabled={seat.id === snapshot.seats[0].id}
                onChange={(event) =>
                  setRetain(
                    event.target.checked
                      ? [...retain, seat.id]
                      : retain.filter((id) => id !== seat.id),
                  )
                }
              />
            </label>
          ))}
        <button
          className="primary-button"
          onClick={async () => {
            const parsed = configSchema.safeParse(config);
            if (!parsed.success) {
              onError(parsed.error.issues[0].message);
              return;
            }
            if (retain.length > config.humans) {
              onError("保留玩家超过真人席位数");
              return;
            }
            const removed = snapshot.seats
              .filter((s) => members.includes(s.id) && !retain.includes(s.id))
              .map((s) => s.name);
            const playing = !!snapshot.state && !snapshot.finished;
            if (
              (playing || removed.length) &&
              !(await confirmation.request(
                [
                  playing ? "当前对局将结束并保存回放。" : "",
                  removed.length ? `移除玩家：${removed.join("、")}。` : "",
                  "确认应用下一局配置？",
                ].join(""),
                "应用配置",
              ))
            )
              return;
            onApply({
              config: parsed.data,
              retain,
              members,
              endCurrent: playing,
            });
            setOpen(false);
          }}
        >
          应用
        </button>
      </Panel>
    </>
  );
}
