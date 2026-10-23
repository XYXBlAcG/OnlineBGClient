import { useMemo } from "react";
import type { ReplayRecord } from "../../domain/replay";
import type { ChatMessage } from "../../domain/social";
import { loadPreferences } from "../preferences";
import { BannerLayer } from "./BannerLayer";
export function ReplayBanners({
  record,
  step,
}: {
  record: ReplayRecord;
  step: number;
}) {
  const messages = useMemo<ChatMessage[]>(
    () =>
      (record.social ?? [])
        .filter((event) => event.frame === step)
        .map((event, index) => ({
          id: `replay:${step}:${index}`,
          sequence: index + 1,
          sender: "replay",
          time: Date.now(),
          name: event.name,
          ...("banner" in event
            ? {
                text: event.banner.text,
                type: "banner" as const,
                banner: event.banner,
              }
            : event.message),
        })),
    [record, step],
  );
  return (
    <>
      <div className="replay-social-note" role="status">
        {messages
          .filter(
            (message) => message.type !== "banner" && message.type !== "clear",
          )
          .map((message) => (
            <span key={message.id}>
              {message.name} · {message.text}
            </span>
          ))}
      </div>
      <BannerLayer
        inline
        room={`${record.room}:${record.startedAt}:${step}`}
        messages={messages}
        preferences={loadPreferences()}
      />
    </>
  );
}
