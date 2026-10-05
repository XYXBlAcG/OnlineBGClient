import type { Response, Snapshot } from "./protocol";
type Update = Extract<Response, { type: "snapshot" | "patch" }>;
export class SnapshotStream {
  private revision = 0;
  private encoded = new Map<keyof Snapshot, string>();
  next(snapshot: Snapshot, force = false): Update {
    const changes: Partial<Snapshot> = {};
    for (const key of Object.keys(snapshot) as (keyof Snapshot)[]) {
      const encoded = JSON.stringify(snapshot[key]);
      if (encoded !== this.encoded.get(key)) {
        Object.assign(changes, { [key]: snapshot[key] });
        this.encoded.set(key, encoded);
      }
    }
    const base = this.revision++;
    return !base || force
      ? { type: "snapshot", snapshot, revision: this.revision }
      : { type: "patch", base, revision: this.revision, changes };
  }
}
export class SnapshotReplica {
  private snapshot: Snapshot | null = null;
  private revision = 0;
  apply(update: Update): Snapshot | null {
    if (update.type === "snapshot") {
      this.snapshot = update.snapshot;
      this.revision = update.revision ?? 0;
    } else {
      if (
        !this.snapshot ||
        update.base !== this.revision ||
        update.revision !== update.base + 1
      )
        return null;
      this.snapshot = { ...this.snapshot, ...update.changes };
      this.revision = update.revision;
    }
    return this.snapshot;
  }
}
