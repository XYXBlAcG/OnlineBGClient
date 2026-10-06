import { AuxiliaryRoot } from "./client/native/AuxiliaryRoot";
import { auxiliaryView } from "./client/native/contract";
import { nativeMain, useNativeWindow } from "./client/native/windows";
import { ComputeDiagnostics } from "./client/ComputeDiagnostics";
import type { ComputeDiagnostic } from "./domain/compute-diagnostics";
import { RoomSetup } from "./client/RoomSetup";
import { beginnerGuides } from "./client/beginner-guides";
import { BeginnerGuide } from "./client/BeginnerGuide";
import { Notices } from "./client/Notices";
import { useMotion } from "./client/use-motion";
import { HeroDescription } from "./client/HeroSurface";
import { HeroGuides } from "./domain/hero-guide";
import { useWindowWidth, useMobile } from "./client/use-mobile";
import { MobileJoin } from "./client/MobileJoin";
import { Invite } from "./client/Invite";
import { ComputeStatus } from "./client/ComputeStatus";
import { SidebarDivider } from "./client/SidebarDivider";
import { sidebarBounds, sidebarBreakpoint } from "./client/sidebar-layout";
import { ChatPanel } from "./client/ChatPanel";
import type { InteractionEvent, InteractionKind } from "./domain/social";
import { installContextMenuPolicy } from "./client/desktop-context-menu";
import { applyTheme } from "./client/themes";
import { Panel } from "./client/ui/Controls";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { About } from "./client/About";
import { Records } from "./client/Records";
import { ClientStore } from "./client/storage";
import { Settings } from "./client/Settings";
import { GameCommands } from "./client/GameCommands";
import { CommandRegistry } from "./client/commands";
import { loadPreferences } from "./client/preferences";
import { Select } from "./client/ui/Controls";
import { Confirmation } from "./client/Confirmation";
import { confirmation } from "./client/confirmation-controller";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
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
import { cardNames, skillNames } from "./domain/terms";
import "./styles.css";

const emptyInteractions: InteractionEvent[] = [];
const invited = new URLSearchParams(location.search);
const initialService =
  invited.get("service") ||
  (!isTauri() &&
  !import.meta.env.DEV &&
  ["https:", "http:"].includes(location.protocol)
    ? location.origin
    : "http://127.0.0.1:8787");

function App() {
  const mobile = useMobile();
  const windowWidth = useWindowWidth();
  const narrowLayout = windowWidth < sidebarBreakpoint;
  const [inviteOpen, setInviteOpen] = useState(false);
  const connection = useRef<Connection | null>(null);
  const session = useRef<{ token: string; room: string } | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [computeFailure, setComputeFailure] =
    useState<ComputeDiagnostic | null>(null);
  const [notice, setNotice] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number>();
  const dismissNotice = useCallback(() => setNotice(""), []);
  const [status, setStatus] = useState("本地");
  const [mode, setMode] = useState<"local" | "network">(
    invited.has("room") ? "network" : "local",
  );
  const [busy, setBusy] = useState(false);
  const hosting = useRef(false);
  const launch = useRef(0);
  const [interactions, setInteractions] = useState<InteractionEvent[]>([]);
  const finishInteraction = useCallback(
    (id: string) =>
      setInteractions((events) => events.filter((event) => event.id !== id)),
    [],
  );
  const [unread, setUnread] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<"chat" | "guide" | null>(null);
  const [guideDock, setGuideDock] = useState<HTMLDivElement | null>(null);
  const [guideLocated, setGuideLocated] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [guideLocation, setGuideLocation] = useState(0);
  const [focused, setFocused] = useState(false);

  const quitting = useRef(false);
  const [closeIntent, setCloseIntent] = useState<"close" | "quit" | null>(null);
  const [service, setService] = useState(initialService);
  const [tokens, setTokens] = useState<string[]>([]);
  const [tab, setTab] = useState<"game" | "audit" | "rules">("game");
  const [heroGuides] = useState(() => new HeroGuides().all());
  const [dictionary] = useState(() => new UpstreamRuntime());
  const [preferences, setPreferences] = useState(() => {
    const value = { ...loadPreferences(), chatVisible: false };
    return mobile
      ? { ...value, chatVisible: false, auditVisible: false }
      : value;
  });
  const guideEnabled =
    !!snapshot &&
    !!beginnerGuides[snapshot.kind] &&
    !!preferences.beginnerGuides[snapshot.kind];
  const guideShown = guideEnabled && sidebarTab === "guide";
  const sidebarOpen =
    guideShown || (sidebarTab === "chat" && preferences.chatVisible);
  const detachedSidebar = nativeMain() && narrowLayout;
  const sidebarVisible = sidebarOpen && !focused && !detachedSidebar;
  const sidebarWidth = Math.min(
    preferences.sidebarWidth,
    sidebarBounds(windowWidth).max,
  );
  useEffect(() => {
    setSidebarTab(null);
    setGuideStep(0);
    setGuideLocated(false);
    setPreferences((value) => ({ ...value, chatVisible: false }));
  }, [snapshot?.kind, snapshot?.room]);
  useEffect(() => {
    if (preferences.chatVisible) setSidebarTab("chat");
    else setSidebarTab((value) => (value === "chat" ? null : value));
  }, [preferences.chatVisible]);
  const motion = useMotion(preferences.motion);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const [store] = useState(() => new ClientStore());
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [hasLocalSave, setHasLocalSave] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const registry = useRef(new CommandRegistry()).current;

  useEffect(() => {
    if (
      mobile ||
      !snapshot?.canManage ||
      (snapshot.host && snapshot.actor >= 0) ||
      !session.current
    )
      return;
    if (
      snapshot.config.auditEnabled === preferences.auditVisible &&
      JSON.stringify(snapshot.config.performance) ===
        JSON.stringify(preferences.performance)
    )
      return;
    connection.current?.send({
      type: "computation",
      token: session.current.token,
      audit: preferences.auditVisible,
      performance: preferences.performance,
    });
  }, [
    mobile,
    snapshot?.host?.id,
    snapshot?.room,
    snapshot?.actor,
    snapshot?.config.auditEnabled,
    snapshot?.config.performance,
    preferences.auditVisible,
    preferences.performance,
  ]);

  useEffect(() => {
    setTab("game");
  }, [snapshot?.kind]);

  useEffect(() => installContextMenuPolicy(window, isTauri()), []);
  useEffect(() => {
    if ((mobile || !preferences.auditVisible) && tab === "audit")
      setTab("game");
  }, [mobile, preferences.auditVisible, tab]);

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
      if (event.payload === "about") setAboutOpen(true);
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
  const sendChat = useCallback((text: string) => {
    if (session.current)
      connection.current?.send({
        type: "chat",
        token: session.current.token,
        id: crypto.randomUUID(),
        text,
      });
  }, []);
  const receive = async (response: Response) => {
    if (response.type === "activity") {
      setActionPending(response.pending);
      if (response.latencyMs !== undefined) setLatencyMs(response.latencyMs);
      return;
    }
    if (response.type === "left" || response.type === "closed") {
      if (response.type === "closed" && response.replay)
        await store
          .saveRecord(response.replay)
          .catch((error) => setNotice(String(error)));
      connection.current?.close();
      connection.current = null;
      session.current = null;
      setSnapshot(null);
      setComputeFailure(null);
      setActionPending(false);
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
    if (response.type === "interaction" && preferencesRef.current.interactions)
      setInteractions((events) => [...events, response.event].slice(-8));
    if (response.type === "error") {
      setNotice(response.message);
      if (response.diagnostic) setComputeFailure(response.diagnostic);
    }
    if (response.type === "session") {
      if (hosting.current) setNotice("公网房间已就绪，可以邀请朋友加入");
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
    setActionPending(false);
    setLatencyMs(undefined);
  }, [snapshot?.room]);
  useEffect(() => {
    setInteractions([]);
  }, [snapshot?.room, snapshot?.kind, !!snapshot?.state]);
  const interact = useCallback(
    (target: number, kind: InteractionKind) =>
      connection.current?.send({
        type: "interaction",
        token: session.current!.token,
        id: crypto.randomUUID(),
        target,
        kind,
      }),
    [],
  );
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
  const toggleChat = () => {
    const open = sidebarTab !== "chat" || !preferences.chatVisible || focused;
    setSidebarTab(open ? "chat" : null);
    setFocused(false);
    setGuideLocated(false);
    setPreferences((value) => ({ ...value, chatVisible: open }));
  };
  const connect = async (
    config: RoomConfig,
    name: string,
    nextMode: "local" | "network",
    endpoint: string,
    temporary: boolean,
    hostOnly: boolean,
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
          { type: "create", config, name, hostOnly },
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
    if (snapshot.canManage) {
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
  const act = useCallback(
    (action: Action) => {
      if (snapshot && session.current)
        connection.current!.send({
          type: "action",
          token: session.current.token,
          id: crypto.randomUUID(),
          version: snapshot.version,
          action,
        });
    },
    [snapshot?.version, snapshot?.room],
  );
  const end = useCallback(() => {
    if (session.current)
      connection.current!.send({ type: "end", token: session.current.token });
  }, []);
  const restart = useCallback(() => {
    if (session.current)
      connection.current?.send({ type: "start", token: session.current.token });
  }, []);
  const review = useCallback(() => setTab("audit"), []);
  const gameSnapshot = useMemo(
    () =>
      snapshot
        ? {
            room: snapshot.room,
            kind: snapshot.kind,
            actor: snapshot.actor,
            canManage: snapshot.canManage,
            version: snapshot.version,
            seats: snapshot.seats,
            state: snapshot.state,
            finished: snapshot.finished,
          }
        : null,
    [
      snapshot?.room,
      snapshot?.kind,
      snapshot?.actor,
      snapshot?.canManage,
      snapshot?.version,
      snapshot?.seats,
      snapshot?.state,
      snapshot?.finished,
    ],
  );
  const invitationUrl = () => {
    const url = new URL(service);
    if (snapshot) url.searchParams.set("room", snapshot.room);
    return url.href;
  };
  const invite = async () => {
    const url = new URL(invitationUrl());
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
          !(mobile && ["app.shortcuts", "app.settings"].includes(command.id)) &&
          (command.id !== "app.invite" || (!!snapshot && mode === "network")),
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
        "[role=dialog][data-state=open]",
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
  }, [registry, snapshot, mode, preferences.bindings, settingsOpen, mobile]);
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

  const hideClient = async () => {
    setCloseIntent(null);
    await getCurrentWindow().hide();
  };
  const quitClient = async () => {
    setCloseIntent(null);
    quitting.current = true;
    if (session.current && snapshot?.canManage)
      connection.current?.send({ type: "close", token: session.current.token });
    else {
      await invoke("stop_host");
      await invoke("quit_app");
    }
  };
  useNativeWindow(
    "exit",
    !!closeIntent,
    { view: "exit", hosting: !!hosting.current },
    (intent) => {
      if (intent.type === "close") setCloseIntent(null);
      if (intent.type === "exit")
        void (intent.operation === "hide" ? hideClient() : quitClient()).catch(
          (error) => setNotice(String(error)),
        );
      if (intent.type === "error") setNotice(intent.message);
    },
  );
  useNativeWindow(
    "chat",
    !!snapshot && sidebarTab === "chat" && preferences.chatVisible && !focused,
    {
      view: "chat",
      snapshot: snapshot!,
      preferences,
      endpoint: mode === "network" ? service : undefined,
    },
    (intent) => {
      if (intent.type === "chat-text") sendChat(intent.text);
      if (intent.type === "close") {
        setSidebarTab((value) => (value === "chat" ? null : value));
        setPreferences((value) => ({ ...value, chatVisible: false }));
      }
      if (intent.type === "error") setNotice(intent.message);
    },
    detachedSidebar,
  );
  useNativeWindow(
    "guide",
    guideShown && !focused,
    { view: "guide", snapshot: snapshot!, index: guideStep },
    (intent) => {
      if (intent.type === "guide-step") setGuideStep(intent.index);
      if (intent.type === "guide-locate") {
        setGuideStep(intent.index);
        setGuideLocation((value) => value + 1);
      }
      if (intent.type === "close")
        setSidebarTab((value) => (value === "guide" ? null : value));
      if (intent.type === "error") setNotice(intent.message);
    },
    detachedSidebar,
  );
  return (
    <>
      <div className={`app-shell ${mobile ? "mobile-shell" : ""}`}>
        <Confirmation />
        {!nativeMain() && (
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
                <button onClick={hideClient}>保留房间，隐藏窗口</button>
              )}
              <button className="primary-button" onClick={quitClient}>
                {hosting.current ? "结束房间并退出" : "退出客户端"}
              </button>
            </div>
          </Panel>
        )}
        <Invite
          url={invitationUrl()}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onError={setNotice}
        />
        <About
          open={aboutOpen}
          onOpenChange={setAboutOpen}
          onError={setNotice}
        />
        {!mobile && (
          <Records
            open={recordsOpen}
            onOpenChange={setRecordsOpen}
            snapshot={snapshot}
            onError={setNotice}
          />
        )}
        <Settings
          canConfigureAI={
            !snapshot ||
            (snapshot.canManage && (!snapshot.host || snapshot.actor < 0))
          }
          roomPerformance={snapshot?.config.performance}
          onError={setNotice}
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
                  void cancelConnect().catch((error) =>
                    setNotice(String(error)),
                  )
                }
              >
                {busy ? "取消开房" : "取消连接"}
              </button>
            )}
          </div>
          <div>
            {!mobile && (
              <button onClick={() => setAboutOpen(true)}>关于</button>
            )}
            {!mobile && (
              <button onClick={() => setRecordsOpen(true)}>对局记录</button>
            )}
            {snapshot && (
              <button
                className={unread ? "chat-unread" : ""}
                onClick={toggleChat}
              >
                聊天{unread ? ` · ${unread}` : ""}
              </button>
            )}
            {!mobile && (
              <button
                onClick={() => setSettingsOpen(true)}
                aria-label="打开设置"
              >
                设置
              </button>
            )}
            {snapshot && (
              <button onClick={leave}>
                {snapshot.canManage ? "关闭房间" : "离开房间"}
              </button>
            )}
          </div>
        </header>
        <Notices
          notice={notice}
          progress={busy || /连接中|重连中|连接中断/.test(status) ? status : ""}
          onDismiss={dismissNotice}
          onCancel={() =>
            void cancelConnect().catch((error) => setNotice(String(error)))
          }
        />
        {!snapshot && mobile ? (
          <MobileJoin
            room={invited.get("room") || ""}
            service={service}
            busy={busy}
            onJoin={join}
          />
        ) : !snapshot ? (
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
            className={`room-layout ${sidebarVisible ? "sidebar-open" : "chat-hidden"} ${snapshot.state && tab === "game" ? "playing-room" : ""} ${focused ? "focused-room" : ""} ${guideLocated ? "guide-located" : ""}`}
            style={
              {
                "--chat-width": `${sidebarWidth}px`,
              } as React.CSSProperties
            }
          >
            <section className="game-area">
              <div className="room-toolbar">
                <strong>
                  {gameCatalogue[snapshot.kind].name} · {snapshot.room}
                </strong>
                {latencyMs !== undefined && mode === "network" && (
                  <small
                    className="network-latency"
                    title="最近操作的网络往返时间"
                  >
                    {latencyMs} ms
                  </small>
                )}
                {(mobile || !snapshot.state || tab !== "game") && (
                  <button
                    aria-pressed={focused}
                    onClick={() => setFocused(!focused)}
                  >
                    {focused ? "恢复界面" : "专注模式"}
                  </button>
                )}
                {snapshot.canManage &&
                  snapshot.state &&
                  snapshot.config.ai.length > 0 && (
                    <button
                      onClick={() => {
                        if (snapshot.aiPaused) setComputeFailure(null);
                        connection.current!.send({
                          type: "ai-run",
                          token: session.current!.token,
                          enabled: snapshot.aiPaused,
                        });
                      }}
                    >
                      {snapshot.aiPaused ? "继续 AI" : "暂停 AI"}
                    </button>
                  )}
                <details
                  className="room-options"
                  onClick={(event) => {
                    if (
                      event.target instanceof Element &&
                      event.target.closest('button:not([role="combobox"])')
                    )
                      event.currentTarget.open = false;
                  }}
                >
                  <summary>房间操作</summary>
                  <div>
                    {snapshot.actor >= 0 && (
                      <GameCommands
                        snapshot={snapshot}
                        act={act}
                        registry={registry}
                        bindings={preferences.bindings}
                        pending={actionPending}
                      />
                    )}
                    {mode === "network" && (
                      <>
                        <button onClick={invite}>复制邀请</button>
                        <button onClick={() => setInviteOpen(true)}>
                          邀请二维码
                        </button>
                      </>
                    )}
                    {snapshot.canManage && (
                      <RoomSetup
                        snapshot={snapshot}
                        onError={setNotice}
                        onApply={(setup) =>
                          connection.current!.send({
                            type: "game",
                            token: session.current!.token,
                            setup,
                          })
                        }
                      />
                    )}
                    {snapshot.canManage && gameCatalogue[snapshot.kind].ai && (
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
                  </div>
                </details>
              </div>
              <ComputeDiagnostics
                diagnostic={computeFailure}
                onError={setNotice}
                onRetry={
                  snapshot.canManage && snapshot.aiPaused
                    ? () => {
                        setComputeFailure(null);
                        connection.current!.send({
                          type: "ai-run",
                          token: session.current!.token,
                          enabled: true,
                        });
                      }
                    : undefined
                }
              />
              <ComputeStatus
                benchmarkVisible={preferences.benchmarkVisible}
                snapshot={snapshot}
                control={(enabled) =>
                  connection.current!.send({
                    type: "ai-run",
                    token: session.current!.token,
                    enabled,
                  })
                }
              />
              <div className="room-navigation">
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
                <BeginnerGuide
                  key={snapshot.kind}
                  snapshot={snapshot}
                  dock={guideDock}
                  visible={guideShown && !focused}
                  stepIndex={guideStep}
                  onStepChange={setGuideStep}
                  targetsOnly={detachedSidebar}
                  locateRequest={guideLocation}
                  onLocate={setGuideLocated}
                  kind={snapshot.kind}
                  enabled={guideShown}
                  onChange={(enabled) => {
                    setFocused(false);
                    setGuideLocated(false);
                    setSidebarTab(enabled ? "guide" : null);
                    setPreferences({
                      ...preferences,
                      chatVisible: false,
                      beginnerGuides: {
                        ...preferences.beginnerGuides,
                        [snapshot.kind]: enabled,
                      },
                    });
                  }}
                />
                {snapshot.actor >= 0 &&
                  (snapshot.kind === "sgs" ||
                    (!mobile &&
                      preferences.auditVisible &&
                      gameCatalogue[snapshot.kind].ai)) && (
                    <nav className="segmented">
                      <button
                        className={tab === "game" ? "active" : ""}
                        onClick={() => setTab("game")}
                      >
                        对局
                      </button>
                      {!mobile &&
                        preferences.auditVisible &&
                        gameCatalogue[snapshot.kind].ai && (
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
                  )}
              </div>
              {tab === "game" && (
                <>
                  {!snapshot.state ? (
                    <div className="lobby">
                      <h2>
                        {snapshot.config.humans === 0
                          ? "AI 性能测试"
                          : snapshot.actor < 0
                            ? "服务运行中"
                            : "等待开局"}
                      </h2>
                      {snapshot.actor < 0 && (
                        <p className="muted">
                          {snapshot.config.humans === 0
                            ? "全 AI 对战 · 你可以观战并控制开局"
                            : `${snapshot.playing ? "对局进行中" : "等待手机玩家加入"} · 电脑不占席位`}
                        </p>
                      )}
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
                          {snapshot.canManage &&
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
                      {snapshot.actor >= 0 && (
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
                      )}
                      {snapshot.canManage && !snapshot.playing && (
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
                      {snapshot.actor < 0 && snapshot.playing && (
                        <button
                          onClick={async () => {
                            if (
                              await confirmation.request(
                                "结束当前对局并保存回放？",
                                "确认结束",
                              )
                            )
                              end();
                          }}
                        >
                          结束游戏
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {snapshot.paused && (
                        <div className="resolution-status">
                          {snapshot.aiPaused
                            ? "AI 性能测试已暂停"
                            : "有玩家掉线，等待恢复连接"}
                        </div>
                      )}
                      {snapshot.finished && (
                        <div className="finish-banner">
                          <strong>对局已结束</strong>
                          {!mobile &&
                            preferences.auditVisible &&
                            gameCatalogue[snapshot.kind].ai && (
                              <button onClick={() => setTab("audit")}>
                                审核 AI 决策
                              </button>
                            )}
                          {!mobile && (
                            <button onClick={() => setRecordsOpen(true)}>
                              查看回放
                            </button>
                          )}
                          {snapshot.canManage && (
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
                      <div
                        className="game-stage"
                        aria-busy={actionPending}
                        onClickCapture={(event) => {
                          if (actionPending) {
                            event.preventDefault();
                            event.stopPropagation();
                          }
                        }}
                      >
                        <OriginalGame
                          onPhrase={sendChat}
                          customPhrases={preferences.phraseGroups}
                          interactions={
                            preferences.interactions
                              ? interactions
                              : emptyInteractions
                          }
                          motion={motion}
                          sound={preferences.interactionSound}
                          onInteractionEnd={finishInteraction}
                          restart={restart}
                          snapshot={gameSnapshot!}
                          act={act}
                          end={end}
                          onInteract={interact}
                          onReplay={
                            !mobile && preferences.auditVisible
                              ? review
                              : undefined
                          }
                        />
                        {actionPending && (
                          <div className="action-feedback" role="status">
                            正在同步操作…
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
              {!mobile && preferences.auditVisible && tab === "audit" && (
                <Audit snapshot={snapshot} />
              )}
              {tab === "rules" && snapshot.kind === "sgs" && (
                <section className="dictionary">
                  <h2>三国杀术语</h2>
                  <details open>
                    <summary>武将</summary>
                    <div className="terms-grid">
                      {heroGuides.map((hero) => (
                        <HeroDescription key={hero.id} hero={hero} />
                      ))}
                    </div>
                  </details>
                  <details>
                    <summary>技能</summary>
                    {skillNames.map((name, id) => (
                      <p key={name}>
                        <strong>{name}</strong> ·{" "}
                        {dictionary.load(1983).H[id][1]}
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
            <aside className="room-sidebar" hidden={!sidebarVisible}>
              {!mobile && (
                <SidebarDivider
                  width={sidebarWidth}
                  onChange={(sidebarWidth) =>
                    setPreferences((value) => ({ ...value, sidebarWidth }))
                  }
                />
              )}
              <nav className="sidebar-tabs" aria-label="房间侧栏">
                <button
                  aria-pressed={!guideShown}
                  onClick={() => {
                    setSidebarTab("chat");
                    setPreferences((value) => ({
                      ...value,
                      chatVisible: true,
                    }));
                  }}
                >
                  聊天{unread > 0 ? ` · ${unread}` : ""}
                </button>
                <button
                  aria-label="关闭辅助区域"
                  onClick={() => {
                    setSidebarTab(null);
                    setPreferences((value) => ({
                      ...value,
                      chatVisible: false,
                    }));
                  }}
                >
                  ×
                </button>
                {guideEnabled && (
                  <button
                    aria-pressed={guideShown}
                    onClick={() => {
                      setSidebarTab("guide");
                      setPreferences((value) => ({
                        ...value,
                        chatVisible: false,
                      }));
                      setGuideLocated(false);
                    }}
                  >
                    引导
                  </button>
                )}
              </nav>
              <div
                ref={setGuideDock}
                className="room-guide-slot"
                hidden={!guideShown}
              />

              <ChatPanel
                snapshot={snapshot}
                compact={mobile}
                endpoint={mode === "network" ? service : undefined}
                preferences={{
                  ...preferences,
                  chatVisible: sidebarTab === "chat" && sidebarVisible,
                }}
                onUnread={setUnread}
                onClose={() => {
                  setSidebarTab(null);
                  setPreferences((value) => ({
                    ...value,
                    chatVisible: false,
                  }));
                }}
                onText={sendChat}
              />
            </aside>
          </main>
        )}
      </div>
    </>
  );
}

applyTheme(loadPreferences().theme);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {auxiliaryView ? <AuxiliaryRoot /> : <App />}
  </React.StrictMode>,
);
