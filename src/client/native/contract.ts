import { z } from "zod";
import { actionSchema } from "../../domain/actions";
import { preferencesSchema, type Preferences } from "../preferences";
import { roomSetupSchema, type Snapshot } from "../../domain/protocol";
import type { ComputeDiagnostic } from "../../domain/compute-diagnostics";
import type { AppCommand } from "../commands";
export const auxiliaryViews = [
  "settings",
  "about",
  "records",
  "invite",
  "diagnostics",
  "actions",
  "exit",
  "roomsetup",
  "chat",
  "guide",
] as const;
export type AuxiliaryView = (typeof auxiliaryViews)[number];
export const auxiliaryView = new URLSearchParams(
  typeof location === "undefined" ? "" : location.search,
).get("aux") as AuxiliaryView | null;
export const auxiliaryIntentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chat-text"),
    view: z.literal("chat"),
    text: z.string().trim().min(1).max(500),
  }),
  z.object({
    type: z.literal("guide-step"),
    view: z.literal("guide"),
    index: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("guide-locate"),
    view: z.literal("guide"),
    index: z.number().int().min(0),
  }),
  z.object({ type: z.literal("close"), view: z.enum(auxiliaryViews) }),
  z.object({
    type: z.literal("error"),
    view: z.enum(auxiliaryViews),
    message: z.string(),
  }),
  z.object({
    type: z.literal("preferences"),
    view: z.literal("settings"),
    preferences: preferencesSchema,
  }),
  z.object({
    type: z.literal("binding"),
    view: z.literal("settings"),
    id: z.string(),
    binding: z.string(),
  }),
  z.object({
    type: z.literal("action"),
    view: z.literal("actions"),
    action: actionSchema,
  }),
  z.object({
    type: z.literal("setup"),
    view: z.literal("roomsetup"),
    setup: roomSetupSchema,
  }),
  z.object({ type: z.literal("retry"), view: z.literal("diagnostics") }),
  z.object({
    type: z.literal("exit"),
    view: z.literal("exit"),
    operation: z.enum(["hide", "quit"]),
  }),
]);
export type AuxiliaryIntent = z.infer<typeof auxiliaryIntentSchema>;
export type AuxiliaryPayload =
  | {
      view: "settings";
      preferences: Preferences;
      commands: Pick<AppCommand, "id" | "title" | "binding" | "scope">[];
      canConfigureAI: boolean;
      roomPerformance?: Snapshot["config"]["performance"];
    }
  | {
      view: "chat";
      snapshot: Snapshot;
      preferences: Preferences;
      endpoint?: string;
    }
  | { view: "guide"; snapshot: Snapshot; index: number }
  | { view: "about" }
  | { view: "records" }
  | { view: "invite"; url: string }
  | { view: "diagnostics"; diagnostic: ComputeDiagnostic; canRetry: boolean }
  | {
      view: "actions";
      snapshot: Snapshot;
      bindings: Record<string, string>;
      pending: boolean;
    }
  | { view: "roomsetup"; snapshot: Snapshot }
  | { view: "exit"; hosting: boolean };
export interface AuxiliaryFrame {
  revision: number;
  payload: AuxiliaryPayload;
}
