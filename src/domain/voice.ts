import { voiceEffectSchema } from "./voice-effects";
import { z } from "zod";
export const voiceLimit = 8;
export const voicePreferencesSchema = z.object({
  effect: voiceEffectSchema.default(voiceEffectSchema.parse({})),
  input: z.string().default("default"),
  output: z.string().default("default"),
  volume: z.number().min(0).max(1).default(1),
  mode: z.enum(["open", "push"]).default("open"),
  duck: z.boolean().default(false),
});
export type VoicePreferences = z.infer<typeof voicePreferencesSchema>;
export const voiceOperationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("status") }),
  z.object({ type: z.literal("join") }),
  z.object({ type: z.literal("heartbeat") }),
  z.object({ type: z.literal("leave") }),
  z.object({
    type: z.literal("moderate"),
    target: z.string().min(1).max(100),
    operation: z.enum(["mute", "allow", "remove", "admit"]),
  }),
]);
export type VoiceOperation = z.infer<typeof voiceOperationSchema>;
export interface VoiceMember {
  id: string;
  name: string;
  muted: boolean;
  blocked: boolean;
  joined: boolean;
}
export interface VoiceStatus {
  configured: boolean;
  canManage: boolean;
  members: VoiceMember[];
}
export interface VoiceGrant {
  url: string;
  token: string;
  identity: string;
  status: VoiceStatus;
}
export interface VoiceRoom {
  endpoint: string;
  room: string;
  token: string;
}
export type VoicePhase =
  | "unavailable"
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";
export interface VoiceParticipant extends VoiceMember {
  speaking: boolean;
  level: number;
  volume: number;
}
export interface VoiceView {
  phase: VoicePhase;
  configured: boolean;
  canManage: boolean;
  identity: string;
  members: VoiceParticipant[];
  muted: boolean;
  deafened: boolean;
  hostMuted: boolean;
  playbackBlocked: boolean;
  error: string;
  devices: { id: string; name: string; kind: "audioinput" | "audiooutput" }[];
  outputSupported: boolean;
  testing: boolean;
  inputLevel: number;
  effect: z.infer<typeof voiceEffectSchema>;
}
export const initialVoice: VoiceView = {
  phase: "unavailable",
  configured: false,
  canManage: false,
  identity: "",
  members: [],
  muted: true,
  deafened: false,
  hostMuted: false,
  playbackBlocked: false,
  error: "",
  devices: [],
  outputSupported: false,
  testing: false,
  inputLevel: 0,
  effect: voiceEffectSchema.parse({}),
};
export const voiceIntentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("effect"), effect: voiceEffectSchema }),
  z.object({ type: z.literal("sync") }),
  z.object({ type: z.literal("settings") }),
  z.object({
    type: z.literal("test"),
    enabled: z.boolean(),
    loopback: z.boolean(),
  }),
  z.object({ type: z.literal("join") }),
  z.object({ type: z.literal("leave") }),
  z.object({ type: z.literal("mute") }),
  z.object({ type: z.literal("deafen") }),
  z.object({ type: z.literal("playback") }),
  z.object({ type: z.literal("devices") }),
  z.object({
    type: z.literal("volume"),
    target: z.string(),
    volume: z.number().min(0).max(1),
  }),
  z.object({
    type: z.literal("moderate"),
    target: z.string(),
    operation: z.enum(["mute", "allow", "remove", "admit"]),
  }),
  z.object({ type: z.literal("push"), pressed: z.boolean() }),
]);
export type VoiceIntent = z.infer<typeof voiceIntentSchema>;
