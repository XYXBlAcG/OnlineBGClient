import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { emit, emitTo, listen } from "@tauri-apps/api/event";
import { nativeMain } from "../native/windows";
import { keyboardBinding } from "../commands";
import { voicePushBinding } from "./shortcuts";
import { loadPreferences } from "../preferences";
import { cuePlayer } from "../sound";
import {
  initialVoice,
  voiceIntentSchema,
  type VoiceGrant,
  type VoiceIntent,
  type VoicePreferences,
  type VoiceRoom,
  type VoiceStatus,
  type VoiceView,
} from "../../domain/voice";
import { VoiceSession } from "./session";
const State = createContext<VoiceView>(initialVoice);
const Actions = createContext<{
  send: (intent: VoiceIntent) => void;
  configure: (
    room: VoiceRoom | null,
    options: VoicePreferences,
    online: boolean,
  ) => void;
}>({ send: () => {}, configure: () => {} });
export const useVoice = () => ({
  view: useContext(State),
  ...useContext(Actions),
});
export const useVoiceActions = () => useContext(Actions);
export function VoiceProvider({ children }: { children: ReactNode }) {
  const owner = useMemo(
    () =>
      nativeMain()
        ? new VoiceSession(
            (operation, room) =>
              invoke<VoiceGrant | VoiceStatus>("voice_request", {
                ...room,
                operation,
              }),
            async () => {
              const { LiveKitTransport } = await import("./livekit");
              return new LiveKitTransport();
            },
          )
        : null,
    [],
  );
  const [view, setView] = useState(initialVoice),
    options = useRef<VoicePreferences>();
  const actions = useMemo(
    () => ({
      send: (intent: VoiceIntent) => {
        if (!isTauri()) return;
        if (owner) {
          if (intent.type === "settings")
            window.dispatchEvent(new Event("voice-settings"));
          else void owner.command(intent).catch((error) => owner.fail(error));
        } else void emitTo("main", "voice-command", intent);
      },
      configure: (
        next: VoiceRoom | null,
        preferences: VoicePreferences,
        online: boolean,
      ) => {
        options.current = preferences;
        if (owner)
          void owner
            .configure(next, preferences, online)
            .catch((error) => owner.fail(error));
      },
    }),
    [owner],
  );
  useEffect(() => {
    if (!isTauri()) return;
    let active = true;
    const stops: Promise<() => void>[] = [];
    if (owner) {
      let wasActive = false;
      const update = () => {
        if (!active) return;
        const next = owner.snapshot();
        setView(next);
        void emit("voice-state", next);
        const speaking = next.members.some((member) => member.speaking);
        cuePlayer.setDucked(!!options.current?.duck && speaking);
        const busy =
          ["connecting", "connected", "reconnecting"].includes(next.phase) ||
          next.testing;
        if (busy !== wasActive) {
          wasActive = busy;
          void invoke("voice_active", { active: busy });
          window.dispatchEvent(
            new CustomEvent("voice-active", { detail: busy }),
          );
        }
      };
      const stop = owner.subscribe(update);
      update();
      stops.push(Promise.resolve(stop));
      stops.push(
        listen<unknown>("voice-command", (event) => {
          const parsed = voiceIntentSchema.safeParse(event.payload);
          if (!parsed.success) return;
          if (parsed.data.type === "sync") update();
          else actions.send(parsed.data);
        }),
      );
      stops.push(
        listen<string>("voice-config-error", (event) =>
          owner.fail(new Error(event.payload)),
        ),
      );
      const changed = () => actions.send({ type: "devices" });
      navigator.mediaDevices?.addEventListener("devicechange", changed);
      stops.push(
        Promise.resolve(() =>
          navigator.mediaDevices?.removeEventListener("devicechange", changed),
        ),
      );
    } else {
      stops.push(
        listen<VoiceView>("voice-state", (event) => {
          if (active) setView(event.payload);
        }).then((stop) => {
          if (active) void emitTo("main", "voice-command", { type: "sync" });
          return stop;
        }),
      );
    }
    const release = () => actions.send({ type: "push", pressed: false });
    const keyup = () => release();
    const keydown = (event: KeyboardEvent) => {
      if (owner || event.repeat || event.isComposing) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'input,textarea,[contenteditable="true"],[role="combobox"]',
        )
      )
        return;
      const preferences = loadPreferences();
      const binding = keyboardBinding(event);
      if (
        preferences.voice.mode === "push" &&
        binding === (preferences.bindings["voice.push"] ?? voicePushBinding)
      ) {
        event.preventDefault();
        actions.send({ type: "push", pressed: true });
      }
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", release);
    stops.push(
      Promise.resolve(() => {
        window.removeEventListener("keydown", keydown);
        window.removeEventListener("keyup", keyup);
        window.removeEventListener("blur", release);
      }),
    );
    return () => {
      active = false;
      for (const stop of stops) void stop.then((fn) => fn());
      if (owner) {
        void owner.leave();
        cuePlayer.setDucked(false);
        void invoke("voice_active", { active: false });
      }
    };
  }, [owner, actions]);
  return (
    <Actions.Provider value={actions}>
      <State.Provider value={view}>{children}</State.Provider>
    </Actions.Provider>
  );
}
