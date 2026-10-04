import { applyTheme } from "./client/themes";
import { Panel } from "./client/ui/Controls";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Records } from "./client/Records";
import { ClientStore } from "./client/storage";
import { Settings } from "./client/Settings";
import { GameCommands } from "./client/GameCommands";
import { CommandRegistry } from "./client/commands";
import { loadPreferences } from "./client/preferences";
import { Select } from "./client/ui/Controls";
import { Confirmation } from "./client/Confirmation";
import { confirmation } from "./client/confirmation-controller";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LocalConnection,
  NetworkConnection,
  type Connection,
} from "./client/connection";
import { OriginalGame } from "./client/OriginalGame";
import { Audit } from "./client/Audit";
import type { Action } from "./domain/types";
import type { Response, RoomConfig, Snapshot } from "./domain/protocol";
import { UpstreamRuntime } from "./upstream/runtime";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Lobby, difficultyNames } from "./client/Lobby";
import { gameCatalogue } from "./domain/catalogue";
import { cardNames, heroNames, skillNames } from "./domain/terms";
import "./styles.css";

const invited = new URLSearchParams(location.search);
const initialService =
  invited.get("service") ||
  (!isTauri() &&
  !import.meta.env.DEV &&
  ["https:", "http:"].includes(location.protocol)
    ? location.origin
    : "http://127.0.0.1:8787");

function App() {
  const connection = useRef<Connection | null>(null);
  const session = useRef<{ token: string; room: string } | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("本地");
  const [mode, setMode] = useState<"local" | "network">(
    invited.has("room") ? "network" : "local",
  );
  const [busy, setBusy] = useState(false);
  const hosting = useRef(false);
  const launch = useRef(0);
  const chatSeen = useRef({ room: "", count: 0 });
  const [unread, setUnread] = useState(0);
  const quitting = useRef(false);
  const [closeIntent, setCloseIntent] = useState<"close" | "quit" | null>(null);
  const [service, setService] = useState(initialService);
  const [tokens, setTokens] = useState<string[]>([]);
  const [tab, setTab] = useState<"game" | "audit" | "rules">("game");
  const [chat, setChat] = useState("");
  const [dictionary] = useState(() => new UpstreamRuntime());
  const [preferences, setPreferences] = useState(loadPreferences);
  const [store] = useState(() => new ClientStore());
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [hasLocalSave, setHasLocalSave] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const registry = useRef(new CommandRegistry()).current;
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let disposed = false;
    listen<string>("hosting-status", (event) => {
      if (!disposed) setStatus(event.payload);
    }).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
  useEffect(() => {
    if (!isTauri()) return;
    const unlisten = listen<string>("desktop-command", (event) => {
      if (event.payload === "settings") setSettingsOpen(true);
      if (event.payload === "records") setRecordsOpen(true);
      if (event.payload === "close" || event.payload === "quit")
        setCloseIntent(event.payload);
    });
    return () => {
      void unlisten.then((stop) => stop());
    };
  }, []);
  useEffect(() => {
    const receive = (event: Event) =>
      setNotice((event as CustomEvent<string>).detail);
    window.addEventListener("companion-notice", receive);
    return () => {
      window.removeEventListener("companion-notice", receive);
      connection.current?.close();
    };
  }, []);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest" });
  }, [snapshot?.chat.length]);

  const receive = async (response: Response) => {
    if (response.type === "left" || response.type === "closed") {
      if (response.type === "closed" && response.replay)
        await store
          .saveRecord(response.replay)
          .catch((error) => setNotice(String(error)));
      connection.current?.close();
      connection.current = null;
      session.current = null;
      setSnapshot(null);
      setStatus("本地");
      localStorage.removeItem("onlinebg.last-room");
      if (hosting.current) localStorage.removeItem("onlinebg.hosted-room");
      if (hosting.current) {
        hosting.current = false;
        void invoke("stop_host")
          .then(() => {
            if (quitting.current) return invoke("quit_app");
          })
          .catch((error) => setNotice(String(error)));
      } else if (quitting.current) void invoke("quit_app");
      void store.local().then((saved) => setHasLocalSave(!!saved));
      return;
    }
    if (response.type === "error") setNotice(response.message);
    if (response.type === "session") {
      session.current = { token: response.token, room: response.room };
      if (hosting.current)
        localStorage.setItem(
          "onlinebg.hosted-room",
          JSON.stringify(session.current),
        );
      setTokens(response.localTokens || []);
    }
    if (response.type === "snapshot") {
      setSnapshot(response.snapshot);
      if (connection.current instanceof NetworkConnection) {
        const url = new URL(connection.current.endpoint);
        url.searchParams.set("room", response.snapshot.room);
        localStorage.setItem("onlinebg.last-room", url.href);
      }
    }
  };
  useEffect(() => {
    if (!snapshot || chatSeen.current.room !== snapshot.room) {
      chatSeen.current = {
        room: snapshot?.room || "",
        count: snapshot?.chat.length || 0,
      };
      setUnread(0);
      return;
    }
    const added = Math.max(0, snapshot.chat.length - chatSeen.current.count);
    chatSeen.current.count = snapshot.chat.length;
    if (preferences.chatVisible) setUnread(0);
    else if (added) setUnread((value) => value + added);
  }, [snapshot?.room, snapshot?.chat.length, preferences.chatVisible]);
  const cancelConnect = async () => {
    launch.current++;
    connection.current?.close();
    connection.current = null;
    if (isTauri() && (busy || hosting.current)) {
      await invoke("stop_host");
      hosting.current = false;
    }
    session.current = null;
    setSnapshot(null);
    setBusy(false);
    setStatus("连接已取消");
  };
  const toggleChat = () =>
    setPreferences((value) => ({ ...value, chatVisible: !value.chatVisible }));
  const connect = async (
    config: RoomConfig,
    name: string,
    nextMode: "local" | "network",
    endpoint: string,
    temporary: boolean,
  ) => {
    const generation = ++launch.current;
    setBusy(true);
    try {
      connection.current?.close();
      setNotice("");
      localStorage.setItem("player-name", name);
      setMode(nextMode);
      setTab("game");
      setPreferences((value) => ({
        ...value,
        recentGames: [
          config.kind,
          ...value.recentGames.filter((kind) => kind !== config.kind),
        ].slice(0, 12),
      }));
      if (nextMode === "local") {
        setStatus("本地离线");
        connection.current = new LocalConnection(receive);
        connection.current.send({ type: "create", config, name });
      } else {
        if (temporary) {
          setStatus("正在准备公网房间");
          endpoint = await invoke<string>("start_host");
          if (generation !== launch.current) return;
          hosting.current = true;
        }
        setService(endpoint);
        connection.current = new NetworkConnection(
          endpoint,
          { type: "create", config, name },
          receive,
          setStatus,
        );
      }
    } catch (error) {
      if (generation !== launch.current) return;
      if (hosting.current) {
        hosting.current = false;
        await invoke("stop_host");
      }
      setStatus("开房失败");
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      if (generation === launch.current) setBusy(false);
    }
  };
  const join = (name: string, invitation: string, endpoint: string) => {
    launch.current++;
    try {
      let room = invitation.trim();
      if (/^https?:\/\//.test(room)) {
        const url = new URL(room);
        room = url.searchParams.get("room") || "";
        endpoint = url.searchParams.get("service") || url.origin;
      }
      if (!room) throw new Error("邀请链接没有房间号");
      connection.current?.close();
      localStorage.setItem("player-name", name);
      setMode("network");
      setService(endpoint);
      connection.current = new NetworkConnection(
        endpoint,
        { type: "join", room, name },
        receive,
        setStatus,
      );
    } catch (error) {
      setNotice(String(error));
    }
  };
  const leave = async () => {
    if (!session.current || !snapshot) return;
    if (snapshot.actor === 0) {
      if (
        !(await confirmation.request(
          "关闭房间后所有玩家将离开，当前对局会保存为记录。确认关闭？",
          "关闭房间",
        ))
      )
        return;
      connection.current?.send({ type: "close", token: session.current.token });
    } else
      connection.current?.send({ type: "leave", token: session.current.token });
  };
  const restoreHosted = async () => {
    const saved = localStorage.getItem("onlinebg.hosted-room");
    if (!saved) return;
    const generation = ++launch.current;
    setBusy(true);
    try {
      const identity = JSON.parse(saved) as { room: string; token: string };
      const endpoint = await invoke<string>("start_host");
      if (generation !== launch.current) return;
      hosting.current = true;
      setMode("network");
      setService(endpoint);
      setTab("game");
      connection.current?.close();
      connection.current = new NetworkConnection(
        endpoint,
        {
          type: "join",
          ...identity,
          name: localStorage.getItem("player-name") || "我",
        },
        receive,
        setStatus,
      );
    } catch (error) {
      if (generation !== launch.current) return;
      setStatus("恢复失败");
      setNotice(String(error));
    } finally {
      if (generation === launch.current) setBusy(false);
    }
  };
  const restoreLocal = () => {
    launch.current++;
    connection.current?.close();
    setMode("local");
    setTab("game");
    setStatus("恢复本地对局");
    connection.current = new LocalConnection(receive);
    connection.current.send({ type: "restore-local" });
  };
  useEffect(() => {
    if (!snapshot)
      void store
        .local()
        .then((saved) => setHasLocalSave(!!saved))
        .catch((error) => setNotice(String(error)));
  }, [snapshot, store]);
  const act = (action: Action) => {
    if (snapshot && session.current)
      connection.current!.send({
        type: "action",
        token: session.current.token,
        id: crypto.randomUUID(),
        version: snapshot.version,
        action,
      });
  };
  const end = () => {
    if (session.current)
      connection.current!.send({ type: "end", token: session.current.token });
  };
  const invite = async () => {
    const url = new URL(service);
    url.searchParams.set("room", snapshot!.room);
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice("邀请链接已复制");
    } catch {
      setNotice(`邀请链接：${url.href}`);
    }
  };

  useEffect(() => {
    localStorage.setItem("onlinebg.preferences", JSON.stringify(preferences));
    applyTheme(preferences.theme);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const changed = () => {
      if (preferences.theme === "system") applyTheme("system");
    };
    media.addEventListener("change", changed);
    document.documentElement.dataset.motion = String(preferences.motion);
    return () => media.removeEventListener("change", changed);
  }, [preferences]);
  useEffect(() => {
    const modifier = navigator.platform.includes("Mac") ? "Meta" : "Control";
    const commands = [
      {
        id: "app.shortcuts",
        title: "查看快捷键",
        binding: "F1",
        run: () => setSettingsOpen(true),
      },
      {
        id: "app.settings",
        title: "打开设置",
        binding: `${modifier}+,`,
        run: () => setSettingsOpen(true),
      },
      {
        id: "app.chat",
        title: "切换聊天侧栏",
        binding: `${modifier}+J`,
        run: toggleChat,
      },
      {
        id: "app.invite",
        title: "复制邀请",
        binding: `${modifier}+Shift+I`,
        run: () => {
          if (snapshot && mode === "network") void invite();
        },
      },
    ];
    const stop = commands.map((command) =>
      registry.register({
        ...command,
        scope: "global",
        enabled: () =>
          command.id !== "app.invite" || (!!snapshot && mode === "network"),
        binding: preferences.bindings[command.id] ?? command.binding,
      }),
    );
    const handle = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target : null;
      const editing = !!target?.closest(
        'input,textarea,[contenteditable="true"],[role="combobox"],[role="slider"]',
      );
      const dialog = document.querySelector<HTMLElement>(
        "[role=dialog][data-state=open],dialog[open]",
      );
      const scope = dialog
        ? dialog.dataset.commandScope || "dialog"
        : snapshot?.kind || "lobby";
      if (
        registry.dispatch(
          {
            ...event,
            key: event.key,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            repeat: event.repeat,
            isComposing: event.isComposing,
            editing,
          },
          scope,
        )
      )
        event.preventDefault();
    };
    window.addEventListener("keydown", handle);
    return () => {
      stop.forEach((dispose) => dispose());
      window.removeEventListener("keydown", handle);
    };
  }, [registry, snapshot, mode, preferences.bindings, settingsOpen]);
  const bind = (id: string, binding: string) => {
    try {
      registry.bind(id, binding);
      setPreferences((value) => ({
        ...value,
        bindings: { ...value.bindings, [id]: binding },
      }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="app-shell">
      <Confirmation />
      <Panel
        open={!!closeIntent}
        onOpenChange={(value) => {
          if (!value) setCloseIntent(null);
        }}
        title="关闭客户端"
      >
        <p>{hosting.current ? "房间正在运行。" : "当前对局已自动保存。"}</p>
        <div className="close-options">
          {hosting.current && (
            <button
              onClick={async () => {
                setCloseIntent(null);
                await getCurrentWindow().hide();
              }}
            >
              保留房间，隐藏窗口
            </button>
          )}
          <button
            className="primary-button"
            onClick={async () => {
              setCloseIntent(null);
              quitting.current = true;
              if (session.current && snapshot?.actor === 0)
                connection.current?.send({
                  type: "close",
                  token: session.current.token,
                });
              else {
                await invoke("stop_host");
                await invoke("quit_app");
              }
            }}
          >
            {hosting.current ? "结束房间并退出" : "退出客户端"}
          </button>
        </div>
      </Panel>
      <Records
        open={recordsOpen}
        onOpenChange={setRecordsOpen}
        snapshot={snapshot}
        onError={setNotice}
      />
      <Settings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        preferences={preferences}
        onChange={setPreferences}
        commands={registry.list()}
        onBind={bind}
      />
      <header className="app-toolbar">
        <div>
          <span className="app-mark">OnlineBGClient</span>
          <span className="connection-status">{status}</span>
          {(busy || /连接中|重连中|连接中断/.test(status)) && (
            <button
              onClick={() =>
                void cancelConnect().catch((error) => setNotice(String(error)))
              }
            >
              {busy ? "取消开房" : "取消连接"}
            </button>
          )}
        </div>
        <div>
          <button onClick={() => setRecordsOpen(true)}>对局记录</button>
          {snapshot && (
            <button onClick={toggleChat}>
              聊天{unread ? ` · ${unread}` : ""}
            </button>
          )}
          <button onClick={() => setSettingsOpen(true)} aria-label="打开设置">
            设置
          </button>
          {snapshot && (
            <button onClick={leave}>
              {snapshot.actor === 0 ? "关闭房间" : "离开房间"}
            </button>
          )}
        </div>
      </header>
      {notice && (
        <div role="status" className="notice">
          <span>{notice}</span>
          <button aria-label="关闭提示" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {!snapshot ? (
        <>
          <div className="recent-rooms">
            {isTauri() && localStorage.getItem("onlinebg.hosted-room") && (
              <button disabled={busy} onClick={() => void restoreHosted()}>
                恢复我创建的公网房间
              </button>
            )}
            {hasLocalSave && (
              <button onClick={restoreLocal}>恢复本地对局</button>
            )}
            {localStorage.getItem("onlinebg.last-room") && (
              <button
                onClick={() =>
                  join(
                    localStorage.getItem("player-name") || "我",
                    localStorage.getItem("onlinebg.last-room")!,
                    service,
                  )
                }
              >
                恢复联机房间
              </button>
            )}
          </div>
          <Lobby
            service={service}
            initialRoom={invited.get("room") || ""}
            busy={busy}
            onCreate={connect}
            onJoin={join}
            preferences={preferences}
            onPreferencesChange={setPreferences}
          />
        </>
      ) : (
        <main
          className={`room-layout ${preferences.chatVisible ? "" : "chat-hidden"}`}
        >
          <section className="game-area">
            <div className="room-toolbar">
              <strong>
                {gameCatalogue[snapshot.kind].name} · {snapshot.room}
              </strong>
              <div>
                <GameCommands
                  snapshot={snapshot}
                  act={act}
                  registry={registry}
                  bindings={preferences.bindings}
                />
                {mode === "network" && (
                  <button onClick={invite}>复制邀请</button>
                )}
                {snapshot.actor === 0 && gameCatalogue[snapshot.kind].ai && (
                  <label className="room-tempo">
                    AI 间隔{" "}
                    <Select
                      aria-label="对局 AI 间隔"
                      value={snapshot.config.aiDelayMs}
                      onValueChange={(value) =>
                        connection.current!.send({
                          type: "tempo",
                          token: session.current!.token,
                          delayMs: Number(value),
                        })
                      }
                    >
                      {[
                        0,
                        500,
                        1000,
                        1500,
                        2000,
                        3000,
                        5000,
                        snapshot.config.aiDelayMs,
                      ]
                        .filter(
                          (value, index, values) =>
                            values.indexOf(value) === index,
                        )
                        .sort((a, b) => a - b)
                        .map((value) => (
                          <option key={value} value={value}>
                            {value / 1000} 秒
                          </option>
                        ))}
                    </Select>
                  </label>
                )}
                {tokens.length > 1 && (
                  <Select
                    aria-label="当前本地玩家"
                    value={session.current?.token || ""}
                    onValueChange={(value) => {
                      session.current!.token = value;
                      connection.current!.send({
                        type: "snapshot",
                        token: value,
                      });
                    }}
                  >
                    {tokens.map((token, index) => (
                      <option value={token} key={token}>
                        玩家 {index + 1}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            </div>
            <nav className="segmented">
              <button
                className={tab === "game" ? "active" : ""}
                onClick={() => setTab("game")}
              >
                对局
              </button>
              {gameCatalogue[snapshot.kind].ai && (
                <button
                  className={tab === "audit" ? "active" : ""}
                  onClick={() => setTab("audit")}
                >
                  策略审核
                </button>
              )}
              {snapshot.kind === "sgs" && (
                <button
                  className={tab === "rules" ? "active" : ""}
                  onClick={() => setTab("rules")}
                >
                  术语与技能
                </button>
              )}
            </nav>
            {tab === "game" && (
              <>
                {!snapshot.state ? (
                  <div className="lobby">
                    <h2>等待开局</h2>
                    {snapshot.seats.map((seat, index) => (
                      <div className="seat-row" key={index}>
                        <strong>席位 {index + 1}</strong>
                        <span>{seat.name || "等待加入"}</span>
                        <small>
                          {seat.difficulty
                            ? difficultyNames[seat.difficulty]
                            : seat.online
                              ? seat.ready
                                ? "已准备"
                                : "未准备"
                              : "等待加入"}
                        </small>
                        {snapshot.actor === 0 &&
                          index > 0 &&
                          (!seat.name || seat.difficulty) && (
                            <Select
                              aria-label={`席位 ${index + 1} 类型`}
                              value={seat.difficulty || "human"}
                              onValueChange={(value) =>
                                connection.current!.send({
                                  type: "seat",
                                  token: session.current!.token,
                                  index,
                                  config:
                                    value === "human"
                                      ? { type: "human" }
                                      : {
                                          type: "ai",
                                          difficulty: value as
                                            "easy" | "normal" | "hard",
                                          name: "",
                                        },
                                })
                              }
                            >
                              <option value="human">真人</option>
                              {gameCatalogue[snapshot.kind].ai &&
                                Object.entries(difficultyNames).map(
                                  ([value, label]) => (
                                    <option value={value} key={value}>
                                      {label} AI
                                    </option>
                                  ),
                                )}
                            </Select>
                          )}
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        connection.current!.send({
                          type: "ready",
                          token: session.current!.token,
                          ready: !snapshot.seats[snapshot.actor].ready,
                        })
                      }
                    >
                      {snapshot.seats[snapshot.actor].ready
                        ? "取消准备"
                        : "准备"}
                    </button>
                    {snapshot.actor === 0 && (
                      <button
                        disabled={snapshot.seats.some(
                          (seat) =>
                            !seat.difficulty && (!seat.online || !seat.ready),
                        )}
                        className="primary-button"
                        onClick={() =>
                          connection.current!.send({
                            type: "start",
                            token: session.current!.token,
                          })
                        }
                      >
                        开始对局
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {snapshot.paused && (
                      <div className="resolution-status">
                        有玩家掉线，等待恢复连接
                      </div>
                    )}
                    {snapshot.finished && (
                      <div className="finish-banner">
                        <strong>对局已结束</strong>
                        {gameCatalogue[snapshot.kind].ai && (
                          <button onClick={() => setTab("audit")}>
                            审核 AI 决策
                          </button>
                        )}
                        <button onClick={() => setRecordsOpen(true)}>
                          查看回放
                        </button>
                        {snapshot.actor === 0 && (
                          <button
                            onClick={() =>
                              connection.current!.send({
                                type: "start",
                                token: session.current!.token,
                              })
                            }
                          >
                            再来一局
                          </button>
                        )}
                      </div>
                    )}
                    {snapshot.resolving && !snapshot.finished && (
                      <div className="resolution-status">
                        等待无懈可击响应，房间服务自动结算
                      </div>
                    )}
                    <OriginalGame
                      restart={() =>
                        connection.current!.send({
                          type: "start",
                          token: session.current!.token,
                        })
                      }
                      snapshot={snapshot}
                      act={act}
                      end={end}
                      onReplay={() => setTab("audit")}
                    />
                  </>
                )}
              </>
            )}
            {tab === "audit" && <Audit snapshot={snapshot} />}
            {tab === "rules" && snapshot.kind === "sgs" && (
              <section className="dictionary">
                <h2>三国杀术语</h2>
                <details open>
                  <summary>武将</summary>
                  <div className="terms-grid">
                    {heroNames.slice(1).map((hero, index) => (
                      <div key={hero}>
                        <strong>{hero}</strong>
                        <span>
                          {dictionary
                            .load(8467)
                            .V6[index + 1][4].map(
                              (skill: number) => skillNames[skill],
                            )
                            .join("、")}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
                <details>
                  <summary>技能</summary>
                  {skillNames.map((name, id) => (
                    <p key={name}>
                      <strong>{name}</strong> · {dictionary.load(1983).H[id][1]}
                    </p>
                  ))}
                </details>
                <details>
                  <summary>卡牌</summary>
                  {cardNames.map((name, id) => (
                    <p key={name}>
                      <strong>{name}</strong> · {dictionary.load(8280).zd(id)}
                    </p>
                  ))}
                </details>
              </section>
            )}
          </section>
          <aside className="chat-panel" hidden={!preferences.chatVisible}>
            <h2>房间消息</h2>
            <div className="members">
              {snapshot.seats.map((seat, index) => (
                <span key={index} className={seat.online ? "" : "offline"}>
                  {seat.name || "空位"}
                  {index === snapshot.actor ? " · 我" : ""}
                </span>
              ))}
            </div>
            <div className="chat-messages">
              {snapshot.chat.map((message) => (
                <div key={message.id} className="chat-message">
                  <small>
                    {message.name} ·{" "}
                    {new Date(message.time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                  <p>{message.text}</p>
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!chat.trim()) return;
                connection.current!.send({
                  type: "chat",
                  token: session.current!.token,
                  id: crypto.randomUUID(),
                  text: chat,
                });
                setChat("");
              }}
            >
              <input
                aria-label="消息"
                placeholder="发消息"
                maxLength={500}
                value={chat}
                onChange={(event) => setChat(event.target.value)}
              />
              <button type="submit" disabled={!chat.trim()}>
                发送
              </button>
            </form>
          </aside>
        </main>
      )}
    </div>
  );
}

applyTheme(loadPreferences().theme);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
