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
export function playCue(): void {
  const context = new AudioContext();
  const oscillator = context.createOscillator(),
    gain = context.createGain();
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.frequency.value = 680;
  gain.gain.setValueAtTime(0.04, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.12);
  oscillator.onended = () => {
    void context.close();
  };
}
