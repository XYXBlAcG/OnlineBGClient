import { invoke } from "@tauri-apps/api/core";
import { capabilities } from "../platform";
import type {
  VoiceGrant,
  VoiceOperation,
  VoiceRoom,
  VoiceStatus,
} from "../../domain/voice";

type VoiceFetch = typeof fetch;

export async function voiceHttpRequest(
  room: VoiceRoom,
  operation: VoiceOperation,
  fetchImpl: VoiceFetch = fetch,
): Promise<VoiceGrant | VoiceStatus> {
  const url = new URL("/voice", room.endpoint);
  url.searchParams.set("room", room.room);
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${room.token}`,
    },
    body: JSON.stringify(operation),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof value?.error === "string" ? value.error : "语音操作失败",
    );
  return value as VoiceGrant | VoiceStatus;
}

export function requestVoice(
  operation: VoiceOperation,
  room: VoiceRoom,
): Promise<VoiceGrant | VoiceStatus> {
  if (capabilities.runtime === "ios") return voiceHttpRequest(room, operation);
  return invoke<VoiceGrant | VoiceStatus>("voice_request", {
    ...room,
    operation,
  });
}
