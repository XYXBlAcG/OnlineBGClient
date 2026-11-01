import { invoke, isTauri } from "@tauri-apps/api/core";
export function recordClientLog(source: string, message: string) {
  if (isTauri())
    void invoke("record_log", {
      source,
      message: message.slice(0, 4000),
    }).catch(() => {});
}
export function installDiagnostics() {
  if (!isTauri()) return () => {};
  const error = (event: ErrorEvent) =>
    recordClientLog(
      "error",
      `${event.message} ${event.error instanceof Error ? (event.error.stack ?? "") : ""}`,
    );
  const rejection = (event: PromiseRejectionEvent) =>
    recordClientLog(
      "rejection",
      event.reason instanceof Error
        ? (event.reason.stack ?? event.reason.message)
        : String(event.reason),
    );
  window.addEventListener("error", error);
  window.addEventListener("unhandledrejection", rejection);
  return () => {
    window.removeEventListener("error", error);
    window.removeEventListener("unhandledrejection", rejection);
  };
}
