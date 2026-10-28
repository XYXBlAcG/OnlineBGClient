import { UpdaterController } from "./client/updates/UpdaterController";
import { RoomOperation } from "./client/room-operation";
import { SceneSurface } from "./client/SceneSurface";
import { sceneKey } from "./client/scene-transition";
import { usePreferences } from "./client/use-preferences";
import { QuickStart } from "./client/QuickStart";
import { FocusControls } from "./client/FocusControls";
import { focusPresentation } from "./client/focus-presentation";
import "./client/ui/focus.css";
import { GameCommandProvider } from "./client/use-game-commands";
import { RunShelf } from "./client/expedition/RunShelf";
import type { RunLink } from "./client/storage";
import { voicePushBinding } from "./client/voice/shortcuts";
import { VoiceProvider, useVoiceActions } from "./client/voice/VoiceProvider";
import { VoiceToolbar } from "./client/voice/VoiceControls";
import { useMobileViewport } from "./client/use-mobile-viewport";
import type { Attachment } from "./domain/attachments";
import { BannerLayer } from "./client/social/BannerLayer";
import { useGameFeedback } from "./client/use-game-feedback";
import { cuePlayer } from "./client/sound";
import { RoomToolbar } from "./client/RoomToolbar";
import { roomReadiness } from "./client/room-readiness";
import { invitationLink, parseInvitation } from "./client/invitation";
import { AuxiliaryRoot } from "./client/native/AuxiliaryRoot";
import { auxiliaryView } from "./client/native/contract";
import { nativeMain, useNativeWindow } from "./client/native/windows";
import { ComputeDiagnostics } from "./client/ComputeDiagnostics";
import type { ComputeDiagnostic } from "./domain/compute-diagnostics";
import { beginnerGuides } from "./client/beginner-guides";
import { BeginnerGuide } from "./client/BeginnerGuide";
import { Notices } from "./client/Notices";
import { MotionProvider } from "./client/motion";
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
import { CommandRegistry } from "./client/commands";
import { loadPreferences, type Preferences } from "./client/preferences";
import { Select } from "./client/ui/Controls";
import { Confirmation } from "./client/Confirmation";
import { confirmation } from "./client/confirmation-controller";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  useSyncExternalStore,
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
import "./client/ui/experience.css";
import "./client/ui/social-experience.css";
import "./client/ui/mobile-landscape.css";

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
  const voice = useVoiceActions();
  const [voiceActive, setVoiceActive] = useState(false);
  const [shortcutRecording, setShortcutRecording] = useState(false);
  const shortcutOwner = useRef<string | null>(null);
  const [settingsSection, setSettingsSection] = useState("外观");
  const mobile = useMobile();
  useMobileViewport(mobile);
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
  const operation = useRef(new RoomOperation()).current;
  const pendingOperation = useSyncExternalStore(
    operation.subscribe,
    operation.snapshot,
    operation.snapshot,
  );
  useEffect(() => {
    if (
      pendingOperation?.kind === "start" &&
      /连接中断|重连中|身份已在其他/.test(status)
    )
      operation.cancel();
  }, [status, pendingOperation?.kind, operation]);
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
  const [preferences, setPreferences] = usePreferences((saved) => {
    const value = { ...saved, chatVisible: false };
    return mobile
      ? { ...value, chatVisible: false, auditVisible: false }
      : value;
  });
  useEffect(() => {
    voice.configure(
      nativeMain() && mode === "network" && session.current && snapshot
        ? { ...session.current, endpoint: service }
        : null,
      preferences.voice,
      status === "已连接",
    );
  }, [
    voice,
    mode,
    snapshot?.room,
    session.current?.token,
    service,
    preferences.voice,
    status,
  ]);
  useEffect(() => {
    const settings = () => {
      setSettingsSection("声音与语音");
      setSettingsOpen(true);
    };
    const active = (event: Event) =>
      setVoiceActive((event as CustomEvent<boolean>).detail);
    const effect = (event: Event) => {
      const effect = (event as CustomEvent<Preferences["voice"]["effect"]>)
        .detail;
      setPreferences((value) => ({
        ...value,
        voice: { ...value.voice, effect },
      }));
    };
    window.addEventListener("voice-effect", effect);
    window.addEventListener("voice-settings", settings);
    window.addEventListener("voice-active", active);
    return () => {
      window.removeEventListener("voice-effect", effect);
      window.removeEventListener("voice-settings", settings);
      window.removeEventListener("voice-active", active);
    };
  }, []);
  const guideEnabled =
    !!snapshot &&
    !!beginnerGuides[snapshot.kind] &&
    !!preferences.beginnerGuides[snapshot.kind];
  useGameFeedback(snapshot, preferences);
  useEffect(() => {
    if (!snapshot?.playing) setFocused(false);
  }, [snapshot?.playing]);
  const guideShown = guideEnabled && sidebarTab === "guide";
  const sidebarOpen =
    guideShown || (sidebarTab === "chat" && preferences.chatVisible);
  const detachedSidebar = nativeMain() && narrowLayout;
  const tableFocused = focusPresentation({
    focused,
    playing: !!snapshot?.state && !snapshot.finished,
    tab,
  });
  const immersive = mobile && tableFocused;
  const sidebarVisible =
    sidebarOpen && (!tableFocused || sidebarTab === "chat") && !detachedSidebar;
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

  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const [store] = useState(() => new ClientStore());
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [hasLocalSave, setHasLocalSave] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const registry = useRef(new CommandRegistry()).current;
  const menuState = useRef("");
  const registeredCommands = useSyncExternalStore(
    registry.subscribe,
    registry.list,
    registry.list,
  );
  useEffect(() => {
    if (!settingsOpen)
      voice.send({ type: "test", enabled: false, loopback: false });
  }, [settingsOpen, voice]);

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
      registry
        .list()
        .find(
          (command) =>
            (command.id === event.payload ||
              (event.payload === "game.actions" &&
                command.id.endsWith(".actions") &&
                command.scope !== "global")) &&
            command.enabled(),
        )
        ?.run();
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
  const sendImage = useCallback((attachment: Attachment) => {
    if (session.current)
      connection.current?.send({
        type: "chat-image",
        token: session.current.token,
        id: crypto.randomUUID(),
        attachment,
      });
  }, []);
  const receive = async (response: Response) => {
    operation.accept(response);
    if (response.type === "activity") {
      setActionPending(response.pending);
      if (response.latencyMs !== undefined) setLatencyMs(response.latencyMs);
      return;
    }
    if (response.type === "left" || response.type === "closed") {
      if (response.type === "closed" && response.replay)
        await store
          .archiveRecords([response.replay])
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
      if (preferencesRef.current.turnSound) cuePlayer.play("reject");
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
      void store
        .archiveRecords([
          ...response.snapshot.records,
          ...(response.snapshot.replay ? [response.snapshot.replay] : []),
        ])
        .catch((error) => setNotice(String(error)));
      setSnapshot(response.snapshot);
      if (
        response.snapshot.state?.kind === "expedition" &&
        response.snapshot.canManage &&
        session.current
      ) {
        const run = response.snapshot.state.view;
        if (response.snapshot.finished) void store.abandonRun(run.runId);
        else
          void store.linkRun({
            id: run.runId,
            token: session.current.token,
            room: response.snapshot.room,
            endpoint:
              connection.current instanceof NetworkConnection
                ? connection.current.endpoint
                : null,
            hosted: hosting.current,
            updated: Date.now(),
            names: response.snapshot.seats.map((s) => s.name),
            floor: run.floor,
          });
      }
      if (connection.current instanceof NetworkConnection) {
        localStorage.setItem(
          "onlinebg.last-room",
          invitationLink(response.snapshot.room, connection.current.endpoint),
        );
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
    (
      target: number,
      kind: InteractionKind,
      units?: import("./domain/social").InteractionUnits,
    ) =>
      connection.current?.send({
        type: "interaction",
        token: session.current!.token,
        id: crypto.randomUUID(),
        target,
        kind,
        units,
      }),
    [],
  );
  const cancelConnect = async () => {
    operation.cancel();
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
  const selectLocalPlayer = (token: string) => {
    if (!session.current) return;
    session.current.token = token;
    connection.current?.send({ type: "snapshot", token });
  };
  const toggleChat = () => {
    const open = sidebarTab !== "chat" || !preferences.chatVisible;
    setSidebarTab(open ? "chat" : null);
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
    if (!operation.begin("create")) return;
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
        connection.current.send({
          type: "create",
          config,
          name,
          avatar: preferences.avatar,
        });
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
          {
            type: "create",
            config,
            name,
            hostOnly,
            avatar: preferences.avatar,
          },
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
      operation.cancel();
      setStatus("开房失败");
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      if (generation === launch.current) setBusy(false);
    }
  };
  const join = (name: string, invitation: string) => {
    launch.current++;
    try {
      const { room, service: endpoint } = parseInvitation(invitation);
      connection.current?.close();
      localStorage.setItem("player-name", name);
      setMode("network");
      setService(endpoint);
      connection.current = new NetworkConnection(
        endpoint,
        { type: "join", room, name, avatar: preferences.avatar },
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
  const restoreRun = async (link: RunLink) => {
    const generation = ++launch.current;
    setBusy(true);
    try {
      connection.current?.close();
      setTab("game");
      setMode(link.endpoint ? "network" : "local");
      if (link.endpoint) {
        const endpoint = link.hosted
          ? await invoke<string>("start_host")
          : link.endpoint;
        if (generation !== launch.current) return;
        hosting.current = link.hosted;
        setService(endpoint);
        connection.current = new NetworkConnection(
          endpoint,
          { type: "restore-run", run: link.id, token: link.token },
          receive,
          setStatus,
        );
      } else {
        connection.current = new LocalConnection(receive);
        connection.current.send({
          type: "restore-run",
          run: link.id,
          token: link.token,
        });
      }
    } catch (error) {
      setNotice(String(error));
    } finally {
      if (generation === launch.current) setBusy(false);
    }
  };
  const abandonRun = async (link: RunLink): Promise<void> => {
    if (link.endpoint && link.hosted) {
      await invoke("abandon_hosted_run", { run: link.id, token: link.token });
      await store.abandonRun(link.id);
      return;
    }
    const endpoint = link.endpoint;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        channel.close();
        reject(new Error("放弃远征超时，请重试"));
      }, 15000);
      const receive = (response: Response) => {
        if (response.type === "run-abandoned" || response.type === "error") {
          clearTimeout(timer);
          channel.close();
          if (response.type === "error") reject(new Error(response.message));
          else resolve();
        }
      };
      const channel = endpoint
        ? new NetworkConnection(
            endpoint,
            { type: "abandon-run", run: link.id, token: link.token },
            receive,
            () => {},
          )
        : new LocalConnection(receive);
      if (!endpoint)
        channel.send({
          type: "abandon-run",
          run: link.id,
          token: link.token,
        });
    });
    await store.abandonRun(link.id);
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
    const current = session.current;
    if (!current) return;
    void confirmation
      .request("结束当前对局？房间和邀请链接会保留。", "结束对局")
      .then((confirmed) => {
        if (confirmed && session.current === current)
          connection.current?.send({ type: "end", token: current.token });
      });
  }, []);
  const restart = useCallback(() => {
    if (session.current && operation.begin("start", session.current.room))
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
  const [inviteCopied, setInviteCopied] = useState(false);
  useEffect(() => {
    if (!inviteCopied) return;
    const timer = setTimeout(() => setInviteCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [inviteCopied]);
  const invitationUrl = () =>
    snapshot ? invitationLink(snapshot.room, service) : service;
  const invite = async () => {
    const url = new URL(invitationUrl());
    try {
      await navigator.clipboard.writeText(url.href);
      setInviteCopied(true);
    } catch {
      setNotice(`邀请链接：${url.href}`);
    }
  };

  useEffect(() => {
    applyTheme(preferences.theme);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const changed = () => {
      if (preferences.theme === "system") applyTheme("system");
    };
    media.addEventListener("change", changed);

    return () => media.removeEventListener("change", changed);
  }, [preferences.theme]);
  useEffect(() => {
    const modifier = navigator.platform.includes("Mac") ? "Meta" : "Control";
    const commands = [
      {
        id: "voice.mute",
        title: "切换麦克风静音",
        binding: `${modifier}+Shift+M`,
        run: () => voice.send({ type: "mute" }),
      },
      {
        id: "voice.push",
        title: "按住说话",
        binding: voicePushBinding,
        run: () => {
          if (preferences.voice.mode === "push")
            voice.send({ type: "push", pressed: true });
        },
      },
      {
        id: "app.shortcuts",
        title: "查看快捷键",
        binding: "F1",
        run: () => {
          setSettingsSection("快捷键");
          setSettingsOpen(true);
        },
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
          (command.id !== "app.invite" || (!!snapshot && mode === "network")) &&
          (!command.id.startsWith("voice.") ||
            (nativeMain() && !!snapshot && mode === "network")),
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
  useEffect(() => {
    const commands = [
      {
        id: "app.about",
        title: "关于 OnlineBGClient",
        enabled: () => true,
        run: () => setAboutOpen(true),
      },
      {
        id: "app.show",
        title: "显示主窗口",
        enabled: () => true,
        run: () => {
          if (isTauri()) void getCurrentWindow().show();
        },
      },
      {
        id: "app.records",
        title: "对局记录",
        enabled: () => true,
        run: () => setRecordsOpen(true),
      },
      {
        id: "room.leave",
        title: snapshot?.canManage ? "关闭房间" : "离开房间",
        enabled: () => !!snapshot,
        run: () => void leave(),
      },
      {
        id: "room.end",
        title: "结束对局",
        enabled: () =>
          !!snapshot?.canManage &&
          snapshot.playing &&
          !snapshot.finished &&
          tab === "game" &&
          !recordsOpen,
        run: end,
      },
      {
        id: "room.start",
        title: "开始对局",
        enabled: () =>
          !!snapshot?.canManage &&
          !snapshot.playing &&
          !pendingOperation &&
          roomReadiness(snapshot.seats).canStart,
        run: restart,
      },
      {
        id: "room.ready",
        title:
          snapshot &&
          snapshot.actor >= 0 &&
          snapshot.seats[snapshot.actor].ready
            ? "取消准备"
            : "准备",
        enabled: () => !!snapshot && snapshot.actor >= 0 && !snapshot.playing,
        run: () => {
          if (snapshot && session.current)
            connection.current?.send({
              type: "ready",
              token: session.current.token,
              ready: !snapshot.seats[snapshot.actor].ready,
            });
        },
      },
      {
        id: "room.ai",
        title: snapshot?.aiPaused ? "继续 AI" : "暂停 AI",
        enabled: () =>
          !!snapshot?.canManage && snapshot.playing && !snapshot.finished,
        run: () => {
          if (snapshot && session.current)
            connection.current?.send({
              type: "ai-run",
              token: session.current.token,
              enabled: snapshot.aiPaused,
            });
        },
      },
      {
        id: "view.focus",
        title: focused ? "退出专注" : "专注模式",
        enabled: () => !!snapshot?.playing && !snapshot.finished,
        run: () => setFocused((value) => !value),
      },
      {
        id: "view.guide",
        title: guideShown ? "关闭新手引导" : "新手引导",
        enabled: () => !!snapshot && !!beginnerGuides[snapshot.kind],
        run: () => {
          if (!snapshot) return;
          setFocused(false);
          setSidebarTab(guideShown ? null : "guide");
          setPreferences((value) => ({
            ...value,
            chatVisible: false,
            beginnerGuides: {
              ...value.beginnerGuides,
              [snapshot.kind]: !guideShown,
            },
          }));
        },
      },
      ...[
        ["appearance", "外观"],
        ["social", "消息与互动"],
        ["voice", "声音与语音"],
        ["updates", "软件更新"],
        ["shortcuts", "快捷键"],
        ["network", "联机"],
        ["compute", "AI 计算"],
        ["data", "数据"],
      ].map(([key, title]) => ({
        id: `settings.${key}`,
        title,
        enabled: () => true,
        run: () => {
          setSettingsSection(title);
          setSettingsOpen(true);
        },
      })),
    ];
    const stop = commands.map((command) =>
      registry.register({
        ...command,
        scope: "global",
        binding: preferences.bindings[command.id] ?? "",
      }),
    );
    return () => stop.forEach((dispose) => dispose());
  }, [
    registry,
    snapshot,
    focused,
    guideShown,
    tab,
    recordsOpen,
    preferences.bindings,
    pendingOperation,
  ]);
  useEffect(() => {
    if (!isTauri()) return;
    const unlisten = listen<{ id: string; active: boolean }>(
      "shortcut-recording",
      (event) => {
        if (event.payload.active) shortcutOwner.current = event.payload.id;
        else if (shortcutOwner.current === event.payload.id)
          shortcutOwner.current = null;
        setShortcutRecording(!!shortcutOwner.current);
      },
    );
    return () => {
      void unlisten.then((stop) => stop());
    };
  }, []);
  useEffect(() => {
    if (!settingsOpen) {
      shortcutOwner.current = null;
      setShortcutRecording(false);
    }
  }, [settingsOpen]);
  useEffect(() => {
    if (!isTauri()) return;
    const payload = {
      recording: shortcutRecording,
      commands: registeredCommands.map((command) => ({
        ...command,
        id:
          command.id === `${snapshot?.kind}.actions`
            ? "game.actions"
            : command.id,
        enabled: command.enabled(),
        run: undefined,
      })),
    };
    const key = JSON.stringify(payload);
    if (menuState.current === key) return;
    menuState.current = key;
    void invoke("sync_menu", payload).catch((error) => {
      menuState.current = "";
      setNotice(String(error));
    });
  }, [registeredCommands, snapshot, shortcutRecording]);
  const bind = async (id: string, binding: string): Promise<void> => {
    const previous =
      registry.list().find((command) => command.id === id)?.binding ?? "";
    registry.bind(id, binding);
    try {
      setPreferences((value) => ({
        ...value,
        bindings: { ...value.bindings, [id]: binding },
      }));
    } catch (error) {
      registry.bind(id, previous);
      throw error;
    }
  };

  const hideClient = async () => {
    setCloseIntent(null);
    await getCurrentWindow().hide();
  };
  const quitClient = async () => {
    setCloseIntent(null);
    voice.send({ type: "leave" });
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
    { view: "exit", hosting: !!hosting.current, voice: voiceActive },
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
    !!snapshot && sidebarTab === "chat" && preferences.chatVisible,
    {
      view: "chat",
      snapshot: snapshot!,
      preferences,
      endpoint: mode === "network" ? service : undefined,
      token: session.current?.token,
    },
    (intent) => {
      if (intent.type === "chat-text") sendChat(intent.text);
      if (intent.type === "chat-image") sendImage(intent.attachment);
      if (intent.type === "chat-image-quality")
        setPreferences((value) => ({ ...value, imageQuality: intent.quality }));
      if (intent.type === "chat-banners")
        setPreferences((value) => ({
          ...value,
          bannerDisplay: intent.enabled,
        }));
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
    guideShown && !tableFocused,
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
  const sendAvatar = (avatar: string) => {
    if (session.current && snapshot && snapshot.actor >= 0)
      connection.current?.send({
        type: "avatar",
        token: session.current.token,
        avatar,
      });
  };
  const changePreferences = (next: Preferences) => {
    if (next.avatar !== preferences.avatar) sendAvatar(next.avatar);
    setPreferences(next);
  };
  return (
    <MotionProvider preferences={preferences}>
      <UpdaterController
        preferences={preferences.updates}
        busy={
          !!snapshot ||
          !!session.current ||
          busy ||
          voiceActive ||
          /连接中|重连|正在准备/.test(status)
        }
      />
      <div
        className={`app-shell ${mobile ? "mobile-shell" : ""} ${immersive ? "mobile-immersive" : ""} ${tableFocused ? "table-focused" : ""}`}
      >
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
            onError={setNotice}
          />
        )}
        <Settings
          initialSection={settingsSection}
          mediaSession={
            snapshot?.canManage && session.current && mode === "network"
              ? { ...session.current, endpoint: service }
              : undefined
          }
          canConfigureAI={
            !snapshot ||
            (snapshot.canManage && (!snapshot.host || snapshot.actor < 0))
          }
          roomPerformance={snapshot?.config.performance}
          onError={setNotice}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          preferences={preferences}
          onChange={changePreferences}
          commands={registeredCommands}
          onBind={bind}
        />
        <header className="app-toolbar" hidden={tableFocused}>
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
            {snapshot && (
              <VoiceToolbar
                onOpen={() => {
                  setFocused(false);
                  setSidebarTab("chat");
                  setPreferences((value) => ({ ...value, chatVisible: true }));
                }}
              />
            )}
            {!mobile && (
              <button
                onClick={() => {
                  setSettingsSection("外观");
                  setSettingsOpen(true);
                }}
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
        <SceneSurface scene={sceneKey(snapshot)}>
          {!snapshot && mobile ? (
            <MobileJoin
              preferences={preferences}
              onPreferencesChange={changePreferences}
              room={invited.get("room") || ""}
              service={service}
              busy={busy}
              onJoin={join}
            />
          ) : !snapshot ? (
            <>
              <QuickStart
                desktop={isTauri()}
                showGuide={preferences.showQuickStart}
                showVoice={preferences.showVoiceShortcut}
                expanded={preferences.quickStartOpen}
                onExpandedChange={(quickStartOpen) =>
                  changePreferences({ ...preferences, quickStartOpen })
                }
                onVoiceSettings={() => voice.send({ type: "settings" })}
              />
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
                      )
                    }
                  >
                    恢复联机房间
                  </button>
                )}
              </div>
              <RunShelf
                busy={busy}
                onRestore={(link) => void restoreRun(link)}
                onAbandon={abandonRun}
              />
              <Lobby
                service={service}
                initialRoom={invited.get("room") || ""}
                busy={busy || pendingOperation?.kind === "create"}
                onCreate={connect}
                onJoin={join}
                preferences={preferences}
                onPreferencesChange={changePreferences}
              />
            </>
          ) : (
            <main
              className={`room-layout ${sidebarVisible ? "sidebar-open" : "chat-hidden"} ${snapshot.state && tab === "game" ? "playing-room" : ""} ${tableFocused ? "focused-room" : ""} ${guideLocated ? "guide-located" : ""}`}
              style={
                {
                  "--chat-width": `${sidebarWidth}px`,
                } as React.CSSProperties
              }
            >
              <section className="game-area">
                <RoomToolbar
                  snapshot={snapshot}
                  mobile={mobile}
                  focused={tableFocused}
                  onFocus={() => setFocused(!focused)}
                  onEnd={tab === "game" ? end : undefined}
                  preferences={preferences}
                  onTheme={(theme) =>
                    setPreferences((value) => ({ ...value, theme }))
                  }
                  latency={latencyMs ?? undefined}
                  network={mode === "network"}
                  invite={invite}
                  inviteCopied={inviteCopied}
                  onInvite={() => setInviteOpen(true)}
                  send={(command) =>
                    connection.current!.send({
                      ...command,
                      token: session.current!.token,
                    })
                  }
                  onError={setNotice}
                  act={act}
                  registry={registry}
                  pending={actionPending}
                  guideAvailable={!!beginnerGuides[snapshot.kind]}
                  guideShown={guideShown}
                  onGuide={() => {
                    setFocused(false);
                    setGuideLocated(false);
                    setSidebarTab(!guideShown ? "guide" : null);
                    setPreferences((value) => ({
                      ...value,
                      chatVisible: false,
                      beginnerGuides: {
                        ...value.beginnerGuides,
                        [snapshot.kind]: !guideShown,
                      },
                    }));
                  }}
                />
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
                  details={preferences.computeDetails}
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
                      onValueChange={selectLocalPlayer}
                    >
                      {tokens.map((token, index) => (
                        <option value={token} key={token}>
                          玩家 {index + 1}
                        </option>
                      ))}
                    </Select>
                  )}
                  <BeginnerGuide
                    showToggle={!mobile}
                    key={snapshot.kind}
                    snapshot={snapshot}
                    dock={guideDock}
                    visible={guideShown && !tableFocused}
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
                        {snapshot.resumeRoles && (
                          <div className="resume-roles">
                            <h3>确认远征角色后继续</h3>
                            {snapshot.resumeRoles.map((role, index) => (
                              <p key={index}>
                                {snapshot.seats[index].name ||
                                  `等待席位 ${index + 1}`}{" "}
                                · {role.profession}（原玩家：{role.name}）
                              </p>
                            ))}
                            <p className="muted">
                              确认本人接管的角色后准备，房主点开始对局继续原进度。
                            </p>
                          </div>
                        )}
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
                            {!(
                              snapshot.canManage &&
                              index > 0 &&
                              seat.difficulty
                            ) && (
                              <small>
                                {seat.difficulty
                                  ? difficultyNames[seat.difficulty]
                                  : seat.online
                                    ? seat.ready
                                      ? "已准备"
                                      : "未准备"
                                    : "等待加入"}
                              </small>
                            )}
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
                        <div className="room-ready-actions">
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
                              disabled={
                                !roomReadiness(snapshot.seats).canStart ||
                                !!pendingOperation
                              }
                              aria-busy={pendingOperation?.kind === "start"}
                              className={`primary-button ${pendingOperation?.kind === "start" ? "operation-working" : ""}`}
                              onClick={restart}
                            >
                              {pendingOperation?.kind === "start"
                                ? "正在开始…"
                                : "开始对局"}
                            </button>
                          )}
                        </div>
                        {!snapshot.playing && (
                          <p className="room-readiness" role="status">
                            {roomReadiness(snapshot.seats).message}
                          </p>
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
                                onClick={restart}
                                disabled={!!pendingOperation}
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
                        {snapshot.playing && (
                          <div className="game-status-row">
                            <span
                              className="game-turn-indicator"
                              aria-live="polite"
                              role="status"
                            >
                              {actionPending
                                ? "操作确认中…"
                                : snapshot.playing &&
                                    !snapshot.paused &&
                                    snapshot.candidates.length
                                  ? "轮到你了"
                                  : ""}
                            </span>
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
                          <GameCommandProvider
                            registry={registry}
                            bindings={preferences.bindings}
                          >
                            <OriginalGame
                              pending={actionPending}
                              onAutoplay={(enabled, index) =>
                                connection.current!.send({
                                  type: "autoplay",
                                  index,
                                  token: session.current!.token,
                                  enabled,
                                })
                              }
                              onPhrase={sendChat}
                              customPhrases={preferences.phraseGroups}
                              interactions={
                                preferences.interactions
                                  ? interactions
                                  : emptyInteractions
                              }
                              sound={preferences.interactionSound}
                              onInteractionEnd={finishInteraction}
                              restart={restart}
                              snapshot={gameSnapshot!}
                              motionPreferences={preferences}
                              onMotion={(motion) =>
                                changePreferences({ ...preferences, ...motion })
                              }
                              onAvatar={(avatar) => {
                                sendAvatar(avatar);
                                setPreferences({ ...preferences, avatar });
                              }}
                              act={act}
                              end={end}
                              onInteract={interact}
                              onReplay={
                                !mobile && preferences.auditVisible
                                  ? review
                                  : undefined
                              }
                            />
                          </GameCommandProvider>
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
                          <strong>{name}</strong> ·{" "}
                          {dictionary.load(8280).zd(id)}
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
                  {guideEnabled && !tableFocused && (
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
                  <button
                    className="sidebar-close"
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
                </nav>
                <div
                  ref={setGuideDock}
                  className="room-guide-slot"
                  hidden={!guideShown}
                />

                <ChatPanel
                  showClose={false}
                  snapshot={snapshot}
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
                  token={session.current?.token}
                  onImage={sendImage}
                  onImageQuality={(imageQuality) =>
                    setPreferences((value) => ({ ...value, imageQuality }))
                  }
                  onBannerDisplay={(bannerDisplay) =>
                    setPreferences((value) => ({ ...value, bannerDisplay }))
                  }
                  onText={sendChat}
                />
              </aside>
            </main>
          )}
        </SceneSurface>
        {snapshot && (
          <BannerLayer
            serverTime={snapshot.serverTime}
            room={snapshot.room}
            messages={snapshot.chat}
            preferences={preferences}
          />
        )}
        {tableFocused && (
          <FocusControls
            players={tokens.map((id, index) => ({
              id,
              name: `玩家 ${index + 1}`,
            }))}
            selected={session.current?.token}
            onPlayer={selectLocalPlayer}
            unread={unread}
            chatOpen={sidebarVisible}
            onExit={() => setFocused(false)}
            onChat={toggleChat}
            onEnd={
              snapshot?.canManage && snapshot.playing && !snapshot.finished
                ? end
                : undefined
            }
          />
        )}
      </div>
    </MotionProvider>
  );
}

applyTheme(loadPreferences().theme);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <VoiceProvider>{auxiliaryView ? <AuxiliaryRoot /> : <App />}</VoiceProvider>
  </React.StrictMode>,
);
