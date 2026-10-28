import { useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  initialUpdate,
  updateStatusSchema,
  type UpdateStatus,
  type UpdatePreferences,
  proxyOption,
} from "./model";
export function useUpdater() {
  const [status, setStatus] = useState(initialUpdate);
  useEffect(() => {
    if (!isTauri()) return;
    let active = true;
    const accept = (value: unknown) => {
      const parsed = updateStatusSchema.parse(value);
      if (active)
        setStatus((previous) =>
          parsed.revision >= previous.revision ? parsed : previous,
        );
    };
    const subscription = listen("updater-state", (event) =>
      accept(event.payload),
    );
    void subscription
      .then(async (stop) => {
        if (!active) {
          stop();
          return;
        }
        accept(await invoke("updater_state"));
      })
      .catch((error) => {
        if (active)
          setStatus((value) => ({
            ...value,
            phase: "error",
            error: String(error),
          }));
      });
    return () => {
      active = false;
      void subscription.then((stop) => stop());
    };
  }, []);
  return status;
}
export const checkUpdate = (
  preferences: UpdatePreferences,
  background = false,
) =>
  invoke<UpdateStatus>("updater_check", {
    proxy: proxyOption(preferences),
    background,
  });
export const downloadUpdate = (
  preferences: UpdatePreferences,
  automatic = false,
) =>
  invoke<UpdateStatus>("updater_download", {
    proxy: proxyOption(preferences),
    automatic,
  });
