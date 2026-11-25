import { listen } from "@tauri-apps/api/event";
import { sendAuxiliary } from "./windows";
import type { AiConfig } from "../ai-config";
import type { AiProviderSettings } from "../../domain/companion";

type Input =
  | { type: "ai-provider" | "ai-test"; config: AiConfig }
  | { type: "ai-clear"; provider: AiProviderSettings };
export async function requestAiWindow(input: Input): Promise<string> {
  const request = crypto.randomUUID();
  let finished = false;
  let dispose: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = new Promise<string>((resolve, reject) => {
      const timeout =
        input.type === "ai-clear"
          ? 10000
          : input.config.provider.timeoutMs + 8000;
      timer = setTimeout(() => reject(new Error("AI 操作超时")), timeout);
      void listen<{ request: string; ok: boolean; message: string }>(
        "ai-result",
        (event) => {
          if (event.payload.request !== request) return;
          if (event.payload.ok) resolve(event.payload.message);
          else reject(new Error(event.payload.message));
        },
      )
        .then((stop) => {
          if (finished) {
            stop();
            return;
          }
          dispose = stop;
          return sendAuxiliary({ view: "settings", request, ...input });
        })
        .catch(reject);
    });
    return await result;
  } finally {
    finished = true;
    if (timer) clearTimeout(timer);
    dispose?.();
  }
}
