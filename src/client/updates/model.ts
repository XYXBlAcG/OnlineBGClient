import { z } from "zod";
import { version } from "../../../package.json";
export const updatePreferencesSchema = z.object({
  checkOnLaunch: z.boolean().default(true),
  notify: z.boolean().default(true),
  automatic: z.boolean().default(false),
  useProxy: z.boolean().default(false),
  proxy: z.string().default("http://127.0.0.1:7897"),
});
export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;
export const updateStatusSchema = z.object({
  revision: z.number(),
  phase: z.enum([
    "idle",
    "checking",
    "current",
    "available",
    "downloading",
    "downloaded",
    "installing",
    "error",
  ]),
  currentVersion: z.string(),
  version: z.string().nullable(),
  notes: z.string(),
  received: z.number(),
  total: z.number().nullable(),
  error: z.string().nullable(),
  approved: z.boolean(),
  automatic: z.boolean(),
  background: z.boolean(),
});
export type UpdateStatus = z.infer<typeof updateStatusSchema>;
export const initialUpdate: UpdateStatus = {
  revision: 0,
  phase: "idle",
  currentVersion: version,
  version: null,
  notes: "",
  received: 0,
  total: null,
  error: null,
  approved: false,
  automatic: false,
  background: false,
};
export const proxyOption = (preferences: UpdatePreferences) =>
  preferences.useProxy ? preferences.proxy : null;
export function updateAction(
  status: UpdateStatus,
  preferences: UpdatePreferences,
  busy: boolean,
): "download" | "ask" | "install" | null {
  if (status.phase === "available")
    return preferences.automatic
      ? "download"
      : preferences.notify && status.background && !busy
        ? "ask"
        : null;
  if (
    status.phase === "downloaded" &&
    status.approved &&
    !busy &&
    (!status.automatic || preferences.automatic)
  )
    return "install";
  return null;
}
export const updateLabels: Record<UpdateStatus["phase"], string> = {
  idle: "尚未检查",
  checking: "正在检查更新…",
  current: "当前已是最新正式版",
  available: "发现新版本",
  downloading: "正在下载并校验…",
  downloaded: "下载完成，退出房间和连麦后将自动安装并重启",
  installing: "正在安装，即将重启…",
  error: "更新失败，可重试",
};

export function updateAttention(status: UpdateStatus): string | null {
  return (status.phase === "available" || status.phase === "downloading") &&
    status.version
    ? status.version
    : null;
}
export function downloadPercent(status: UpdateStatus): number | null {
  if (!status.total || status.total <= 0) return null;
  return Math.max(0, Math.min(100, (status.received / status.total) * 100));
}
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 秒";
  if (seconds < 60) return `${Math.ceil(seconds)} 秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分 ${Math.ceil(seconds % 60)} 秒`;
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
}
