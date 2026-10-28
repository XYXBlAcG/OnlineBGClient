import { useEffect, useRef } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  auxiliaryView,
  auxiliaryIntentSchema,
  type AuxiliaryIntent,
  type AuxiliaryPayload,
  type AuxiliaryView,
} from "./contract";
export const nativeMain = () => isTauri() && !auxiliaryView;
export function useNativeWindow(
  view: AuxiliaryView,
  open: boolean,
  payload: AuxiliaryPayload,
  receive: (intent: AuxiliaryIntent) => void,
  enabled = true,
) {
  const active = nativeMain();
  const shown = enabled && open;
  const visible = useRef(shown);
  visible.current = shown;
  const latest = useRef(receive);
  latest.current = receive;
  const data = shown ? JSON.stringify(payload) : "";
  const sequence = useRef(Promise.resolve());
  const wasOpen = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    if (!active) return;
    let disposed = false;
    const unsub = listen<unknown>("auxiliary-intent", (event) => {
      const intent = auxiliaryIntentSchema.parse(event.payload);
      if (
        !disposed &&
        intent.view === view &&
        (intent.type !== "close" || visible.current)
      )
        latest.current(intent);
    });
    return () => {
      disposed = true;
      void unsub.then((close) => close());
    };
  }, [active, view]);
  useEffect(() => {
    if (!active) return;
    const focus = shown && !wasOpen.current;
    wasOpen.current = shown;
    sequence.current = sequence.current
      .then(async () => {
        if (shown)
          await invoke("present_auxiliary", {
            view,
            payload: JSON.parse(data),
            focus,
          });
        else await invoke("close_auxiliary", { view });
      })
      .catch((error) =>
        latest.current({ view, type: "error", message: String(error) }),
      );
  }, [active, view, shown, data]);

  useEffect(() => {
    const mounted = ++generation.current;
    return () => {
      if (active)
        sequence.current = sequence.current
          .then(async () => {
            if (mounted === generation.current)
              await invoke("close_auxiliary", { view });
          })
          .catch((error) =>
            latest.current({ view, type: "error", message: String(error) }),
          );
    };
  }, [active, view]);
  return active && enabled;
}
export function sendAuxiliary(intent: AuxiliaryIntent) {
  return invoke("auxiliary_intent", { intent });
}

export async function bindAuxiliary(
  id: string,
  binding: string,
): Promise<void> {
  const request = crypto.randomUUID();
  return new Promise<void>((resolve, reject) => {
    let dispose: (() => void) | undefined;
    let finished = false;
    const finish = (error?: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      dispose?.();
      error ? reject(new Error(error)) : resolve();
    };
    const timer = setTimeout(() => finish("保存超时，请重试"), 10000);
    void listen<{ request: string; error?: string }>(
      "binding-result",
      (event) => {
        if (event.payload.request === request) finish(event.payload.error);
      },
    )
      .then((stop) => {
        dispose = stop;
        if (finished) {
          stop();
          return;
        }
        void sendAuxiliary({
          view: "settings",
          type: "binding",
          request,
          id,
          binding,
        }).catch((error) => finish(String(error)));
      })
      .catch((error) => finish(String(error)));
  });
}

export function useWindowReady(
  frame: import("./contract").AuxiliaryFrame | undefined,
  ready: boolean,
  onError: (message: string) => void,
) {
  const latest = useRef(onError);
  latest.current = onError;
  useEffect(() => {
    if (!frame?.visible || !ready) return;
    let active = true;
    document.querySelector(".native-window-root")?.getBoundingClientRect();
    void invoke("auxiliary_ready", {
      view: frame.payload.view,
      revision: frame.revision,
      background: getComputedStyle(document.documentElement)
        .getPropertyValue("--canvas")
        .trim()
        .replace(
          /^#([\da-f]{4})$/i,
          (_match, value: string) =>
            `#${[...value].map((digit) => digit.repeat(2)).join("")}`,
        ),
    }).catch((error) => {
      if (active) latest.current(String(error));
    });
    return () => {
      active = false;
    };
  }, [frame?.revision, frame?.visible, ready]);
}
