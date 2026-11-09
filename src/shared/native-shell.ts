export const nativeShellScreens = [
  "home",
  "lobby",
  "join",
  "settings",
  "table",
] as const;

export type NativeShellScreen = (typeof nativeShellScreens)[number];

export const nativeShellDevice = {
  portrait: { width: 402, height: 874 },
  landscape: { width: 874, height: 402 },
} as const;

export type NativeCardTone =
  "red" | "blue" | "green" | "yellow" | "wild" | "black";

export interface NativeHandCard {
  id: string;
  label: string;
  tone: NativeCardTone;
  suit?: string;
}

export const nativeUnoHand: readonly NativeHandCard[] = [
  { id: "uno-red-7", label: "7", tone: "red" },
  { id: "uno-blue-4", label: "4", tone: "blue" },
  { id: "uno-green-9", label: "9", tone: "green" },
  { id: "uno-yellow-skip", label: "⊘", tone: "yellow" },
  { id: "uno-red-reverse", label: "⇄", tone: "red" },
  { id: "uno-blue-1", label: "1", tone: "blue" },
  { id: "uno-wild", label: "W", tone: "wild" },
];

export const nativeDdzHand: readonly NativeHandCard[] = [
  { id: "ddz-spade-3", label: "3", tone: "black", suit: "♠" },
  { id: "ddz-spade-4", label: "4", tone: "black", suit: "♠" },
  { id: "ddz-spade-5", label: "5", tone: "black", suit: "♠" },
  { id: "ddz-spade-6", label: "6", tone: "black", suit: "♠" },
  { id: "ddz-spade-7", label: "7", tone: "black", suit: "♠" },
  { id: "ddz-spade-8", label: "8", tone: "black", suit: "♠" },
  { id: "ddz-spade-9", label: "9", tone: "black", suit: "♠" },
  { id: "ddz-spade-10", label: "10", tone: "black", suit: "♠" },
  { id: "ddz-spade-j", label: "J", tone: "black", suit: "♠" },
  { id: "ddz-spade-q", label: "Q", tone: "black", suit: "♠" },
  { id: "ddz-spade-k", label: "K", tone: "black", suit: "♠" },
  { id: "ddz-spade-a", label: "A", tone: "black", suit: "♠" },
  { id: "ddz-spade-2", label: "2", tone: "black", suit: "♠" },
  { id: "ddz-heart-3", label: "3", tone: "red", suit: "♥" },
  { id: "ddz-heart-4", label: "4", tone: "red", suit: "♥" },
  { id: "ddz-club-2", label: "2", tone: "black", suit: "♣" },
  { id: "ddz-joker", label: "JOKER", tone: "wild" },
];

export function toggleNativeCard(
  selected: readonly string[],
  id: string,
): string[] {
  return selected.includes(id)
    ? selected.filter((value) => value !== id)
    : [...selected, id];
}

export interface NativeShellPreviewOptions {
  screen: NativeShellScreen;
  theme: "light" | "dark";
  landscape: boolean;
  island: boolean;
  safeArea: boolean;
  motion: boolean;
  handGame: "uno" | "ddz";
}

export function nativeShellPreviewOptions(
  search: string,
): NativeShellPreviewOptions {
  const params = new URLSearchParams(search);
  const requested = params.get("screen");
  const screen = nativeShellScreens.includes(requested as NativeShellScreen)
    ? (requested as NativeShellScreen)
    : "home";
  return {
    screen,
    theme: params.get("theme") === "dark" ? "dark" : "light",
    landscape: params.get("orientation") === "landscape",
    island: params.get("island") !== "off",
    safeArea: params.get("safe") !== "off",
    motion: params.get("motion") !== "off",
    handGame: params.get("hand") === "ddz" ? "ddz" : "uno",
  };
}
