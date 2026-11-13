import { PartyQueue } from "./client/PartyQueue";
import { RoundContinuation } from "./client/RoundContinuation";
import { FontAssets } from "./client/fonts";
import { useUsageContext } from "./client/usage/context";
import "./client/ui/art-experience.css";
import { AnimatedSidebar } from "./client/AnimatedSidebar";
import { v4 as randomId } from "uuid";
import { recordClientLog } from "./client/diagnostics";
import { startHosting } from "./client/start-hosting";
import { GameSizeProvider } from "./client/game-sizing/GameSizing";
import { UpdaterController } from "./client/updates/UpdaterController";
import { RoomOperation } from "./client/room-operation";
import { SceneSurface } from "./client/SceneSurface";
import { sceneKey } from "./client/scene-transition";
import { usePreferences } from "./client/use-preferences";
import { QuickStart } from "./client/QuickStart";
import { FocusControls } from "./client/FocusControls";
import {
  focusPresentation,
  focusToggleBinding,
} from "./client/focus-presentation";
import "./client/ui/focus.css";
import { GameCommandProvider } from "./client/use-game-commands";
import { ResumeDrawer } from "./client/lobby/ResumeDrawer";
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
import { guideFor } from "./client/beginner-guides";
import { BeginnerGuide } from "./client/BeginnerGuide";
import { Notices } from "./client/Notices";
import { MotionProvider } from "./client/motion";
import { HeroDescription } from "./client/HeroSurface";
import { HeroGuides } from "./domain/hero-guide";
import { useWindowWidth, useMobile } from "./client/use-mobile";
import { capabilities } from "./client/platform";
import { MobileJoin } from "./client/MobileJoin";
import { MobileHome } from "./client/mobile/MobileHome";
import { localRoomConfigFromParams } from "./client/mobile/local-room";
import { postNativeShell } from "./client/native-shell-bridge";
import { Invite } from "./client/Invite";
import { ComputeStatus } from "./client/ComputeStatus";
import { SidebarDivider } from "./client/SidebarDivider";
import { sidebarBounds, sidebarBreakpoint } from "./client/sidebar-layout";
import { ChatPanel } from "./client/ChatPanel";
import type { InteractionEvent, FreeInteractionKind } from "./domain/social";
import { installContextMenuPolicy } from "./client/desktop-context-menu";
import { applyTheme } from "./client/themes";
import { applyDisplayScale } from "./client/display-scale";
import { Button, Panel } from "./client/ui/Controls";
import { ErrorBoundary } from "./client/ui/ErrorBoundary";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { About } from "./client/About";
import { TableChrome } from "./client/TableChrome";
import { Records } from "./client/Records";
import { ClientStore } from "./client/storage";
import {
  achievementById,
  evaluateReplay,
  type AchievementUnlock,
} from "./domain/achievements";
import {
  AchievementToasts,
  previewAchievementUnlock,
} from "./client/Achievements";
import { FpsMeter } from "./client/ui/FpsMeter";
import { useAppProgress } from "./client/app-progress";
import { Settings } from "./client/Settings";
import {
  CommandRegistry,
  platformModifier,
  resolveCommandBinding,
} from "./client/commands";
import { Shortcut } from "./client/ui/Shortcut";
import { loadPreferences, type Preferences } from "./client/preferences";
import { Select } from "./client/ui/Controls";
import { Confirmation } from "./client/Confirmation";
import { confirmation } from "./client/confirmation-controller";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
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
import { OriginalGameLazy } from "./client/OriginalGameLazy";
import { Audit } from "./client/Audit";
import type { Action } from "./domain/types";
import type { Response, RoomConfig, Snapshot } from "./domain/protocol";
import { UpstreamRuntime } from "./upstream/runtime";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Lobby } from "./client/Lobby";
import { PregamePanel } from "./client/PregamePanel";
import { toGameSnapshot } from "./client/game-snapshot";
import { gameCatalogue, type GameKind } from "./domain/catalogue";
import { cardNames, skillNames } from "./domain/terms";
import "./client/ui/layers.css";
import "./styles.css";
import "./client/ui/experience.css";
import "./client/ui/social-experience.css";
import "./client/ui/mobile-landscape.css";
import "./client/ui/platform-controls.css";
import "./client/ui/mobile-usability.css";
import "./client/ui/mobile-home.css";
import "./client/ui/native-table.css";

const emptyInteractions: InteractionEvent[] = [];
const invited = new URLSearchParams(location.search);
const nativeTableKind = (() => {
  const value = invited.get("native-table");
  return value && value in gameCatalogue ? (value as GameKind) : null;
})();
const nativeRoomMode = invited.has("native-room");
const nativeRuns = invited.has("native-runs");
const nativeSpectator = invited.get("spectator") === "1";
const nativeShell = !!nativeTableKind || nativeRoomMode || nativeRuns;
const nativeConfirm =
  (window as unknown as { __onlinebgNativeConfirm?: boolean })
    .__onlinebgNativeConfirm === true;
if (nativeShell) document.documentElement.dataset.nativeShell = "true";
const DevPhoneRoom = import.meta.env.DEV
  ? React.lazy(() => import("./client/dev/PhoneRoom"))
  : null;
const DevNativeShell = import.meta.env.DEV
  ? React.lazy(() => import("./client/dev/NativeShellPreview"))
  : null;
const DevStyleGallery = import.meta.env.DEV
  ? React.lazy(() =>
      import("./client/dev/StyleGallery").then((module) => ({
        default: module.StyleGallery,
      })),
    )
  : null;
const DevStageGallery = import.meta.env.DEV
  ? React.lazy(() =>
      import("./client/dev/StageGallery").then((module) => ({
        default: module.StageGallery,
      })),
    )
  : null;
const DevPoolPreview = import.meta.env.DEV
  ? React.lazy(() =>
      import("./client/dev/PoolPreview").then((module) => ({
        default: module.PoolPreview,
      })),
    )
  : null;
const DevPool3DPreview = import.meta.env.DEV
  ? React.lazy(() =>
      import("./client/dev/Pool3DPreview").then((module) => ({
        default: module.Pool3DPreview,
      })),
    )
  : null;
const DevPoolPlayPreview = import.meta.env.DEV
  ? React.lazy(() =>
      import("./client/dev/PoolPlayPreview").then((module) => ({
        default: module.PoolPlayPreview,
      })),
    )
  : null;
const Practice = React.lazy(() =>
  import("./client/Practice").then((module) => ({ default: module.Practice })),
);
const devPhoneRoom = import.meta.env.DEV && invited.get("dev") === "phone";
const devNativeShell =
  import.meta.env.DEV && invited.get("dev") === "native-shell";
const devStyles = import.meta.env.DEV && invited.get("dev") === "styles";
const devStage = import.meta.env.DEV && invited.get("dev") === "stage";
const devPool = import.meta.env.DEV && invited.get("dev") === "pool";
const devPool3D = import.meta.env.DEV && invited.get("dev") === "pool3d";
const devPoolPlay = import.meta.env.DEV && invited.get("dev") === "poolplay";
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
  const mobile = useMobile() || nativeShell;
  useMobileViewport(mobile);
  const windowWidth = useWindowWidth();
  const narrowLayout = windowWidth < sidebarBreakpoint;
  const [inviteOpen, setInviteOpen] = useState(false);
  const connection = useRef<Connection | null>(null);
  const session = useRef<{ token: string; room: string } | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const countedPlay = useRef<string | null>(null);
  const [computeFailure, setComputeFailure] =
    useState<ComputeDiagnostic | null>(null);
  const [notice, setNotice] = useState("");
  const restoringRun = useRef<string | null>(null);
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
  const [practice, setPractice] = useState<{
    kind: GameKind;
    config: RoomConfig;
  } | null>(null);

  const quitting = useRef(false);
  const [closeIntent, setCloseIntent] = useState<"close" | "quit" | null>(null);
  const [service, setService] = useState(initialService);
  const invitationEndpoint = useRef("");
  const lanHosting = useRef(false);
  useEffect(() => {
    if (status) recordClientLog("connection", status);
  }, [status]);
  useEffect(() => {
    if (notice) recordClientLog("notice", notice);
  }, [notice]);
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
    !mobile &&
    !!snapshot &&
    !!guideFor(snapshot.kind, snapshot.config) &&
    !!preferences.beginnerGuides[snapshot.kind];
  useGameFeedback(snapshot, preferences);
  useEffect(() => {
    if (!snapshot?.playing) setFocused(false);
  }, [snapshot?.playing]);
  const guideShown = guideEnabled && sidebarTab === "guide";
  const sidebarOpen =
    guideShown || (sidebarTab === "chat" && preferences.chatVisible);
  const detachedSidebar = capabilities.auxiliaryWindows && narrowLayout;
  const tableFocused = focusPresentation({
    focused,
    playing: !!snapshot?.state && !snapshot.finished,
    tab,
  });
  useEffect(() => {
    if (!tableFocused) return;
    const exit = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        event.isComposing ||
        document.querySelector("[role=dialog][data-state=open]")
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      if (
        target?.closest(
          'input,textarea,[contenteditable="true"],[role="combobox"],[role="slider"]',
        )
      )
        return;
      event.preventDefault();
      setFocused(false);
    };
    window.addEventListener("keydown", exit);
    return () => window.removeEventListener("keydown", exit);
  }, [tableFocused]);
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
  const [achievementToasts, setAchievementToasts] = useState<
    AchievementUnlock[]
  >([]);
  const pushAchievementToasts = (items: AchievementUnlock[]) => {
    if (!items.length) return;
    void cuePlayer
      .unlock()
      .then(() => cuePlayer.play("achievement"))
      .catch(() => {});
    setAchievementToasts((value) => [...value, ...items].slice(-4));
  };
  const showAchievementPreview = () => {
    const preview = previewAchievementUnlock();
    if (preview) pushAchievementToasts([preview]);
  };
  const [recordsOpen, setRecordsOpen] = useState(false);
  const appProgress = useAppProgress({
    store,
    snapshot,
    network: mode === "network",
    onUnlocked: pushAchievementToasts,
    onError: (error) => setNotice(String(error)),
  });
  const unlockAchievements = async (
    records: import("./domain/replay").ReplayRecord[],
    current: Snapshot,
  ) => {
    if (!records.length || current.actor < 0) return;
    const seat = current.seats[current.actor];
    if (
      !seat ||
      seat.difficulty !== null ||
      seat.autoplay ||
      current.config.training
    )
      return;
    const profileId = store.achievementProfileId();
    const now = Date.now();
    const unlocks: AchievementUnlock[] = [];
    const completed: import("./client/app-progress").CompletedGame[] = [];
    for (const record of records) {
      if (
        record.memberIds &&
        record.memberIds[current.actor] !== current.seats[current.actor].id
      )
        continue;
      let result: ReturnType<typeof evaluateReplay> = {
        achievements: [],
        winner: false,
      };
      try {
        result = evaluateReplay(record, current.actor);
      } catch {
        continue;
      }
      completed.push({
        playId: `${record.room}:${record.startedAt}`,
        kind: record.config.kind,
        win: result.winner,
      });
      for (const achievementId of result.achievements) {
        unlocks.push({
          profileId,
          achievementId,
          firstAt: now,
          lastAt: now,
          count: 1,
          evidence: {
            room: record.room,
            startedAt: record.startedAt,
            rulesVersion: record.rulesVersion,
            actor: current.actor,
            seatName: seat.name,
            replayFingerprint: `${record.room}:${record.startedAt}:${record.seed}:${record.events.length}`,
            summary: `${gameCatalogue[record.config.kind].name} · ${seat.name}`,
          },
        });
      }
    }
    if (unlocks.length) {
      const created = await store.unlockAchievements(unlocks);
      if (created.length) {
        pushAchievementToasts(created);
        if (preferences.shareAchievements)
          for (const item of created) {
            const definition = achievementById.get(item.achievementId);
            if (definition?.game !== current.kind || !session.current) continue;
            connection.current?.send({
              type: "achievement-chat",
              token: session.current.token,
              id: randomId(),
              achievementId: item.achievementId,
            });
          }
      }
    }
    await appProgress.recordCompletion(completed);
  };
  useUsageContext(
    snapshot,
    mode === "local" || status === "已连接",
    recordsOpen,
  );
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
        id: randomId(),
        text,
      });
  }, []);
  const sendImage = useCallback((attachment: Attachment) => {
    if (session.current)
      connection.current?.send({
        type: "chat-image",
        token: session.current.token,
        id: randomId(),
        attachment,
      });
  }, []);
  const receive = async (response: Response) => {
    if (nativeShell && (response.type === "closed" || response.type === "left"))
      postNativeShell({ type: "closed" });
    if (
      restoringRun.current &&
      response.type === "snapshot" &&
      response.snapshot.state?.kind === "expedition" &&
      response.snapshot.state.view.runId === restoringRun.current
    ) {
      restoringRun.current = null;
      setNotice("远征已恢复");
    }
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
      if (hosting.current) setNotice("房间服务已就绪，可以邀请朋友加入");
      session.current = { token: response.token, room: response.room };
      if (hosting.current)
        localStorage.setItem(
          "onlinebg.hosted-room",
          JSON.stringify({ ...session.current, lan: lanHosting.current }),
        );
      setTokens(response.localTokens || []);
      if (nativeTableKind) {
        connection.current?.send({
          type: "ready",
          token: response.token,
          ready: true,
        });
        connection.current?.send({ type: "start", token: response.token });
      }
    }
    if (response.type === "snapshot") {
      if (response.snapshot.state?.kind === "expedition")
        void store
          .observeRun(response.snapshot.state.view, response.snapshot.actor)
          .catch((error) => setNotice(String(error)));
      void store
        .archiveRecords([
          ...response.snapshot.records,
          ...(response.snapshot.replay ? [response.snapshot.replay] : []),
        ])
        .then(() => {
          if (response.snapshot.replay)
            return unlockAchievements(
              [response.snapshot.replay],
              response.snapshot,
            );
        })
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
            lan: lanHosting.current,
            updated: Date.now(),
            names: response.snapshot.seats.map((s) => s.name),
            floor: run.floor,
            chapter: run.chapter,
          });
      }
      if (connection.current instanceof NetworkConnection) {
        localStorage.setItem(
          "onlinebg.last-room",
          invitationLink(
            response.snapshot.room,
            invitationEndpoint.current || connection.current.endpoint,
          ),
        );
      }
    }
  };
  useEffect(() => {
    setActionPending(false);
    setLatencyMs(undefined);
  }, [snapshot?.room]);
  useEffect(() => {
    if (!snapshot?.playId || countedPlay.current === snapshot.playId) return;
    countedPlay.current = snapshot.playId;
    const kind = snapshot.kind;
    setPreferences((value) => {
      const previous = value.gameStats[kind] ?? { plays: 0, lastPlayed: 0 };
      return {
        ...value,
        gameStats: {
          ...value.gameStats,
          [kind]: { plays: previous.plays + 1, lastPlayed: Date.now() },
        },
      };
    });
  }, [snapshot?.playId, snapshot?.kind, setPreferences]);
  useEffect(() => {
    setInteractions([]);
  }, [snapshot?.room, snapshot?.kind, !!snapshot?.state]);
  const interact = useCallback(
    (
      target: number,
      kind: FreeInteractionKind,
      units?: import("./domain/social").InteractionUnits,
    ) =>
      connection.current?.send({
        type: "interaction",
        token: session.current!.token,
        id: randomId(),
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
  useEffect(() => {
    if (!nativeShell || !nativeConfirm) return;
    const pending = new Map<string, (confirmed: boolean) => void>();
    const receive = (event: Event) => {
      const detail = (
        event as CustomEvent<{ id?: string; confirmed?: boolean }>
      ).detail;
      if (!detail?.id) return;
      pending.get(detail.id)?.(!!detail.confirmed);
      pending.delete(detail.id);
    };
    window.addEventListener("onlinebg-native-confirm", receive);
    confirmation.setNativeHandler(
      (message, label) =>
        new Promise<boolean>((resolve) => {
          const id = randomId();
          pending.set(id, resolve);
          postNativeShell({ type: "confirm", id, message, label });
        }),
    );
    return () => {
      window.removeEventListener("onlinebg-native-confirm", receive);
      confirmation.setNativeHandler(null);
      for (const resolve of pending.values()) resolve(false);
      pending.clear();
    };
  }, []);
  const connect = async (
    config: RoomConfig,
    name: string,
    nextMode: "local" | "network",
    endpoint: string,
    temporary: boolean,
    hostOnly: boolean,
    lan = false,
  ) => {
    if (!operation.begin("create")) return;
    invitationEndpoint.current = "";
    lanHosting.current = lan;
    const generation = ++launch.current;
    setBusy(true);
    try {
      config = {
        ...config,
        party: { ...config.party, enabled: preferences.party.autoEnable },
        plugins: [],
      };
      connection.current?.close();
      setNotice("");
      localStorage.setItem("player-name", name);
      setMode(nextMode);
      setTab("game");
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
        if (temporary || lan) {
          setStatus(lan ? "正在准备局域网房间" : "正在准备公网房间");
          const prepared = await startHosting(preferences.network, lan);
          endpoint = prepared.endpoint;
          invitationEndpoint.current = prepared.invitation;
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
  const nativeTableStarted = useRef(false);
  const connectRef = useRef(connect);
  useLayoutEffect(() => {
    connectRef.current = connect;
  });
  useEffect(() => {
    if (!nativeTableKind || nativeTableStarted.current) return;
    nativeTableStarted.current = true;
    void connectRef.current(
      localRoomConfigFromParams(nativeTableKind, invited),
      localStorage.getItem("player-name") || "我",
      "local",
      "",
      false,
      false,
    );
  }, [nativeTableKind]);
  useEffect(() => {
    if (!nativeRuns) return;
    postNativeShell({ type: "ready", kind: "runs", room: "" });
  }, []);
  useEffect(() => {
    if (!nativeShell || !notice || /已复制|成功|已就绪|邀请链接/.test(notice))
      return;
    postNativeShell({ type: "notice", message: notice });
  }, [nativeShell, notice]);
  useEffect(() => {
    if (!nativeShell || !snapshot) return;
    postNativeShell({
      type: "ready",
      kind: snapshot.kind,
      room: snapshot.room,
    });
  }, [nativeShell, snapshot?.kind, snapshot?.room]);
  const join = (name: string, invitation: string, spectator = false) => {
    invitationEndpoint.current = "";
    lanHosting.current = false;
    launch.current++;
    try {
      const { room, service: endpoint } = parseInvitation(invitation);
      connection.current?.close();
      localStorage.setItem("player-name", name);
      setMode("network");
      setService(endpoint);
      connection.current = new NetworkConnection(
        endpoint,
        { type: "join", room, name, avatar: preferences.avatar, spectator },
        receive,
        setStatus,
      );
    } catch (error) {
      setNotice(String(error));
    }
  };
  const autoJoined = useRef(false);
  useEffect(() => {
    if (autoJoined.current || !invited.has("room") || snapshot) return;
    autoJoined.current = true;
    join(
      invited.get("name")?.trim() ||
        localStorage.getItem("player-name") ||
        "我",
      invitationLink(invited.get("room") || "", initialService),
      nativeSpectator,
    );
  }, [snapshot, invited, initialService, join]);
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
  const leaveRef = useRef(leave);
  useLayoutEffect(() => {
    leaveRef.current = leave;
  });
  useEffect(() => {
    if (!nativeRoomMode && !nativeRuns) return;
    const leaveRoom = () => {
      if (!session.current) {
        postNativeShell({ type: "closed" });
        return;
      }
      void leaveRef.current();
    };
    window.addEventListener("onlinebg-native-leave", leaveRoom);
    return () => window.removeEventListener("onlinebg-native-leave", leaveRoom);
  }, []);
  const restoreHosted = async () => {
    const saved = localStorage.getItem("onlinebg.hosted-room");
    if (!saved) return;
    const generation = ++launch.current;
    setBusy(true);
    try {
      const identity = JSON.parse(saved) as {
        room: string;
        token: string;
        lan?: boolean;
      };
      const prepared = await startHosting(preferences.network, identity.lan);
      lanHosting.current = !!identity.lan;
      const endpoint = prepared.endpoint;
      invitationEndpoint.current = prepared.invitation;
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
          room: identity.room,
          token: identity.token,
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
    restoringRun.current = link.id;
    setBusy(true);
    try {
      connection.current?.close();
      setTab("game");
      setMode(link.endpoint ? "network" : "local");
      if (link.endpoint) {
        const prepared = link.hosted
          ? await startHosting(preferences.network, link.lan)
          : null;
        const endpoint = prepared?.endpoint ?? link.endpoint;
        invitationEndpoint.current = prepared?.invitation ?? "";
        lanHosting.current = !!link.lan;
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
      restoringRun.current = null;
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
          id: randomId(),
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
    () => (snapshot ? toGameSnapshot(snapshot) : null),
    [
      snapshot?.room,
      snapshot?.kind,
      snapshot?.actor,
      snapshot?.canManage,
      snapshot?.version,
      snapshot?.seats,
      snapshot?.state,
      snapshot?.candidates,
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
    snapshot
      ? invitationLink(snapshot.room, invitationEndpoint.current || service)
      : service;
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
    applyDisplayScale(preferences);
  }, [preferences.uiFontScale, preferences.uiScale]);
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
    const modifier = platformModifier();
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
        binding: resolveCommandBinding(
          command.id,
          command.binding,
          preferences.bindings,
        ),
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
        binding: focusToggleBinding,
        enabled: () => !!snapshot?.playing && !snapshot.finished,
        run: () => setFocused((value) => !value),
      },
      {
        id: "view.guide",
        title: guideShown ? "关闭新手引导" : "新手引导",
        enabled: () =>
          !mobile && !!snapshot && !!guideFor(snapshot.kind, snapshot.config),
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
        binding: resolveCommandBinding(
          command.id,
          command.binding,
          preferences.bindings,
        ),
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
    <GameSizeProvider profiles={preferences.gameSizes}>
      <MotionProvider preferences={preferences}>
        {capabilities.updater && (
          <UpdaterController
            preferences={preferences.updates}
            busy={
              !!snapshot ||
              !!session.current ||
              busy ||
              voiceActive ||
              /连接中|重连|正在准备/.test(status)
            }
            onAttention={() => {
              setSettingsSection("软件更新");
              setSettingsOpen(true);
            }}
          />
        )}
        <div
          className={`app-shell ${mobile ? "mobile-shell" : ""} ${nativeTableKind ? "native-table-shell" : ""} ${nativeRoomMode || (nativeRuns && snapshot) ? "native-room-shell" : ""} ${nativeRuns && !snapshot ? "native-runs-shell" : ""} ${immersive ? "mobile-immersive" : ""} ${tableFocused ? "table-focused" : ""}`}
        >
          <Confirmation />
          <FpsMeter visible={preferences.showFps} />
          <AchievementToasts
            items={
              snapshot
                ? achievementToasts.filter(
                    (item) =>
                      achievementById.get(item.achievementId)?.game !== "app",
                  )
                : achievementToasts
            }
            onDismiss={(achievementId) =>
              setAchievementToasts((value) =>
                value.filter((item) => item.achievementId !== achievementId),
              )
            }
          />
          {!nativeMain() && (
            <Panel
              open={!!closeIntent}
              onOpenChange={(value) => {
                if (!value) setCloseIntent(null);
              }}
              title="关闭客户端"
            >
              <p>
                {hosting.current ? "房间正在运行。" : "当前对局已自动保存。"}
              </p>
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
            onTestAchievement={showAchievementPreview}
          />
          <header className="app-toolbar" hidden={tableFocused}>
            <div>
              <span className="app-mark">OnlineBGClient</span>
              <span className="connection-status">{status}</span>
              {(busy || /连接中|重连中|连接中断/.test(status)) && (
                <Button
                  onClick={() =>
                    void cancelConnect().catch((error) =>
                      setNotice(String(error)),
                    )
                  }
                >
                  {busy ? "取消开房" : "取消连接"}
                </Button>
              )}
            </div>
            <div>
              {!snapshot && (
                <ResumeDrawer
                  busy={busy}
                  hosted={
                    isTauri() && !!localStorage.getItem("onlinebg.hosted-room")
                  }
                  localSave={hasLocalSave}
                  lastRoom={localStorage.getItem("onlinebg.last-room")}
                  onRestoreHosted={() => void restoreHosted()}
                  onRestoreLocal={restoreLocal}
                  onRestoreNetwork={(room) =>
                    join(localStorage.getItem("player-name") || "我", room)
                  }
                  onRestoreRun={(link) => void restoreRun(link)}
                  onAbandonRun={abandonRun}
                />
              )}
              {!mobile && (
                <Button onClick={() => setAboutOpen(true)}>关于</Button>
              )}
              {!mobile && (
                <Button onClick={() => setRecordsOpen(true)}>对局记录</Button>
              )}
              {snapshot && (
                <Button
                  className={unread ? "chat-unread" : ""}
                  onClick={toggleChat}
                >
                  聊天{unread ? ` · ${unread}` : ""}{" "}
                  <Shortcut
                    binding={
                      preferences.bindings["app.chat"] ??
                      `${platformModifier()}+J`
                    }
                  />
                </Button>
              )}
              {snapshot && (
                <VoiceToolbar
                  muteBinding={
                    preferences.bindings["voice.mute"] ??
                    `${platformModifier()}+Shift+M`
                  }
                  onOpen={() => {
                    setFocused(false);
                    setSidebarTab("chat");
                    setPreferences((value) => ({
                      ...value,
                      chatVisible: true,
                    }));
                  }}
                />
              )}
              {(!mobile || capabilities.runtime === "ios") && (
                <Button
                  onClick={() => {
                    setSettingsSection("外观");
                    setSettingsOpen(true);
                  }}
                  aria-label="打开设置"
                >
                  设置{" "}
                  {capabilities.keyboardShortcuts && (
                    <Shortcut
                      binding={
                        preferences.bindings["app.settings"] ??
                        `${platformModifier()}+,`
                      }
                    />
                  )}
                </Button>
              )}
              {snapshot && (
                <Button variant="danger" onClick={leave}>
                  {snapshot.canManage ? "关闭房间" : "离开房间"}
                </Button>
              )}
            </div>
          </header>
          <Notices
            notice={notice}
            progress={
              busy || /连接中|重连中|连接中断/.test(status) ? status : ""
            }
            onDismiss={dismissNotice}
            onCancel={() =>
              void cancelConnect().catch((error) => setNotice(String(error)))
            }
          />
          <SceneSurface scene={sceneKey(snapshot)}>
            {!snapshot && mobile ? (
              nativeRuns ? (
                <main className="native-runs-page">
                  <p className="native-runs-lead">
                    选择一次远征继续，存档保存在本机或原房间服务。
                  </p>
                  <RunShelf
                    busy={busy}
                    onRestore={restoreRun}
                    onAbandon={abandonRun}
                  />
                </main>
              ) : nativeTableKind ? (
                <div className="native-table-loading" role="status">
                  <span className="native-table-spinner" aria-hidden="true" />
                  <span>加载中</span>
                </div>
              ) : capabilities.localPlay ? (
                <MobileHome
                  preferences={preferences}
                  onPreferencesChange={changePreferences}
                  room={invited.get("room") || ""}
                  service={service}
                  busy={busy}
                  name={localStorage.getItem("player-name") || "我"}
                  onJoin={join}
                  onStartLocal={(config) =>
                    void connect(
                      config,
                      localStorage.getItem("player-name") || "我",
                      "local",
                      "",
                      false,
                      false,
                    )
                  }
                />
              ) : (
                <MobileJoin
                  preferences={preferences}
                  onPreferencesChange={changePreferences}
                  room={invited.get("room") || ""}
                  service={service}
                  busy={busy}
                  onJoin={join}
                />
              )
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
                    guideAvailable={
                      !mobile && !!guideFor(snapshot.kind, snapshot.config)
                    }
                    guideShown={guideShown}
                    onPractice={
                      gameCatalogue[snapshot.kind].ai
                        ? () =>
                            setPractice({
                              kind: snapshot.kind,
                              config: snapshot.config,
                            })
                        : undefined
                    }
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
                      showToggle={false}
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
                      onPractice={
                        gameCatalogue[snapshot.kind].ai
                          ? () =>
                              setPractice({
                                kind: snapshot.kind,
                                config: snapshot.config,
                              })
                          : undefined
                      }
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
                          <PregamePanel
                            snapshot={snapshot}
                            starting={pendingOperation?.kind === "start"}
                            onReady={() =>
                              connection.current!.send({
                                type: "ready",
                                token: session.current!.token,
                                ready: !snapshot.seats[snapshot.actor].ready,
                              })
                            }
                            onStart={restart}
                            onSeatChange={(index, config) =>
                              connection.current!.send({
                                type: "seat",
                                token: session.current!.token,
                                index,
                                config,
                              })
                            }
                          />
                        </div>
                      ) : (
                        <>
                          <TableChrome
                            snapshot={snapshot}
                            pending={actionPending}
                            finishedActions={
                              <>
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
                                {!!snapshot.partyQueue?.entries.length && (
                                  <PartyQueue
                                    compact
                                    snapshot={snapshot}
                                    onError={setNotice}
                                    send={(command) => {
                                      if (session.current)
                                        connection.current?.send({
                                          ...command,
                                          token: session.current.token,
                                        });
                                    }}
                                  />
                                )}
                                <RoundContinuation
                                  snapshot={snapshot}
                                  pending={!!pendingOperation}
                                  onStart={restart}
                                  onReady={(ready) => {
                                    if (session.current)
                                      connection.current?.send({
                                        type: "ready",
                                        token: session.current.token,
                                        ready,
                                      });
                                  }}
                                />
                              </>
                            }
                          />
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
                              <OriginalGameLazy
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
                                poolRenderer={preferences.poolRenderer}
                                poolSound={preferences.poolSound}
                                soundVolume={preferences.soundVolume}
                                onPoolRendererChange={(poolRenderer) =>
                                  setPreferences((value) => ({
                                    ...value,
                                    poolRenderer,
                                  }))
                                }
                                onInteractionEnd={finishInteraction}
                                restart={restart}
                                snapshot={gameSnapshot!}
                                motionPreferences={preferences}
                                onMotion={(motion) =>
                                  changePreferences({
                                    ...preferences,
                                    ...motion,
                                  })
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
                <AnimatedSidebar
                  open={sidebarVisible}
                  animated={preferences.motion}
                  mobile={mobile}
                >
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
                </AnimatedSidebar>
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
          {practice && (
            <React.Suspense fallback={null}>
              <Practice
                source={practice.config}
                onClose={() => setPractice(null)}
              />
            </React.Suspense>
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
    </GameSizeProvider>
  );
}

const initialPreferences = loadPreferences();
applyTheme(initialPreferences.theme);
applyDisplayScale(initialPreferences);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <FontAssets />
    <ErrorBoundary scope="app">
      <VoiceProvider>
        {auxiliaryView ? (
          <AuxiliaryRoot />
        ) : devNativeShell && DevNativeShell ? (
          <React.Suspense fallback={null}>
            <DevNativeShell />
          </React.Suspense>
        ) : devPool3D && DevPool3DPreview ? (
          <React.Suspense fallback={null}>
            <DevPool3DPreview debug={invited.get("debug") === "1"} />
          </React.Suspense>
        ) : devPoolPlay && DevPoolPlayPreview ? (
          <React.Suspense fallback={null}>
            <DevPoolPlayPreview />
          </React.Suspense>
        ) : devPool && DevPoolPreview ? (
          <React.Suspense fallback={null}>
            <DevPoolPreview />
          </React.Suspense>
        ) : devStage && DevStageGallery ? (
          <React.Suspense fallback={null}>
            <DevStageGallery />
          </React.Suspense>
        ) : devStyles && DevStyleGallery ? (
          <React.Suspense fallback={null}>
            <DevStyleGallery />
          </React.Suspense>
        ) : devPhoneRoom && DevPhoneRoom ? (
          <React.Suspense fallback={null}>
            <DevPhoneRoom />
          </React.Suspense>
        ) : (
          <App />
        )}
      </VoiceProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
