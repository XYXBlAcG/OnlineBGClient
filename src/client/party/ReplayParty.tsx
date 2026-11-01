import { useMemo } from "react";
import type { ReplayRecord } from "../../domain/replay";
import type { Snapshot } from "../../domain/protocol";
import { loadPreferences } from "../preferences";
import { PartyRuntime } from "./PartyRuntime";
export function ReplayParty({
  record,
  step,
  playing,
  speed,
  preview,
}: {
  record: ReplayRecord;
  step: number;
  playing: boolean;
  speed: number;
  preview: Snapshot;
}) {
  const preferences = useMemo(() => loadPreferences(), []);
  const snapshot = useMemo<Snapshot>(
    () => ({
      ...preview,
      serverTime: 0,
      seats: preview.seats.map((seat, i) => ({
        ...seat,
        id: record.memberIds?.[i] ?? seat.id,
      })),
      party: {
        ...preview.party,
        events: (record.party ?? []).map(({ frame, event }) => {
          const offset = frame * 1000 - (event.createdAt ?? event.time);
          return {
            ...event,
            time: event.time + offset,
            pauses: event.pauses?.map((p) => ({ ...p, at: p.at + offset })),
          };
        }),
      },
    }),
    [record, preview],
  );
  return (
    <PartyRuntime
      snapshot={snapshot}
      preferences={preferences}
      mobile={false}
      playback={{ time: step * 1000, playing, rate: speed }}
    />
  );
}
