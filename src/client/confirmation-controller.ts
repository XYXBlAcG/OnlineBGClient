import { isTauri } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
export interface ConfirmationRequest {
  message: string;
  label: string;
  resolve: (confirmed: boolean) => void;
}

class ConfirmationController {
  private current: ConfirmationRequest | null = null;
  private listeners = new Set<() => void>();
  snapshot = () => this.current;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  request(message: string, label: string): Promise<boolean> {
    if (isTauri())
      return confirm(message, {
        title: "OnlineBGClient",
        kind: "warning",
        okLabel: label,
        cancelLabel: "取消",
      });
    this.complete(false);
    return new Promise((resolve) => {
      this.current = { message, label, resolve };
      for (const listener of this.listeners) listener();
    });
  }
  complete(confirmed: boolean): void {
    const request = this.current;
    if (!request) return;
    this.current = null;
    request.resolve(confirmed);
    for (const listener of this.listeners) listener();
  }
}
export const confirmation = new ConfirmationController();
