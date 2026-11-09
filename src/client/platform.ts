import { isTauri } from "@tauri-apps/api/core";

export type RuntimePlatform = "web" | "desktop" | "ios" | "android";

export interface RuntimeCapabilities {
  runtime: RuntimePlatform;
  desktop: boolean;
  mobileUi: boolean;
  localPlay: boolean;
  voice: boolean;
  voiceHostConfig: boolean;
  hosting: boolean;
  auxiliaryWindows: boolean;
  updater: boolean;
  nativeFiles: boolean;
  notifications: boolean;
  keyboardShortcuts: boolean;
  qrScanner: boolean;
}

const capabilitiesByRuntime: Record<RuntimePlatform, RuntimeCapabilities> = {
  web: {
    runtime: "web",
    desktop: false,
    mobileUi: false,
    localPlay: false,
    voice: false,
    voiceHostConfig: false,
    hosting: false,
    auxiliaryWindows: false,
    updater: false,
    nativeFiles: false,
    notifications: false,
    keyboardShortcuts: false,
    qrScanner: false,
  },
  desktop: {
    runtime: "desktop",
    desktop: true,
    mobileUi: false,
    localPlay: true,
    voice: true,
    voiceHostConfig: true,
    hosting: true,
    auxiliaryWindows: true,
    updater: true,
    nativeFiles: true,
    notifications: true,
    keyboardShortcuts: true,
    qrScanner: false,
  },
  ios: {
    runtime: "ios",
    desktop: false,
    mobileUi: true,
    localPlay: true,
    voice: true,
    voiceHostConfig: false,
    hosting: false,
    auxiliaryWindows: false,
    updater: false,
    nativeFiles: true,
    notifications: true,
    keyboardShortcuts: false,
    qrScanner: true,
  },
  android: {
    runtime: "android",
    desktop: false,
    mobileUi: true,
    localPlay: true,
    voice: false,
    voiceHostConfig: false,
    hosting: false,
    auxiliaryWindows: false,
    updater: false,
    nativeFiles: true,
    notifications: true,
    keyboardShortcuts: false,
    qrScanner: true,
  },
};

export function detectRuntime(
  tauri = isTauri(),
  userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
): RuntimePlatform {
  if (!tauri) return "web";
  if (/iPhone|iPod/.test(userAgent)) return "ios";
  if (/Android/.test(userAgent)) return "android";
  return "desktop";
}

export function runtimeCapabilities(
  runtime: RuntimePlatform,
): RuntimeCapabilities {
  return capabilitiesByRuntime[runtime];
}

export const runtime = detectRuntime();
export const capabilities = runtimeCapabilities(runtime);
