import { invoke } from "@tauri-apps/api/core";
import type { Preferences } from "./preferences";
export async function startHosting(
  network: Preferences["network"],
  lan = false,
) {
  const invitation = await invoke<string>("start_host", {
    lan,
    proxy: network.proxyFallback ? network.proxyUrl : null,
  });
  const endpoint = await invoke<string>("host_endpoint");
  return { invitation, endpoint };
}
