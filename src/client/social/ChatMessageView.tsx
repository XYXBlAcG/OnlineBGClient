import type { ChatMessage } from "../../domain/social";
import type { MediaSession } from "./media";
import { ChatImage } from "./ChatImage";
import { ChatRoll } from "./ChatRoll";
import { Emoji } from "../Emoji";
export function ChatMessageView({
  message,
  ownId,
  session,
  serverTime,
}: {
  message: ChatMessage;
  ownId: string;
  session?: MediaSession;
  serverTime: number;
}) {
  if (message.type === "system")
    return (
      <div className="chat-message chat-system-message" data-content="system">
        <p>{message.text}</p>
      </div>
    );
  if (message.type === "achievement")
    return (
      <div
        className="chat-message chat-achievement"
        data-content="achievement"
        data-rarity={message.rarity}
        aria-label={message.text}
      >
        <span className="chat-achievement-symbol" aria-hidden="true">
          {message.symbol}
        </span>
        <span className="chat-achievement-copy">
          <small>{message.name} 达成成就</small>
          <strong>{message.title}</strong>
        </span>
      </div>
    );
  return (
    <div
      data-content={message.type}
      className={`chat-message ${message.sender === ownId ? "own-message" : ""}`}
    >
      <div className="chat-message-meta">
        <small>{message.name}</small>
        {message.time ? (
          <time
            dateTime={new Date(message.time).toISOString()}
            title={new Date(message.time).toLocaleString()}
          >
            {new Date(message.time).toLocaleTimeString([], {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </time>
        ) : (
          <small>历史消息</small>
        )}
      </div>
      {message.type === "roll" ? (
        <ChatRoll message={message} serverTime={serverTime} />
      ) : message.type === "image" && session ? (
        <ChatImage image={message.attachment} session={session} />
      ) : (
        <p data-copyable tabIndex={0}>
          {message.type === "banner" || message.type === "emote" ? "✦ " : ""}
          <Emoji text={message.text} />
        </p>
      )}
    </div>
  );
}
