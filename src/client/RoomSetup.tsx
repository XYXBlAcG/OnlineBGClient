import { PoolOptionsControl } from "./pool/PoolOptionsControl";
import type { CommandRegistry } from "./commands";
import { Shortcut } from "./ui/Shortcut";
import {
  ExpeditionOptionsControl,
  expeditionAiDifficultyNames,
} from "./expedition/ExpeditionOptionsControl";
import { DominionOptionsControl } from "./dominion/DominionOptionsControl";
import { balanceSeats } from "../domain/room-balance";
import { fitSeats } from "../domain/room-seats";
import { GraphwarOptionsControl } from "./graphwar/GraphwarOptionsControl";
import { FlightOptionsControl } from "./flight/FlightOptionsControl";
import { CheckersOptionsControl } from "./checkers/CheckersOptionsControl";
import { MahjongOptionsControl } from "./mahjong/MahjongOptionsControl";
import { auxiliaryView } from "./native/contract";
import { useNativeWindow } from "./native/windows";
import { useState, useEffect } from "react";
import { gameCatalogue, gameKinds, type GameKind } from "../domain/catalogue";
import {
  configSchema,
  type RoomSetup as Setup,
  type Snapshot,
} from "../domain/protocol";
import { Button, Panel, Select, TextField } from "./ui/Controls";
import { confirmation } from "./confirmation-controller";
import { difficultyNames } from "./game-difficulty";
export function RoomSetup({
  snapshot,
  registry,
  binding = "",
  onApply,
  onError,
  onClose,
  purpose = "game",
  proposedConfig,
}: {
  purpose?: "game" | "enqueue";
  proposedConfig?: Snapshot["config"];
  snapshot: Snapshot;
  registry?: CommandRegistry;
  binding?: string;
  onApply: (setup: Setup) => void;
  onError: (message: string) => void;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(auxiliaryView === "roomsetup"),
    [draftConfig, updateConfig] = useState(proposedConfig ?? snapshot.config),
    [retain, setRetain] = useState<string[]>(
      snapshot.seats.filter((s) => !s.difficulty && s.name).map((s) => s.id),
    ),
    [members, setMembers] = useState<string[]>(
      snapshot.seats.filter((s) => !s.difficulty && s.name).map((s) => s.id),
    );
  const config = balanceSeats(fitSeats(draftConfig));
  const setConfig = (next: typeof config) =>
    updateConfig(balanceSeats(fitSeats(next)));
  const detached = useNativeWindow(
    "roomsetup",
    open,
    { view: "roomsetup", snapshot },
    (intent) => {
      if (intent.type === "close") setOpen(false);
      if (intent.type === "setup") {
        onApply(intent.setup);
        setOpen(false);
      }
      if (intent.type === "error") onError(intent.message);
    },
    purpose === "game" && !proposedConfig,
  );
  const openSetup = () => {
    setConfig(structuredClone(proposedConfig ?? snapshot.config));
    const ids = snapshot.seats
      .filter((s) => !s.difficulty && s.name)
      .map((s) => s.id);
    setRetain(ids);
    setMembers(ids);
    setOpen(true);
  };
  useEffect(
    () =>
      registry?.register({
        id: "room.setup",
        title: "更换游戏或开始下一局",
        scope: "global",
        binding,
        enabled: () => snapshot.canManage,
        run: openSetup,
      }),
    [registry, snapshot, binding],
  );
  const changeGame = (
    kind: GameKind,
    expedition = config.expedition,
    mahjong = config.mahjong,
  ) => {
    const g = gameCatalogue[kind],
      total = Math.max(
        g.minPlayers,
        Math.min(config.humans + config.ai.length, g.maxPlayers),
      ),
      humans = g.ai
        ? Math.max(
            ["tq", "scmj"].includes(kind) ? 0 : 1,
            Math.min(config.humans, total),
          )
        : total;
    setConfig({
      ...config,
      kind,
      expedition,
      mahjong,
      humans,
      ai: g.ai
        ? Array.from({ length: total - humans }, (_, i) =>
            config.ai[i]
              ? { ...config.ai[i], balance: undefined }
              : { difficulty: "normal", name: "" },
          )
        : [],
      team: g.team && config.team,
    });
  };
  const game = gameCatalogue[config.kind];
  const aiDifficultyNames =
    config.kind === "expedition"
      ? expeditionAiDifficultyNames
      : difficultyNames;
  return (
    <>
      {!auxiliaryView && (
        <Button data-room-action="setup" onClick={openSetup}>
          {purpose === "enqueue"
            ? "添加下一局"
            : proposedConfig
              ? "确认席位并切换"
              : "更换游戏 / 下一局"}{" "}
          <Shortcut binding={binding} />
        </Button>
      )}
      {!detached && (
        <Panel
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) onClose?.();
          }}
          title={purpose === "enqueue" ? "规划下一局" : "确认游戏与真人席位"}
        >
          <label className="setting-row">
            游戏
            <Select
              aria-label="下一局游戏"
              value={config.kind}
              onValueChange={(value) => {
                const next = value as GameKind;
                changeGame(next);
              }}
            >
              {gameKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {gameCatalogue[kind].name}
                </option>
              ))}
            </Select>
          </label>
          <fieldset className="opening-choice" disabled={false}>
            <label className="setting-row">
              真人席位
              <Select
                aria-label="下一局真人席位"
                value={config.humans}
                onValueChange={(value) => {
                  const humans = Number(value),
                    manual = config.ai.filter((entry) => !entry.balance);
                  setConfig({
                    ...config,
                    humans,
                    ai: game.ai
                      ? Array.from(
                          {
                            length: Math.max(
                              game.minPlayers - humans,
                              Math.min(manual.length, game.maxPlayers - humans),
                            ),
                          },
                          (_, i) =>
                            manual[i]
                              ? { ...manual[i], balance: undefined }
                              : { difficulty: "normal", name: "" },
                        )
                      : [],
                  });
                }}
              >
                {Array.from(
                  {
                    length:
                      game.maxPlayers -
                      (["tq", "scmj"].includes(config.kind)
                        ? 0
                        : game.ai
                          ? 1
                          : game.minPlayers) +
                      1,
                  },
                  (_, i) => (
                    <option
                      key={i}
                      value={
                        i +
                        (["tq", "scmj"].includes(config.kind)
                          ? 0
                          : game.ai
                            ? 1
                            : game.minPlayers)
                      }
                    >
                      {i +
                        (["tq", "scmj"].includes(config.kind)
                          ? 0
                          : game.ai
                            ? 1
                            : game.minPlayers)}
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
                      ai: Array.from({ length: Number(value) }, (_, i) =>
                        config.ai[i]
                          ? { ...config.ai[i], balance: undefined }
                          : { difficulty: "normal", name: "" },
                      ),
                    })
                  }
                >
                  {Array.from(
                    {
                      length:
                        game.maxPlayers -
                        Math.max(config.humans, game.minPlayers) +
                        1,
                    },
                    (_, i) => (
                      <option
                        key={i}
                        value={i + Math.max(0, game.minPlayers - config.humans)}
                      >
                        {i + Math.max(0, game.minPlayers - config.humans)}
                      </option>
                    ),
                  )}
                </Select>
              </label>
            )}
            {config.ai.some((s) => s.balance) && (
              <p className="muted">
                已自动加入平衡补位 AI，可在席位列表调整名称与难度。
              </p>
            )}
            {config.kind === "graphwar" && (
              <GraphwarOptionsControl
                value={config.graphwar}
                onChange={(graphwar) => setConfig({ ...config, graphwar })}
              />
            )}
            {config.kind === "expedition" && (
              <ExpeditionOptionsControl
                value={config.expedition}
                onChange={(expedition) => setConfig({ ...config, expedition })}
              />
            )}
            {config.kind === "dominion" && (
              <DominionOptionsControl
                value={config.dominion}
                onChange={(dominion) => setConfig({ ...config, dominion })}
              />
            )}
            {config.kind === "scmj" && (
              <MahjongOptionsControl
                value={config.mahjong}
                onChange={(mahjong) => setConfig({ ...config, mahjong })}
              />
            )}
            {config.kind === "fxq" && (
              <FlightOptionsControl
                value={config.flight}
                onChange={(flight) => setConfig({ ...config, flight })}
              />
            )}
            {config.kind === "pool" && (
              <PoolOptionsControl
                value={config.pool}
                onChange={(pool) => setConfig({ ...config, pool })}
              />
            )}
            {config.kind === "tq" && (
              <CheckersOptionsControl
                value={config.checkers}
                onChange={(checkers) => setConfig({ ...config, checkers })}
              />
            )}
            {config.ai.map((ai, i) => (
              <div className="setting-row" key={i}>
                <TextField
                  label={`AI ${i + 1} 名称`}
                  aria-label={`AI ${i + 1} 名称`}
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
                          ? {
                              ...entry,
                              difficulty: value as typeof ai.difficulty,
                            }
                          : entry,
                      ),
                    })
                  }
                >
                  {Object.entries(aiDifficultyNames).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
            {game.team && (
              <label className="setting-row">
                <span>组队模式</span>
                <input
                  type="checkbox"
                  checked={config.team}
                  disabled={
                    config.kind === "uno" &&
                    ![4, 6].includes(config.humans + config.ai.length)
                  }
                  onChange={(event) =>
                    setConfig({ ...config, team: event.target.checked })
                  }
                />
              </label>
            )}
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
            {purpose !== "enqueue" && (
              <h3>继续参与的玩家（未选中将转为旁观）</h3>
            )}
            {purpose !== "enqueue" &&
              snapshot.seats
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
                if (purpose !== "enqueue" && retain.length > config.humans) {
                  onError("保留玩家超过真人席位数");
                  return;
                }
                const removed = snapshot.seats
                  .filter(
                    (s) => members.includes(s.id) && !retain.includes(s.id),
                  )
                  .map((s) => s.name);
                const playing =
                  purpose !== "enqueue" &&
                  !!snapshot.state &&
                  !snapshot.finished;
                if (
                  purpose !== "enqueue" &&
                  (playing || removed.length || proposedConfig) &&
                  !(await confirmation.request(
                    [
                      playing ? "当前对局将结束并保存回放。" : "",
                      removed.length ? `转为旁观：${removed.join("、")}。` : "",
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
                onClose?.();
              }}
            >
              {purpose === "enqueue" ? "加入队列" : "确认应用"}
            </button>
          </fieldset>
        </Panel>
      )}
    </>
  );
}
