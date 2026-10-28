export class RoomOperation {
  private current: { kind: "create" | "start"; room?: string } | null = null;
  private listeners = new Set<() => void>();
  snapshot = () => this.current;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  begin(kind: "create" | "start", room?: string): boolean {
    if (this.current) return false;
    this.current = { kind, room };
    this.listeners.forEach((listener) => listener());
    return true;
  }
  accept(response: {
    type: string;
    id?: string;
    snapshot?: { room: string; playing: boolean };
  }): void {
    if (!this.current) return;
    if (
      (response.type === "error" && !response.id) ||
      ["closed", "left"].includes(response.type) ||
      (response.type === "snapshot" &&
        response.snapshot &&
        (this.current.kind === "create" ||
          (response.snapshot.room === this.current.room &&
            response.snapshot.playing)))
    )
      this.cancel();
  }
  cancel(): void {
    if (!this.current) return;
    this.current = null;
    this.listeners.forEach((listener) => listener());
  }
}
