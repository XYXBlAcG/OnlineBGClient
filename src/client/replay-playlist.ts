import type { ReplayRecord } from "../domain/replay";
export function replayPlaylist(
  records: ReplayRecord[],
  selected: ReplayRecord,
): ReplayRecord[] {
  return records
    .filter((record) =>
      selected.config.kind === "expedition"
        ? record.config.kind === "expedition" &&
          (record.expeditionRunId && selected.expeditionRunId
            ? record.expeditionRunId === selected.expeditionRunId
            : record.seed === selected.seed)
        : record.room === selected.room,
    )
    .sort((a, b) => a.startedAt - b.startedAt);
}
export function adjacentReplay(
  records: ReplayRecord[],
  selected: ReplayRecord,
  direction: -1 | 1,
): ReplayRecord | undefined {
  const playlist = replayPlaylist(records, selected);
  const index = playlist.findIndex(
    (record) =>
      record.room === selected.room && record.startedAt === selected.startedAt,
  );
  return index < 0 ? undefined : playlist[index + direction];
}
