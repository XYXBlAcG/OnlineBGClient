import { supportsAudioOutputSelection } from "livekit-client";
export const canSelectOutput = () =>
  typeof document !== "undefined" && supportsAudioOutputSelection();
export const outputChoice = (
  id: string,
  supported: boolean,
  current = "default",
): string | null =>
  supported && (id !== "default" || current !== "default") ? id : null;
