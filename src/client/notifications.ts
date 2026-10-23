import { cuePlayer, type Cue } from "./sound";
import { isTauri } from "@tauri-apps/api/core";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function enableNotifications(): Promise<boolean> {
  if (isTauri())
    return (
      (await isPermissionGranted()) || (await requestPermission()) === "granted"
    );
  return (
    "Notification" in window &&
    (await Notification.requestPermission()) === "granted"
  );
}
export function notifyMessage(name: string, text: string): void {
  if (isTauri()) sendNotification({ title: `${name} · 房间消息`, body: text });
  else if ("Notification" in window && Notification.permission === "granted")
    new Notification(`${name} · 房间消息`, { body: text });
}
export function playCue(kind: Cue = "message", volume?: number): void {
  cuePlayer.play(kind, volume);
}
