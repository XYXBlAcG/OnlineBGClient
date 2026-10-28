import { bindAuxiliary, useWindowReady } from "./windows";
import { MotionProvider } from "../motion";
import { useEffect, useMemo, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ChatPanel } from "../ChatPanel";
import { BeginnerGuide } from "../BeginnerGuide";
import { RoomSetup } from "../RoomSetup";
import { Settings } from "../Settings";
import { About } from "../About";
import { Invite } from "../Invite";
import { Records } from "../Records";
import { GameCommands } from "../GameCommands";
import { ComputeDiagnostics } from "../ComputeDiagnostics";
import { CommandRegistry } from "../commands";
import { loadPreferences } from "../preferences";
import { applyTheme } from "../themes";
import { installContextMenuPolicy } from "../desktop-context-menu";
import {
  auxiliaryView,
  type AuxiliaryFrame,
  type AuxiliaryIntent,
} from "./contract";
import { sendAuxiliary } from "./windows";
export function AuxiliaryRoot() {
  const [frame, setFrame] = useState<AuxiliaryFrame>();
  const [preferences, setPreferences] = useState(loadPreferences);
  const [error, setError] = useState("");
  const registry = useMemo(() => new CommandRegistry(), []);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const accept = (next: AuxiliaryFrame) => {
      if (active) {
        setError("");
        setFrame((previous) =>
          !previous || next.revision > previous.revision ? next : previous,
        );
      }
    };
    void (async () => {
      unsubscribe = await listen<AuxiliaryFrame>("auxiliary-state", (event) =>
        accept(event.payload),
      );
      if (!active) {
        unsubscribe();
        return;
      }
      accept(
        await invoke<AuxiliaryFrame>("auxiliary_state", {
          view: auxiliaryView,
        }),
      );
    })().catch((error) => setError(String(error)));
    const menu = installContextMenuPolicy(document, true);
    const theme = (event: StorageEvent) => {
      if (event.key === "onlinebg.preferences")
        setPreferences(loadPreferences());
    };
    window.addEventListener("storage", theme);
    return () => {
      active = false;
      unsubscribe?.();
      menu();
      window.removeEventListener("storage", theme);
    };
  }, []);
  const send = (intent: AuxiliaryIntent) => {
    void sendAuxiliary(intent).catch((error) => setError(String(error)));
  };
  const close = () => send({ view: auxiliaryView!, type: "close" });
  const onError = (message: string) =>
    send({ view: auxiliaryView!, type: "error", message });
  const payload = frame?.visible ? frame.payload : undefined;
  const [recordsReady, setRecordsReady] = useState(false);
  const acceptRecords = useCallback(() => setRecordsReady(true), []);
  useEffect(() => {
    if (!frame?.visible) setRecordsReady(false);
  }, [frame?.visible]);

  useEffect(() => {
    if (payload?.view === "settings" || payload?.view === "chat")
      setPreferences(payload.preferences);
  }, [payload]);
  useEffect(() => {
    applyTheme(preferences.theme);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(preferences.theme);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preferences.theme]);
  useWindowReady(
    frame,
    (payload?.view !== "records" || recordsReady || !!error) &&
      (!(payload?.view === "settings" || payload?.view === "chat") ||
        preferences.theme === payload.preferences.theme),
    setError,
  );

  useEffect(() => {
    if (payload?.view !== "actions") return;
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        send({ view: "actions", type: "close" });
        return;
      }
      const element = event.target as HTMLElement;
      if (
        registry.dispatch(
          {
            key: event.key,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            repeat: event.repeat,
            isComposing: event.isComposing,
            editing: element.matches("input,textarea,[contenteditable=true]"),
          },
          payload.snapshot.kind,
        )
      )
        event.preventDefault();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [payload?.view === "actions" ? payload.snapshot.kind : null, registry]);
  return (
    <MotionProvider preferences={preferences}>
      <div
        className="native-window-root"
        data-window-visible={frame?.visible ?? false}
      >
        {error && <p role="alert">{error}</p>}
        {!payload && !error && <p role="status">正在打开…</p>}
        {payload?.view === "chat" && (
          <ChatPanel
            token={payload.token}
            onImageQuality={(quality) =>
              send({ type: "chat-image-quality", view: "chat", quality })
            }
            onImage={(attachment) =>
              send({ type: "chat-image", view: "chat", attachment })
            }
            onBannerDisplay={(enabled) =>
              send({ type: "chat-banners", view: "chat", enabled })
            }
            showClose={false}
            snapshot={payload.snapshot}
            endpoint={payload.endpoint}
            preferences={{
              ...payload.preferences,
              chatVisible: true,
              messageSound: false,
              systemNotifications: false,
            }}
            onText={(text) => send({ view: "chat", type: "chat-text", text })}
            onUnread={() => {}}
            onClose={close}
          />
        )}
        {payload?.view === "guide" && (
          <BeginnerGuide
            key={payload.snapshot.kind}
            kind={payload.snapshot.kind}
            snapshot={payload.snapshot}
            enabled
            onChange={close}
            stepIndex={payload.index}
            onStepChange={(index) =>
              send({ view: "guide", type: "guide-step", index })
            }
            readingOnly
            showToggle={false}
            onRequestLocate={() =>
              send({
                view: "guide",
                type: "guide-locate",
                index: payload.index,
              })
            }
          />
        )}
        {payload?.view === "settings" && (
          <Settings
            open
            onOpenChange={close}
            preferences={payload.preferences}
            commands={payload.commands.map((command) => ({
              ...command,
              run: () => {},
              enabled: () => true,
            }))}
            canConfigureAI={payload.canConfigureAI}
            roomPerformance={payload.roomPerformance}
            mediaSession={payload.mediaSession}
            initialSection={payload.initialSection}
            onChange={(preferences) =>
              send({ view: "settings", type: "preferences", preferences })
            }
            onBind={bindAuxiliary}
            onError={onError}
          />
        )}
        {payload?.view === "roomsetup" && (
          <RoomSetup
            snapshot={payload.snapshot}
            onApply={(setup) =>
              send({ view: "roomsetup", type: "setup", setup })
            }
            onError={onError}
            onClose={close}
          />
        )}
        {payload?.view === "about" && (
          <About open onOpenChange={close} onError={onError} />
        )}
        {payload?.view === "invite" && (
          <Invite
            open
            url={payload.url}
            onOpenChange={close}
            onError={onError}
          />
        )}
        {payload?.view === "records" && (
          <Records
            open
            onOpenChange={close}
            onError={onError}
            onReady={acceptRecords}
          />
        )}
        {payload?.view === "actions" && (
          <GameCommands
            snapshot={payload.snapshot}
            bindings={payload.bindings}
            pending={payload.pending}
            registry={registry}
            act={(action) => send({ view: "actions", type: "action", action })}
          />
        )}
        {payload?.view === "diagnostics" && (
          <ComputeDiagnostics
            detailsOnly
            diagnostic={payload.diagnostic}
            onError={onError}
            onRetry={
              payload.canRetry
                ? () => send({ view: "diagnostics", type: "retry" })
                : undefined
            }
          />
        )}
        {payload?.view === "exit" && (
          <section className="native-content">
            <p>
              {payload.hosting
                ? "公网房间仍在运行。隐藏窗口可以继续为其他玩家提供服务。"
                : payload.voice
                  ? "语音通话仍在进行。隐藏窗口保持通话，退出客户端会离开语音。"
                  : "退出客户端？"}
            </p>
            <div className="confirmation-actions">
              <button onClick={close}>取消</button>
              {(payload.hosting || payload.voice) && (
                <button
                  onClick={() =>
                    send({ view: "exit", type: "exit", operation: "hide" })
                  }
                >
                  隐藏窗口，继续运行
                </button>
              )}
              <button
                onClick={() =>
                  send({ view: "exit", type: "exit", operation: "quit" })
                }
              >
                {payload.hosting ? "结束房间并退出" : "退出客户端"}
              </button>
            </div>
          </section>
        )}
      </div>
    </MotionProvider>
  );
}
