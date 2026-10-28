import { useEffect, useRef } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import { useUpdater, checkUpdate, downloadUpdate } from "./client";
import { updateAction, type UpdatePreferences } from "./model";
export function UpdaterController({
  preferences,
  busy,
}: {
  preferences: UpdatePreferences;
  busy: boolean;
}) {
  const status = useUpdater(),
    decisions = useRef(new Set<string>()),
    completion = useRef(false),
    latest = useRef(preferences);
  latest.current = preferences;
  useEffect(() => {
    if (isTauri())
      void invoke("updater_activity", { busy }).catch(console.error);
  }, [busy]);
  useEffect(() => {
    if (!isTauri() || completion.current) return;
    completion.current = true;
    void invoke<{ installed: boolean; version: string } | null>(
      "updater_completion",
    )
      .then((result) => {
        if (result)
          return message(
            result.installed
              ? `已更新到 ${result.version}，可以继续使用。`
              : `上次更新未完成，当前版本仍为 ${result.version}。`,
            {
              title: result.installed ? "更新完成" : "更新未完成",
              kind: result.installed ? "info" : "warning",
            },
          );
      })
      .catch(console.error);
  }, []);
  useEffect(() => {
    if (!isTauri() || !preferences.checkOnLaunch) return;
    const timer = setTimeout(() => {
      void checkUpdate(latest.current, true).catch(console.error);
    }, 1200);
    return () => clearTimeout(timer);
  }, [preferences.checkOnLaunch]);
  useEffect(() => {
    if (!isTauri()) return;
    if (status.phase === "error")
      for (const key of decisions.current)
        if (key.startsWith("download:")) decisions.current.delete(key);
    const action = updateAction(status, preferences, busy);
    if (action === "ask" || action === "download") {
      const key = `${action}:${status.version}`;
      if (decisions.current.has(key)) return;
      decisions.current.add(key);
      void (async () => {
        if (
          action === "download" ||
          (await confirm(
            `发现新版本 ${status.version}。\n${status.notes}\n\n下载后将在退出房间和连麦后自动安装并重启。`,
            { title: "软件更新", okLabel: "下载并安装", cancelLabel: "稍后" },
          ))
        )
          await downloadUpdate(latest.current, action === "download");
      })().catch(console.error);
    }
    if (action !== "install") return;
    let active = true,
      timer: ReturnType<typeof setTimeout> | undefined;
    const install = async () => {
      try {
        if (!active) return;
        if (await invoke<boolean>("updater_can_install")) {
          if (active) await invoke("updater_install");
        } else if (active) timer = setTimeout(() => void install(), 1000);
      } catch (error) {
        console.error(error);
      }
    };
    void install();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    status.phase,
    status.version,
    status.approved,
    status.automatic,
    status.background,
    preferences.automatic,
    preferences.notify,
    busy,
  ]);
  return null;
}
