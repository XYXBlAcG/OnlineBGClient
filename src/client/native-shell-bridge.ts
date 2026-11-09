export type NativeShellMessage = {
  type: "ready";
  kind: string;
  room: string;
};

interface NativeShellWebkit {
  messageHandlers?: {
    nativeShell?: {
      postMessage: (message: NativeShellMessage) => void;
    };
  };
}

export function postNativeShell(message: NativeShellMessage): void {
  const webkit = (window as unknown as { webkit?: NativeShellWebkit }).webkit;
  webkit?.messageHandlers?.nativeShell?.postMessage(message);
}
